import { expect, test, type Page } from "@playwright/test";

const tomorrow = () =>
  new Date(Date.now() + 86400000).toISOString().slice(0, 10);
function service(
  id: string,
  name: string,
  durationMinutes: number,
  price: string,
) {
  return {
    id,
    name,
    durationMinutes,
    price,
    currency: "USD",
    locationId: "loc_studio",
    active: true,
    deletedAt: null,
  };
}
const catalog = [
  service("svc_consultation", "Consultation", 60, "75.00"),
  service("svc_followup", "Follow-up", 30, "40.00"),
];
async function studio(page: Page) {
  await page.route("**/studio.json", (route) =>
    route.fulfill({
      json: {
        services: catalog,
        staff: [
          { id: "res_alex", name: "Alex" },
          { id: "res_sam", name: "Sam" },
        ],
      },
    }),
  );
  await page.route("http://127.0.0.1:9999/**", async (route) => {
    const url = new URL(route.request().url());
    url.pathname = url.pathname.replace(/\/$/, "");
    expect(route.request().headers().authorization).toBe(
      "Bearer pk_test_browser_fixture",
    );
    if (url.pathname === "/services")
      await route.fulfill({
        json: { data: catalog, has_more: false, next_cursor: null },
      });
    else if (url.pathname === "/resources")
      await route.fulfill({
        json: {
          data: [
            {
              id: "res_alex",
              name: "Alex",
              locationId: "loc_studio",
              deletedAt: null,
            },
            {
              id: "res_sam",
              name: "Sam",
              locationId: "loc_studio",
              deletedAt: null,
            },
          ],
          has_more: false,
          next_cursor: null,
        },
      });
    else if (url.pathname === "/availability") {
      expect(url.searchParams.get("resource_id")).toBeTruthy();
      await route.fulfill({
        json: {
          service_id: url.searchParams.get("service_id"),
          date: tomorrow(),
          timezone: "UTC",
          slots: [9, 10, 11, 13, 14, 15].map((hour) => ({
            starts_at: `${tomorrow()}T${String(hour).padStart(2, "0")}:00:00.000Z`,
            ends_at: `${tomorrow()}T${String(hour + 1).padStart(2, "0")}:00:00.000Z`,
            available_resource_count: 1,
          })),
        },
      });
    } else await route.abort();
  });
  await page.goto("/");
  await page.getByLabel("Consultation", { exact: false }).check();
  await page.getByLabel("Staff", { exact: true }).selectOption("res_alex");
  await page.getByLabel("9:00 AM", { exact: true }).check();
  await page.getByLabel("Name", { exact: true }).fill("Test Visitor");
  await page
    .getByLabel("Email", { exact: true })
    .fill("visitor@example.invalid");
}

test("service/staff/date/slot/contact journey shows pending receipt and no overflow", async ({
  page,
}, testInfo) => {
  await studio(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `.impeccable/review/${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.route("**/bookings/", (route) =>
    route.fulfill({
      status: 201,
      json: {
        id: "bkg_test_receipt",
        startsAt: `${tomorrow()}T09:00:00.000Z`,
        status: "pending",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Request appointment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your request is received." }),
  ).toBeFocused();
  await expect(page.getByText("bkg_test_receipt")).toBeVisible();
  await expect(
    page.getByText("No confirmation email is sent", { exact: false }),
  ).toBeVisible();
});

test("stale slot refresh retains contact details", async ({ page }) => {
  await studio(page);
  await page.route("**/bookings/", (route) =>
    route.fulfill({
      status: 409,
      json: {
        error: { code: "booking_conflict", message: "The slot is taken." },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Request appointment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Choose another available time",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Test Visitor",
  );
  await expect(
    page.getByRole("button", { name: "Request appointment", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("9:00 AM", { exact: true })).not.toBeChecked();
});

test("lost response locks changes and retries identical body and key", async ({
  page,
}) => {
  await studio(page);
  const attempts: { body: string | null; key: string | undefined }[] = [];
  await page.route("**/bookings/", async (route) => {
    attempts.push({
      body: route.request().postData(),
      key: route.request().headers()["idempotency-key"],
    });
    if (attempts.length === 1) await route.abort("connectionfailed");
    else
      await route.fulfill({
        status: 201,
        json: {
          id: "bkg_replayed",
          startsAt: `${tomorrow()}T09:00:00.000Z`,
          status: "pending",
        },
      });
  });
  await page
    .getByRole("button", { name: "Request appointment", exact: true })
    .click();
  await expect(page.getByLabel("Staff", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Retry the same request" }).click();
  await expect(page.getByText("bkg_replayed")).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[0]).toEqual(attempts[1]);
});

test("empty availability and auth rejection give recovery actions", async ({
  page,
}) => {
  await studio(page);
  await page.route("**/availability/?**", (route) =>
    route.fulfill({ json: { slots: [] } }),
  );
  await page.getByRole("button", { name: "Refresh available times" }).click();
  await expect(
    page.getByText("No times are available.", { exact: false }),
  ).toBeVisible();
  await page.route("**/availability/?**", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "unauthorized", message: "Revoked key" } },
    }),
  );
  await page.getByRole("button", { name: "Refresh available times" }).click();
  await expect(page.getByRole("alert")).toContainText("test key was rejected");
});
