# Sample acceptance — 2026-10-14

**Pass: the independent test-workspace sample journey.** The repository remains private for owner review and publication approval.

| Validation | Result |
| --- | --- |
| Published interfaces | Registry-installed `@availkit/client`, `availkit`, and its pinned `@availkit/cli` dependency: 0.1.1. No workspace, file or link dependencies. |
| Local checks | Strict TypeScript, production Vite build, eight Bun tests (38 assertions), eight Chromium tests across 1440px desktop/390px mobile: pass. |
| Dependency audit | `bun audit`: no vulnerabilities reported. Vite 7.3.7 replaces the vulnerable initial dependency. |
| Manifest | One UTC Location, two staff Resources with two recurring schedules, two Services. Repeated dry runs match and do not change the server catalog. Import returns all five symbolic references. |
| Catalog authority | Publishable management reads return 403. CLI import references generate the local public display catalog; the React app makes only availability and booking API requests. |
| Availability | Future 2026-10-16, UTC, selected staff: eight slots. Dates are derived at run time for reproduction. |
| Booking | The sample helper submits a pending booking with synthetic name/email metadata. An identical retry returns the original ID and `Idempotent-Replayed: true`; changed body with the same key returns `idempotency_conflict`/409. |
| Stale slot | A competing request receives `booking_conflict`/409; staff-specific refreshed availability omits the occupied slot. Browser fixture checks verify contact details remain and selection clears. |
| Uncertain retry | Browser fixture drops a response; fields lock and a retry sends exactly the same body/key. This fixture tests UI behavior; real API replay is verified separately. |
| Operator boundary | Publishable booking management is forbidden. Installed CLI confirms/cancels bookings and inspects durable webhook deliveries. |
| Webhooks | A real isolated worker delivers created/confirmed/cancelled events to the sample receiver. All three verify raw-body HMAC and return 204; CLI inspection records successful delivery. |
| Receiver protection | HTTP invalid-signature probe returns 401; identical signed event delivered twice produces one summary and one duplicate acknowledgement. Unit tests also cover malformed signatures/JSON, 64KiB body limit, independent retention/deduplication bounds, XSS escaping, and local origin/host/read-only protections. |
| Rotation | CLI rotates publishable and secret test keys. Both old keys receive 401; replacement publishable availability and CLI management succeed. |
| Real browser journey | Chromium runs the React application against the real isolated API: service/staff/date/slot/name/email creates a pending booking with correct metadata. All observed browser API authorization headers carry only the replacement publishable test key. Operator cancels the test booking. |
| Visual review | Full-page desktop/mobile captures inspected. Independent review found no material UX/accessibility or retry-state correctness fixes; its scope excludes an image-comp fidelity comparison. Mechanical UI detector returned no findings. |

The adjacent `acceptance-results.json` is the redacted output of all 15 real-interface checks. No credentials, customer payloads, CLI sessions or infrastructure connection strings are included. Synthetic contact values use `example.invalid`.

Infrastructure used newly initialized private databases and freshly generated test credentials with loopback-only listeners. Browser dependencies/fonts were supplied locally on the Linux test host. All owned platform, worker, receiver, browser and dev-server processes stopped before handoff. Shared development services were untouched. The sample imports no infrastructure source, writes no application database and calls no hidden provisioning endpoint.

## Reproduce

Install frozen registry dependencies, install Playwright Chromium plus system dependencies, and run `bun run check` and `bun audit`. For real-interface reproduction, supply isolated loopback infrastructure and perform public CLI authentication/Organization/Workspace selection, then use the guarded `scripts/acceptance.ts` command in the README. Use a fresh disposable test Workspace: import creates records and the script rotates its keys. The successful run cancels its bookings, removes the temporary webhook endpoint, and stops its listeners.

## Acceptance boundary and publication

These results cover this sample using published packages against isolated test infrastructure. They do not establish hosted demo operation, real-customer email delivery, durable receiver-side processing, production live-mode acceptance or a general-purpose catalog browser. The local event view is deliberately bounded, non-durable and contains no customer payload.

Owner review and explicit confirmation are required before changing this repository's visibility to public. No public hosting or deployment is included in this acceptance.
