import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  // A longer per-test limit: the heavier privacy and screen tests pass in two to three seconds alone, but exceed
  // the default five when several checkouts run on the same machine at once. No assertion changes.
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node', testTimeout: 30_000 },
})
