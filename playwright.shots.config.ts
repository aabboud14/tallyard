import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: /shots\.spec\.ts/,
  projects: [{ name: 'http', use: { baseURL: 'http://localhost:4173/' }, metadata: { entry: 'http://localhost:4173/' } }],
})
