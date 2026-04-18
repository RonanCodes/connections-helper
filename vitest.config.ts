import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'tests/integration/**', 'node_modules/**', 'dist/**'],
    passWithNoTests: true,
  },
})
