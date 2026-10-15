import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  // Heavy screen and privacy tests render the whole sandbox; under parallel build load they can pass 5 s, so allow 20 s.
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'node', testTimeout: 20_000 },
})
