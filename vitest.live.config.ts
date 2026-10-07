import { defineConfig } from "vitest/config";
import path from "path";

// Dedicated config for integration tests that require live credentials
// (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN) and hit a real Supabase
// project / the Supabase Management API. Run explicitly via `pnpm test:live`
// in an environment (e.g. deployment CI) where those secrets are configured.
// These are intentionally NOT part of the default `pnpm test` run (see
// vitest.config.ts) so that `pnpm check`, `pnpm test`, and `pnpm build:external`
// succeed without any live secrets present.
const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/supabase.connection.test.ts", "server/supabase-management-token.test.ts"],
  },
});
