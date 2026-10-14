import { createClient, AvailKitError } from "@availkit/client";
import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createReceiver } from "../server/receiver";
import { makeAttempt, submitAttempt } from "../src/booking";
import { publicCatalog } from "./configure-catalog";

// Operator-run test-workspace acceptance. No server source or provisioning
// interfaces are imported. Authentication is done first with the public CLI.
if (process.env.STUDIO_ACCEPTANCE !== "fresh-test-workspace")
  throw new Error(
    "This imports catalog data, makes test bookings and rotates test keys. Set STUDIO_ACCEPTANCE=fresh-test-workspace only for a disposable selected test workspace.",
  );
const baseUrl = process.env.AVAILKIT_BASE_URL ?? "https://api.availkit.com";
const origin = new URL(baseUrl);
if (!["localhost", "127.0.0.1"].includes(origin.hostname))
  throw new Error(
    "Automated acceptance requires an isolated loopback API; no hosted environment is targeted.",
  );
const results: { check: string; result: unknown }[] = [];
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function pass(check: string, result: unknown = true) {
  results.push({ check, result });
  console.log(`PASS ${check}`);
}
async function cli(args: string[]) {
  const child = Bun.spawn(["bunx", "--no-install", "availkit", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code)
    throw new Error(
      `CLI ${args.slice(0, 2).join(" ")} failed (${code}); inspect private operator logs.`,
    );
  return out.trim() ? JSON.parse(out) : null;
}
async function rejected(
  operation: () => Promise<unknown>,
  status: number,
  code?: string,
) {
  try {
    await operation();
    throw new Error(`Expected rejection ${status}`);
  } catch (error) {
    assert(
      error instanceof AvailKitError &&
        error.status === status &&
        (!code || error.code === code),
      "Unexpected SDK error",
    );
  }
}
async function waitFor(predicate: () => Promise<boolean>) {
  const deadline = Date.now() + 15000;
  do {
    if (await predicate()) return;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Local acceptance deadline exceeded");
}
let receiver: ReturnType<typeof createReceiver> | undefined;
const listener = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  maxRequestBodySize: 65536,
  fetch: (request) =>
    receiver ? receiver.fetch(request) : new Response(null, { status: 503 }),
});
let webhookId = "";
let vite: ReturnType<typeof Bun.spawn> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const selected = await cli(["auth", "status"]);
  assert(
    selected.environment === "test",
    "Select the test environment before acceptance",
  );
  const before = await cli(["api", "GET", "/locations"]);
  const dry = await cli(["catalog", "import", "catalog.json", "--dry-run"]);
  const repeated = await cli([
    "catalog",
    "import",
    "catalog.json",
    "--dry-run",
  ]);
  assert(JSON.stringify(dry) === JSON.stringify(repeated), "Dry runs differ");
  assert(
    JSON.stringify(before) ===
      JSON.stringify(await cli(["api", "GET", "/locations"])),
    "Dry run mutated catalog",
  );
  assert(
    dry.counts.locations === 1 &&
      dry.counts.resources === 2 &&
      dry.counts.services === 2,
    "Wrong catalog shape",
  );
  pass("deterministic non-mutating catalog dry run", dry.counts);
  const imported = await cli(["catalog", "import", "catalog.json"]);
  pass("catalog import", Object.keys(imported.references).sort());
  const keys = await cli(["keys", "show"]);
  assert(
    keys.publishableKey.startsWith("pk_test_") &&
      keys.secretKey.startsWith("sk_test_"),
    "Expected test credentials",
  );
  const client = createClient({ apiKey: keys.publishableKey, baseUrl });
  const refs = imported.references;
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await rejected(() => client.listServices(), 403);
  await Bun.write(
    "public/studio.json",
    JSON.stringify(publicCatalog(refs), null, 2) + "\n",
  );
  pass(
    "CLI import references generate public catalog; publishable management rejected",
  );
  const availability = await client.getAvailability({
    service_id: refs.consultation,
    resource_id: refs.alex,
    date,
  });
  assert(
    availability.status === 200 && availability.data.slots.length > 0,
    "No future availability",
  );
  const slot = availability.data.slots[0]!;
  pass("staff-specific future UTC availability", {
    date,
    count: availability.data.slots.length,
  });
  const webhook = await cli([
    "api",
    "POST",
    "/webhooks",
    "--data",
    JSON.stringify({
      url: `http://127.0.0.1:${listener.port}/webhooks/availkit`,
      events: ["booking.created", "booking.confirmed", "booking.cancelled"],
    }),
  ]);
  webhookId = webhook.id;
  receiver = createReceiver({ secret: webhook.secret });
  const attempt = makeAttempt(
    refs.consultation,
    refs.alex,
    slot.starts_at,
    "Acceptance Visitor",
    "acceptance@example.invalid",
  );
  const booking = await submitAttempt(client, attempt);
  assert(booking.status === "pending", "Booking must begin pending");
  pass("sample booking helper submits pending contact metadata");
  const replay = await client.createBooking(attempt.body, {
    headers: { "Idempotency-Key": attempt.key },
  });
  assert(
    replay.status === 201 &&
      replay.data.id === booking.id &&
      replay.headers.get("Idempotent-Replayed") === "true",
    "Retry did not replay",
  );
  pass("identical retry replays original booking");
  await rejected(
    () =>
      client.createBooking(
        { ...attempt.body, notes: "changed" },
        { headers: { "Idempotency-Key": attempt.key } },
      ),
    409,
    "idempotency_conflict",
  );
  pass("changed idempotency payload rejected");
  await rejected(
    () => submitAttempt(client, { ...attempt, key: crypto.randomUUID() }),
    409,
    "booking_conflict",
  );
  const refreshed = await client.getAvailability({
    service_id: refs.consultation,
    resource_id: refs.alex,
    date,
  });
  assert(
    refreshed.status === 200 &&
      !refreshed.data.slots.some((item) => item.starts_at === slot.starts_at),
    "Taken slot survived refresh",
  );
  pass("stale slot rejected and absent after refresh");
  await rejected(() => client.listBookings(), 403);
  pass("publishable management authority rejected");
  await cli(["booking", "confirm", booking.id]);
  await cli(["booking", "cancel", booking.id]);
  pass("CLI confirmation and cancellation");
  await waitFor(async () => receiver!.snapshot().events.length >= 3);
  const deliveries = await cli([
    "webhook",
    "inspect",
    webhookId,
    "--limit",
    "20",
  ]);
  assert(
    deliveries.deliveries.data.length >= 3 &&
      deliveries.deliveries.data.every(
        (item: { statusCode: number }) => item.statusCode === 204,
      ),
    "Durable inspection missing successful deliveries",
  );
  pass("real worker signatures and CLI durable inspection", {
    events: receiver.snapshot().events.map((item) => item.type),
    status: 204,
  });
  const body = JSON.stringify({
    id: "evt_duplicate_probe",
    type: "webhook.test",
    created_at: new Date().toISOString(),
    data: { customer_email: "must-not-be-retained@example.invalid" },
  });
  const signature = `sha256=${createHmac("sha256", webhook.secret).update(body).digest("hex")}`;
  const endpoint = `http://127.0.0.1:${listener.port}/webhooks/availkit`;
  assert(
    (
      await fetch(endpoint, {
        method: "POST",
        body,
        headers: { "AvailKit-Signature": "sha256=" + "0".repeat(64) },
      })
    ).status === 401,
    "Invalid signature accepted",
  );
  for (let i = 0; i < 2; i++)
    assert(
      (
        await fetch(endpoint, {
          method: "POST",
          body,
          headers: { "AvailKit-Signature": signature },
        })
      ).status === 204,
      "Signed probe failed",
    );
  assert(
    receiver.snapshot().duplicates === 1,
    "Duplicate was not acknowledged",
  );
  assert(
    !JSON.stringify(receiver.snapshot()).includes("must-not-be-retained"),
    "Customer data retained",
  );
  pass(
    "HTTP signature rejection, duplicate acknowledgement and redacted local view",
  );
  const rotated = await cli([
    "keys",
    "rotate",
    "--type",
    "publishable",
    "--environment",
    "test",
  ]);
  await rejected(
    () => client.getAvailability({ service_id: refs.consultation, date }),
    401,
  );
  const newClient = createClient({ apiKey: rotated.key, baseUrl });
  const newAvailability = await newClient.getAvailability({
    service_id: refs.consultation,
    resource_id: refs.sam,
    date,
  });
  assert(
    newAvailability.status === 200,
    "Replacement publishable key rejected",
  );
  pass("publishable test rotation rejects old key and accepts replacement");
  const oldAdmin = createClient({ apiKey: keys.secretKey, baseUrl });
  await cli(["keys", "rotate", "--type", "secret", "--environment", "test"]);
  await rejected(() => oldAdmin.getWorkspace(), 401);
  await cli(["api", "GET", "/workspace"]);
  pass("secret test rotation rejects old key; CLI fetches replacement");
  if (process.env.STUDIO_BROWSER_ACCEPTANCE === "1") {
    const probe = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => new Response(null),
    });
    const port = probe.port!;
    await probe.stop(true);
    vite = Bun.spawn(
      ["bun", "run", "dev", "--port", String(port), "--strictPort"],
      {
        env: {
          ...process.env,
          VITE_AVAILKIT_BASE_URL: baseUrl,
          VITE_AVAILKIT_PUBLISHABLE_KEY: rotated.key,
        },
        stdout: "ignore",
        stderr: "ignore",
      },
    );
    await waitFor(async () =>
      fetch(`http://127.0.0.1:${port}`)
        .then((response) => response.ok)
        .catch(() => false),
    );
    browser = await chromium.launch({
      channel: "chromium",
      args: ["--disable-gpu", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    const authorities: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith(baseUrl))
        authorities.push(request.headers().authorization ?? "");
    });
    await page.goto(`http://127.0.0.1:${port}`);
    await page.getByLabel("Consultation", { exact: false }).check();
    await page.getByLabel("Staff", { exact: true }).selectOption(refs.sam);
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.locator("input[name=slot]").first().check();
    await page.getByLabel("Name", { exact: true }).fill("Browser Visitor");
    await page
      .getByLabel("Email", { exact: true })
      .fill("browser@example.invalid");
    await page
      .getByRole("button", { name: "Request appointment", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Your request is received." })
      .waitFor();
    const browserBookingId = await page.locator(".reference").innerText();
    assert(
      authorities.length > 0 &&
        authorities.every((value) => value === `Bearer ${rotated.key}`),
      "Browser received non-publishable authority",
    );
    const inspected = await cli(["booking", "get", browserBookingId]);
    assert(
      inspected.status === "pending" &&
        inspected.metadata.customer_email === "browser@example.invalid",
      "Browser booking did not reach API",
    );
    await cli(["booking", "cancel", browserBookingId]);
    pass("real React/browser journey reaches API with publishable key only");
  }
} finally {
  await browser?.close();
  if (vite && vite.exitCode === null) {
    vite.kill("SIGTERM");
    await vite.exited;
  }
  if (webhookId)
    await cli(["api", "DELETE", `/webhooks/${webhookId}`]).catch(() => {});
  await listener.stop(true);
  await mkdir("operator-output", { recursive: true });
  await Bun.write(
    "operator-output/acceptance.json",
    JSON.stringify(results, null, 2) + "\n",
  );
}
