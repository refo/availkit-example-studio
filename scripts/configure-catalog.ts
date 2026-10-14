import manifest from "../catalog.json";

export function publicCatalog(references: Record<string, string>) {
  for (const ref of ["studio", "consultation", "follow-up", "alex", "sam"]) {
    const prefix =
      ref === "studio"
        ? "loc_"
        : ["alex", "sam"].includes(ref)
          ? "res_"
          : "svc_";
    if (!references[ref]?.startsWith(prefix))
      throw new Error(`Missing imported reference: ${ref}`);
  }
  return {
    services: manifest.services.map((service) => ({
      id: references[service.ref],
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
    })),
    staff: manifest.resources.map((resource) => ({
      id: references[resource.ref],
      name: resource.name,
    })),
  };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file)
    throw new Error(
      "Usage: bun scripts/configure-catalog.ts operator-output/catalog-import.json",
    );
  const imported = await Bun.file(file).json();
  const catalog = publicCatalog(imported.references);
  await Bun.write(
    "public/studio.json",
    JSON.stringify(catalog, null, 2) + "\n",
  );
  console.log(
    "Wrote public/studio.json with public catalog IDs and display fields only.",
  );
}
