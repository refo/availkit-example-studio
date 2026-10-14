import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { createReceiver } from "../server/receiver";

const secret = "isolated-test-signing-secret";
const event = (id = "evt_1") => ({
  id,
  type: "booking.created",
  created_at: "2026-10-14T09:00:00Z",
  data: {
    id: "bkg_1",
    metadata: { customer_email: "private@example.invalid" },
  },
});
function signed(body: string, key = secret) {
  return new Request("http://127.0.0.1:3210/webhooks/availkit", {
    method: "POST",
    body,
    headers: {
      "AvailKit-Signature": `sha256=${createHmac("sha256", key).update(body).digest("hex")}`,
    },
  });
}

describe("raw-body webhook boundary", () => {
  test("valid delivery records only a redacted summary; duplicate is acknowledged once", async () => {
    const receiver = createReceiver({ secret });
    const body = JSON.stringify(event());
    expect((await receiver.fetch(signed(body))).status).toBe(204);
    expect((await receiver.fetch(signed(body))).status).toBe(204);
    expect(receiver.snapshot().events).toHaveLength(1);
    expect(receiver.snapshot().duplicates).toBe(1);
    expect(JSON.stringify(receiver.snapshot())).not.toContain(
      "private@example.invalid",
    );
  });
  test("missing, malformed, wrong and changed-body signatures never enter the log", async () => {
    const receiver = createReceiver({ secret });
    const body = JSON.stringify(event());
    for (const header of [null, "sha256=x", "sha256=" + "0".repeat(64)]) {
      const request = new Request("http://localhost:3210/webhooks/availkit", {
        method: "POST",
        body,
        headers: header ? { "AvailKit-Signature": header } : {},
      });
      expect((await receiver.fetch(request)).status).toBe(401);
    }
    expect((await receiver.fetch(signed(body, "old-secret"))).status).toBe(401);
    const changed = signed(body);
    const changedBody = new Request(changed.url, {
      method: "POST",
      headers: changed.headers,
      body: body + " ",
    });
    expect((await receiver.fetch(changedBody)).status).toBe(401);
    expect(receiver.snapshot().events).toHaveLength(0);
  });
  test("invalid signed JSON or envelope fails after verification", async () => {
    const receiver = createReceiver({ secret });
    for (const body of [
      "{",
      "{}",
      JSON.stringify({ ...event(), type: "unknown" }),
    ])
      expect((await receiver.fetch(signed(body))).status).toBe(400);
  });
  test("body, retention and duplicate windows are bounded independently", async () => {
    let clock = 0;
    const receiver = createReceiver({
      secret,
      maxEvents: 2,
      maxSeen: 3,
      dedupMs: 100,
      now: () => clock,
    });
    expect((await receiver.fetch(signed("x".repeat(65537)))).status).toBe(413);
    for (const id of ["a", "b", "c", "d"])
      await receiver.fetch(signed(JSON.stringify(event(id))));
    expect(receiver.snapshot().events.map((row) => row.id)).toEqual(["d", "c"]);
    await receiver.fetch(signed(JSON.stringify(event("b"))));
    expect(receiver.snapshot().duplicates).toBe(1);
    clock = 100;
    await receiver.fetch(signed(JSON.stringify(event("b"))));
    expect(receiver.snapshot().events[0]?.id).toBe("b");
  });
  test("event view escapes identifiers and refuses remote origins, hosts and mutations", async () => {
    const receiver = createReceiver({ secret });
    await receiver.fetch(
      signed(JSON.stringify(event("<script>alert(1)</script>"))),
    );
    const view = await receiver.fetch(
      new Request("http://localhost:3210/events"),
    );
    expect(view.headers.get("Cache-Control")).toBe("no-store");
    expect(await view.text()).toContain("&lt;script&gt;");
    expect(
      (await receiver.fetch(new Request("http://remote.example/events")))
        .status,
    ).toBe(403);
    expect(
      (
        await receiver.fetch(
          new Request("http://localhost/events.json", {
            headers: { Origin: "https://remote.example" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await receiver.fetch(
          new Request("http://localhost/events", { method: "POST" }),
        )
      ).status,
    ).toBe(404);
  });
});
