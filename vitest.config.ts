import { defineConfig } from "vitest/config";
import path from "path";

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
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/**/*.test.ts", "client/**/*.spec.ts", "client/**/*.test.tsx", "client/**/*.spec.tsx"],
    // Live-credential integration tests (real Supabase project + management API) are excluded from
    // the default `pnpm test` run so that `pnpm check`/`pnpm build:external` succeed in any environment
    // without secrets (local dev, CI without deployment secrets, this sandbox, etc.).
    // They are run explicitly via `pnpm test:live` where SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ACCESS_TOKEN exist.
    exclude: ["**/node_modules/**", "**/dist/**", "server/supabase.connection.test.ts", "server/supabase-management-token.test.ts"],
  },
});
