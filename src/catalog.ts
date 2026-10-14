export interface StudioService {
  id: string;
  name: string;
  durationMinutes: number;
  price: string;
  currency: string;
}
export interface StudioStaff {
  id: string;
  name: string;
}
export interface StudioCatalog {
  services: StudioService[];
  staff: StudioStaff[];
}

export function parseCatalog(value: unknown): StudioCatalog {
  if (!value || typeof value !== "object")
    throw new Error("Studio configuration is missing");
  const catalog = value as StudioCatalog;
  if (
    !Array.isArray(catalog.services) ||
    !Array.isArray(catalog.staff) ||
    catalog.services.length !== 2 ||
    catalog.staff.length !== 2 ||
    !catalog.services.every(
      (item) =>
        typeof item.id === "string" &&
        item.id.startsWith("svc_") &&
        typeof item.name === "string" &&
        typeof item.durationMinutes === "number" &&
        typeof item.price === "string" &&
        item.currency === "USD",
    ) ||
    !catalog.staff.every(
      (item) =>
        typeof item.id === "string" &&
        item.id.startsWith("res_") &&
        typeof item.name === "string",
    )
  ) {
    throw new Error(
      "Ask the operator to import the catalog and run the configure-catalog script, then reload the studio.",
    );
  }
  return catalog;
}
