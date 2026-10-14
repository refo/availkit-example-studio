export function browserConfig(
  baseUrl: string | undefined,
  apiKey: string | undefined,
) {
  if (!apiKey?.startsWith("pk_test_") || apiKey.includes("REPLACE")) {
    throw new Error(
      "Add your publishable test key to .env, then restart the app.",
    );
  }
  const url = new URL(baseUrl ?? "https://api.availkit.com");
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Use an API origin without credentials, query parameters, or a path.",
    );
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  ) {
    throw new Error(
      "Use HTTPS for the API, or HTTP on loopback for isolated development.",
    );
  }
  return { apiKey, baseUrl: url.origin };
}
