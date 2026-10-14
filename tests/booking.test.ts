import { expect, test } from "bun:test";
import { AvailKitError, createClient } from "@availkit/client";
import { bookingFailure, makeAttempt, submitAttempt } from "../src/booking";
import { browserConfig } from "../src/config";

test("SDK retry uses identical request body and idempotency key after an ambiguous failure", async () => {
  const requests: { body: string; key: string | null }[] = [];
  const client = createClient({
    apiKey: "pk_test_fixture",
    baseUrl: "http://localhost:9000",
    fetch: async (_url, init) => {
      requests.push({
        body: String(init?.body),
        key: new Headers(init?.headers).get("Idempotency-Key"),
      });
      if (requests.length === 1)
        throw new TypeError("connection lost after commit");
      return Response.json(
        { id: "bkg_same", status: "pending" },
        { status: 201, headers: { "Idempotent-Replayed": "true" } },
      );
    },
  });
  const attempt = makeAttempt(
    "svc_1",
    "res_1",
    "2026-10-20T09:00:00Z",
    " Test User ",
    " test@example.invalid ",
  );
  await expect(submitAttempt(client, attempt)).rejects.toThrow();
  expect((await submitAttempt(client, attempt)).id).toBe("bkg_same");
  expect(requests[0]).toEqual(requests[1]);
  expect(attempt.body.status).toBe("pending");
  expect(attempt.body.metadata?.customer_email).toBe("test@example.invalid");
});

test("stale slots, request rejection and uncertain outcomes are distinct", () => {
  expect(
    bookingFailure(
      new AvailKitError("stale", { status: 409, code: "booking_conflict" }),
    ),
  ).toBe("stale");
  expect(bookingFailure(new AvailKitError("auth", { status: 401 }))).toBe(
    "rejected",
  );
  expect(bookingFailure(new AvailKitError("server", { status: 500 }))).toBe(
    "uncertain",
  );
  expect(bookingFailure(new TypeError("network"))).toBe("uncertain");
});

test("browser configuration excludes secret keys, live keys and non-TLS remote origins", () => {
  for (const key of ["sk_test_secret", "pk_live_example", ""])
    expect(() => browserConfig("https://api.availkit.com", key)).toThrow();
  expect(() =>
    browserConfig("http://remote.example", "pk_test_fixture"),
  ).toThrow();
  expect(() =>
    browserConfig("https://user:pass@api.availkit.com", "pk_test_fixture"),
  ).toThrow();
  expect(browserConfig("http://127.0.0.1:9000", "pk_test_fixture").apiKey).toBe(
    "pk_test_fixture",
  );
});
