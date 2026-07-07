import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.{test,tests}.{ts,tsx}', 'tests/**/*.{test,tests}.{ts,tsx}'],
    globals: true,
    environment: 'node',
  },
})
