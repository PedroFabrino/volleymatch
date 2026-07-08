import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.{test,tests}.{ts,tsx}', 'tests/**/*.{test,tests}.{ts,tsx}'],
    globals: true,
    environment: 'node',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'dummy',
    },
  },
})
