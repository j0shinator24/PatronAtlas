import { defineConfig } from "vitest/config"

// Minimal vitest setup for Evening 1 (api-keys lib tests). Runs the
// server-side TypeScript modules under Node 20+, which provides globalThis.crypto
// out of the box -- same Web Crypto surface as the Cloudflare Workers runtime,
// so the SHA-256 hashing path is tested against the same primitive that ships
// in production.
//
// Extension is .mts (not .ts) because vitest 4 ships pure ESM and the project's
// package.json doesn't set "type": "module" (deliberate -- Next + opennextjs
// expects the project to default to CJS). .mts forces Node to load this single
// file as ESM without touching the rest of the project.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
})
