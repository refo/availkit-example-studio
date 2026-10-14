# AvailKit Appointment Studio

A small React booking UI and Bun webhook receiver using the published `@availkit/client` SDK and `availkit` CLI. One UTC location, two services, two staff. This is a test-workspace example, with synthetic contact details and no payment collection.

The repository was built privately and approved for public release after sample acceptance and passing CI. There is no hosted demo.

## Prerequisites

- Bun 1.3.14; Node 22.14+ for Vite/Playwright.
- An AvailKit Organization and a fresh **test Workspace**, created or selected in the control plane. You need an operator role that can import catalogs and manage keys/webhooks.
- A published API origin and its matching control-plane origin, or isolated loopback development servers.

```sh
bun install --frozen-lockfile
cp .env.example .env
cp .env.receiver.example .env.receiver
bunx availkit --version
npx availkit@0.1.1 --version
```

SDK and CLI are pinned to 0.1.1 and resolved from the public registry. No platform checkout is needed to build or run this application.

## Select the test workspace and import the catalog

Use the CLI's browser-approved device login. The login URLs must match your chosen infrastructure:

```sh
export AVAILKIT_CONTROL_URL=https://app.availkit.com
export AVAILKIT_BASE_URL=https://api.availkit.com
bunx availkit auth login --url "$AVAILKIT_CONTROL_URL" --booking-url "$AVAILKIT_BASE_URL"
bunx availkit org list
bunx availkit org use YOUR_ORG_SLUG
bunx availkit workspace list
bunx availkit workspace use YOUR_WORKSPACE_SLUG --environment test
bunx availkit auth status
bunx availkit catalog import catalog.json --dry-run
npx availkit@0.1.1 catalog import catalog.json --dry-run
mkdir -p operator-output
bunx availkit catalog import catalog.json > operator-output/catalog-import.json
bun scripts/configure-catalog.ts operator-output/catalog-import.json
```

The checked manifest has symbolic references `studio`, `alex`, `sam`, `consultation`, and `follow-up`; it has no server-generated IDs or calendar dates. Both staff work daily 09:00–17:00 UTC. Consultation is 60 minutes/$75; Follow-up is 30 minutes/$40.

Dry-run validates and prints the plan without mutation. **Import creates catalog records; it is not an upsert.** Use a fresh Workspace and import once. Retain its reference output privately so you can regenerate `public/studio.json`. The generator copies only public identifiers and the checked manifest's display fields. It never copies keys or customer data. Catalog management endpoints require a secret key, so the browser does not list services/resources through the API.

## Run the customer UI

Run `bunx availkit keys show` in a private terminal. Copy only `publishableKey` (`pk_test_…`) into `.env` as `VITE_AVAILKIT_PUBLISHABLE_KEY`. Set `VITE_AVAILKIT_BASE_URL` to the booking API origin. Never put the returned secret key, CLI session token or webhook signing secret in a `VITE_` variable.

```sh
bun run dev
```

Open the loopback URL Vite prints. Choose service → staff → future date → available time → test name/email → request appointment. All displayed times are UTC. The receipt is **pending**; this example does not send a confirmation email. Name/email are stored as booking metadata (`customer_name`, `customer_email`). Creating a Customer record requires operator authority and is outside the browser flow.

The browser imports `createClient` from `@availkit/client` for availability and booking. A slot conflict clears the selected time, refreshes availability, and keeps contact details. A network failure/timeout or server error preserves an immutable request body and idempotency key; changes are locked until the same request succeeds or is definitively rejected. The retry key appears for operator diagnosis. Keep the tab open: this state is memory-only. After closing/reloading a tab during an uncertain result, have the operator inspect bookings before trying a new request.

## Receive signed webhooks

The receiver binds **127.0.0.1 only** and does not handle booking API credentials. Register its `/webhooks/availkit` URL through the CLI:

```sh
bunx availkit api POST /webhooks --data '{"url":"http://127.0.0.1:3210/webhooks/availkit","events":["booking.created","booking.confirmed","booking.cancelled"]}'
```

This loopback URL is for an isolated development API/worker on the same machine. A hosted API cannot reach your machine's loopback. For remote development, use an authenticated HTTPS tunnel exposing **only** `/webhooks/availkit`, forwarding to loopback with its forwarded Host rewritten to `127.0.0.1:3210`; do not expose `/events` or `/events.json`. Public deployment of this sample is a separate decision.

The response contains a display-once signing `secret`. Put that value only in `.env.receiver` as `AVAILKIT_WEBHOOK_SECRET`. Retain the webhook ID privately, then start:

```sh
bun run receiver
bunx availkit webhook test YOUR_WEBHOOK_ID
```

Open `http://127.0.0.1:3210/events` and refresh to see verified events. Verification uses raw bytes and constant-time HMAC-SHA256 comparison with `AvailKit-Signature: sha256=<hex>`. Missing, malformed, changed-body and invalid signatures return 401 before parsing/logging. Invalid signed envelopes return 400; bodies over 64 KiB return 413. Successful and duplicate deliveries return 204.

The view is read-only, same-origin, no-store, and rejects remote hostnames/origins. It retains at most 100 summaries, newest first, with no customer payload. Deduplication retains at most 1,000 event IDs for 24 hours. Eviction or restart can admit an old ID again; this receiver performs no business side effects. It is not durable delivery evidence. Stop with Ctrl-C; all local events are discarded.

## Operator booking and delivery operations

Keep the selected CLI Workspace in `test`. These operations use operator authority without exposing a secret key to the browser:

```sh
bunx availkit booking get YOUR_BOOKING_ID
bunx availkit booking confirm YOUR_BOOKING_ID
bunx availkit booking cancel YOUR_BOOKING_ID
bunx availkit booking list --service YOUR_SERVICE_ID --from YOUR_UTC_START --to YOUR_UTC_END --json
bunx availkit webhook inspect YOUR_WEBHOOK_ID --limit 20
```

`webhook inspect` is the durable source of delivery status, attempt count and retry timing. A transient receiver failure can be retried by the platform; this app never triggers secret-key transitions or retries from a dashboard. For an ambiguous browser result, inspect the service/staff/time and contact metadata, then resolve the original booking before allowing a new request.

## Test/live separation and key rotation

This sample accepts `pk_test_` only, and creates pending test bookings. Catalog IDs and webhook registration must belong to the selected test Workspace. Never switch this example to a live key or share production keys, real contacts or CLI config in source control. A publishable key is public, but is scoped to its Workspace/environment.

`keys rotate` replaces and revokes the selected retained key immediately; coordinate this with any other applications using the Workspace. In a private terminal, save the old publishable test key for the rejection check, then run:

```sh
bunx availkit keys rotate --type publishable --environment test
```

Copy the returned replacement `key` into `.env`, restart Vite (or rebuild), and verify availability with the replacement. Check the revoked key via the published SDK without printing it:

```sh
AVAILKIT_REVOKED_KEY="$OLD_TEST_PUBLISHABLE_KEY" \
AVAILKIT_BASE_URL="$AVAILKIT_BASE_URL" \
AVAILKIT_SERVICE_ID=YOUR_SERVICE_ID \
AVAILKIT_TEST_DATE=YOUR_FUTURE_UTC_DATE \
bun scripts/verify-revoked-key.ts
```

Expect 401 for the old key. For a secret test key, run `bunx availkit keys rotate --type secret --environment test`; future CLI requests retrieve the replacement from the control plane. Update any separate trusted operator integrations and verify the old secret key is rejected. The receiver uses a separate webhook signing secret: API key rotation does not rotate that secret. To replace it, register a replacement webhook endpoint through the CLI, switch the receiver's secret, verify a signed test, and delete the old endpoint with `availkit api DELETE /webhooks/OLD_ID`. Coordinate this cutover; this sample accepts one signing secret at a time.

## Checks and acceptance

```sh
bunx playwright install --with-deps chromium
bun run check
bun audit
```

Unit tests cover raw signatures, payload/retention bounds, deduplication, local-view protections and SDK retry identity. Browser tests at desktop/mobile widths use explicit synthetic HTTP fixtures for success, stale-slot recovery, lost-response retry, empty availability and revoked keys; they are not evidence of a real API run.

`scripts/acceptance.ts` also exercises a **fresh selected test Workspace against isolated loopback infrastructure** using installed CLI/SDK packages. It imports the catalog, creates/cancels test bookings, verifies actual worker delivery/CLI inspection, rotates both test keys and checks revoked-key rejection. After public CLI login and selection:

```sh
STUDIO_ACCEPTANCE=fresh-test-workspace \
STUDIO_BROWSER_ACCEPTANCE=1 \
AVAILKIT_BASE_URL=http://127.0.0.1:YOUR_BOOKING_API_PORT \
bun scripts/acceptance.ts
```

The script leaves imported test catalog records and rotated keys, cancels its test bookings, removes its webhook endpoint, stops its own listeners/browser/dev server, and writes a redacted report under ignored `operator-output/`. Isolated platform lifecycle setup is supplied by the operator and is not part of this repository. The sample has no application database, admin dashboard, private platform imports, hidden provisioning calls or internal production acceptance procedure.

## Maintenance

Keep exact dependency versions and the Bun lockfile together. Run `bun run check` and `bun audit` after updates. Re-run real isolated acceptance when SDK/CLI versions, booking behavior or webhook verification change. Review `docs/ACCEPTANCE.md` before publication. This independent repository does not publish an npm package (`private: true`).
