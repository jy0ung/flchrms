/**
 * Vitest config for integration tests only.
 *
 * These tests call the real Supabase API (signUp, RPC, etc.) and therefore
 * create real rows.  They must NEVER run against a production project.
 *
 * Usage:
 *   npm run test:integration          # one-shot
 *   npx vitest --config vitest.integration.config.ts   # watch mode
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/integration/**/*.integration.test.{ts,tsx}"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
