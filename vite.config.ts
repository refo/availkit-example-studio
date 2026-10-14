import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  for (const [name, value] of Object.entries(env)) {
    if (
      name !== "VITE_AVAILKIT_BASE_URL" &&
      name !== "VITE_AVAILKIT_PUBLISHABLE_KEY"
    ) {
      throw new Error(
        `Unexpected browser variable ${name}. Only the API URL and publishable test key are allowed.`,
      );
    }
    if (/sk_(test|live)_/.test(value))
      throw new Error("Secret keys must never enter the browser build.");
  }
  return {
    plugins: [react()],
    server: { host: "127.0.0.1" },
    preview: { host: "127.0.0.1" },
  };
});
