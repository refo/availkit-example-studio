import {
  AvailKitError,
  type AvailKitClient,
  type BookingCreateRequest,
} from "@availkit/client";

export interface BookingAttempt {
  key: string;
  body: BookingCreateRequest;
}

export function makeAttempt(
  serviceId: string,
  resourceId: string,
  startsAt: string,
  name: string,
  email: string,
): BookingAttempt {
  return {
    key: crypto.randomUUID(),
    body: {
      service_id: serviceId,
      resource_id: resourceId,
      starts_at: startsAt,
      status: "pending",
      metadata: {
        customer_name: name.trim(),
        customer_email: email.trim(),
        source: "appointment-studio-example",
      },
    },
  };
}

export async function submitAttempt(
  client: AvailKitClient,
  attempt: BookingAttempt,
) {
  const response = await client.createBooking(attempt.body, {
    headers: { "Idempotency-Key": attempt.key },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 201)
    throw new Error(`Unexpected booking response (${response.status}).`);
  return response.data;
}

export function bookingFailure(
  error: unknown,
): "stale" | "uncertain" | "rejected" {
  if (error instanceof AvailKitError) {
    if (error.status === 409 && error.code === "idempotency_conflict")
      return "uncertain";
    if (error.status === 409 && error.code === "booking_conflict")
      return "stale";
    if (error.status && error.status >= 400 && error.status < 500)
      return "rejected";
  }
  return "uncertain";
}

export function errorMessage(error: unknown) {
  if (error instanceof AvailKitError) {
    if (error.status === 401)
      return "The test key was rejected. Ask the operator to update the key, then reload.";
    if (error.status === 429)
      return "Too many requests. Wait a moment, then try again.";
    return `The request failed${error.code ? ` (${error.code})` : ""}. Try again or ask the operator for help.`;
  }
  return "The API could not be reached. Check your connection and try again.";
}
