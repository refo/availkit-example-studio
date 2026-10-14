import { createClient, AvailKitError } from "@availkit/client";

const apiKey = process.env.AVAILKIT_REVOKED_KEY;
const baseUrl = process.env.AVAILKIT_BASE_URL ?? "https://api.availkit.com";
const serviceId = process.env.AVAILKIT_SERVICE_ID;
const date = process.env.AVAILKIT_TEST_DATE;
if (!apiKey?.startsWith("pk_test_") || !serviceId || !date)
  throw new Error(
    "Set AVAILKIT_REVOKED_KEY (publishable test key), AVAILKIT_SERVICE_ID and AVAILKIT_TEST_DATE.",
  );
try {
  await createClient({ apiKey, baseUrl }).getAvailability({
    service_id: serviceId,
    date,
  });
  throw new Error(
    "The old key still works; check its revocation before proceeding.",
  );
} catch (error) {
  if (!(error instanceof AvailKitError) || error.status !== 401) throw error;
  console.log("PASS: revoked publishable test key rejected with 401.");
}
