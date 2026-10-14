import { createReceiver } from "./receiver";

const port = Number(process.env.RECEIVER_PORT ?? "3210");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("RECEIVER_PORT must be 1–65535.");
const receiver = createReceiver({
  secret: process.env.AVAILKIT_WEBHOOK_SECRET ?? "",
});
const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  maxRequestBodySize: 64 * 1024,
  fetch: receiver.fetch,
});
console.log(`Receiver: http://127.0.0.1:${server.port}/webhooks/availkit`);
console.log(`Local event view: http://127.0.0.1:${server.port}/events`);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, async () => {
    await server.stop(true);
    process.exit(0);
  });
