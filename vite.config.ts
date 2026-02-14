import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3030',
        changeOrigin: true,
      },
    },
  },
  // @ts-expect-error - Vitest types are needed but might conflict with Vite types in some setups
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './extension/test/setup.ts'],
    coverage: {
      provider: 'v8',
      clean: true,
      all: true,
      reporter: ['text', 'json', 'html'],
      include: [
        'server/**/*.ts',
        'shared/**/*.ts',
        'src/**/*.ts',
        'src/**/*.tsx',
        'extension/**/*.ts',
        'extension/**/*.tsx',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/test/**',
        'extension/test/**',
        'vite.config.ts',
        'server/index.ts',
        'src/main.tsx',
        'extension/sync-version.ts',
        'extension/src/main-options.tsx',
        'extension/src/main-popup.tsx',
      ],
      thresholds: {
        global: {
          lines: 70,
          branches: 70,
          functions: 70,
          statements: 70,
        },
      },
    },
  },
})
