import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "@availkit/client";

export interface EventSummary {
  id: string;
  type: string;
  createdAt: string;
  receivedAt: string;
  bookingId: string | null;
}
export interface ReceiverOptions {
  secret: string;
  maxEvents?: number;
  maxSeen?: number;
  dedupMs?: number;
  now?: () => number;
}
const MAX_BODY = 64 * 1024;
const TYPES = new Set([
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "booking.completed",
  "booking.no_show",
  "booking.hold_expired",
  "booking.payment_updated",
  "webhook.test",
]);

export function verifySignature(
  body: Uint8Array,
  header: string | null,
  secret: string,
) {
  if (!header || !/^sha256=[a-f0-9]{64}$/.test(header)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(header.slice(7), "hex"));
}

function isEnvelope(value: unknown): value is WebhookEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string" &&
    event.id.length > 0 &&
    event.id.length <= 200 &&
    typeof event.type === "string" &&
    TYPES.has(event.type) &&
    typeof event.created_at === "string" &&
    event.created_at.length <= 40 &&
    Number.isFinite(Date.parse(event.created_at)) &&
    Boolean(event.data) &&
    typeof event.data === "object" &&
    !Array.isArray(event.data)
  );
}

async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      if (size > MAX_BODY) {
        await reader.cancel();
        return null;
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

export function createReceiver(options: ReceiverOptions) {
  if (!options.secret || options.secret.startsWith("REPLACE"))
    throw new Error(
      "Set a real webhook signing secret in the receiver environment.",
    );
  const maxEvents = options.maxEvents ?? 100;
  const maxSeen = options.maxSeen ?? 1000;
  const dedupMs = options.dedupMs ?? 86400000;
  if (
    ![maxEvents, maxSeen, dedupMs].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  )
    throw new Error("Receiver limits must be positive integers.");
  const now = options.now ?? Date.now;
  const events: EventSummary[] = [];
  const seen = new Map<string, number>();
  let duplicates = 0;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  };
  const response = (
    body: BodyInit | null,
    status: number,
    contentType = "text/plain; charset=utf-8",
  ) =>
    new Response(body, {
      status,
      headers: { ...headers, "Content-Type": contentType },
    });
  const snapshot = () => ({
    events: [...events].reverse(),
    duplicates,
    retainedEventLimit: maxEvents,
    dedupLimit: maxSeen,
    dedupWindowHours: dedupMs / 3600000,
  });

  async function fetch(request: Request) {
    const url = new URL(request.url);
    // Loopback binding protects remote access; host/origin checks also prevent
    // a remote page using DNS rebinding to read this local diagnostic view.
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
      return response("Loopback host required", 403);
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin)
      return response("Same-origin requests only", 403);
    if (url.pathname === "/health" && request.method === "GET")
      return response("ready", 200);
    if (url.pathname === "/events.json" && request.method === "GET")
      return response(JSON.stringify(snapshot()), 200, "application/json");
    if (url.pathname === "/events" && request.method === "GET")
      return response(eventPage(snapshot()), 200, "text/html; charset=utf-8");
    if (url.pathname !== "/webhooks/availkit")
      return response("Not found", 404);
    if (request.method !== "POST") return response("Method not allowed", 405);
    const declared = request.headers.get("Content-Length");
    if (declared && Number(declared) > MAX_BODY)
      return response("Payload too large", 413);
    const body = await boundedBody(request);
    if (!body) return response("Payload too large", 413);
    if (
      !verifySignature(
        body,
        request.headers.get("AvailKit-Signature"),
        options.secret,
      )
    )
      return response("Invalid signature", 401);
    let event: unknown;
    try {
      event = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(body),
      );
    } catch {
      return response("Invalid JSON", 400);
    }
    if (!isEnvelope(event)) return response("Invalid event envelope", 400);
    const received = now();
    for (const [id, at] of seen) {
      if (received - at >= dedupMs) seen.delete(id);
    }
    if (seen.has(event.id)) {
      duplicates++;
      return response(null, 204);
    }
    if (seen.size >= maxSeen) seen.delete(seen.keys().next().value!);
    seen.set(event.id, received);
    events.push({
      id: event.id,
      type: event.type,
      createdAt: event.created_at,
      receivedAt: new Date(received).toISOString(),
      bookingId:
        event.type.startsWith("booking.") &&
        typeof event.data.id === "string" &&
        event.data.id.length <= 200
          ? event.data.id
          : null,
    });
    if (events.length > maxEvents) events.shift();
    return response(null, 204);
  }
  return { fetch, snapshot };
}

function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function eventPage(
  snapshot: ReturnType<ReturnType<typeof createReceiver>["snapshot"]>,
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Studio · Local webhook events</title><style>body{font:16px/1.6 system-ui;color:#25352e;background:#f5f2e9;margin:32px auto;padding:0 24px;max-width:1000px}h1{font-size:28px}a{color:#355d46;text-underline-offset:4px}a:focus-visible{outline:3px solid #915524;outline-offset:4px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;text-align:left}td,th{padding:12px;border-bottom:1px solid #b7c0b5;overflow-wrap:anywhere}code{font-size:13px}caption{text-align:left;margin:24px 0 8px}</style></head><body><h1>Local webhook events</h1><p>Read-only diagnostics. The newest ${snapshot.retainedEventLimit} verified events are retained in memory. Restarting clears this view. Customer payloads are omitted.</p><p>${snapshot.duplicates} duplicate deliveries acknowledged. Deduplication remembers up to ${snapshot.dedupLimit} IDs for ${snapshot.dedupWindowHours} hours; evicted IDs can appear again.</p><p><a href="/events">Refresh events</a> · <a href="/events.json">View JSON</a></p>${snapshot.events.length ? `<div class="scroll"><table><caption>Latest verified deliveries</caption><thead><tr><th scope="col">Event</th><th scope="col">Booking</th><th scope="col">Received (UTC)</th></tr></thead><tbody>${snapshot.events.map((event) => `<tr><td>${escape(event.type)}<br><code>${escape(event.id)}</code></td><td><code>${escape(event.bookingId ?? "—")}</code></td><td>${escape(event.receivedAt)}</td></tr>`).join("")}</tbody></table></div>` : "<p>No verified events received yet. Send a webhook test from the CLI.</p>"}</body></html>`;
}
