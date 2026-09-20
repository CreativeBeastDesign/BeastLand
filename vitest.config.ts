import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [svelte({ compilerOptions: { runes: true, experimental: { async: true } } })],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
    // Runes need Svelte's client runtime even in node tests.
    conditions: ["browser"],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
