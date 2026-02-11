import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: '@shared/ui',
        replacement: path.resolve(__dirname, './shared/components/ui'),
      },
      {
        find: '@shared',
        replacement: path.resolve(__dirname, './shared'),
      },
    ],
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
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
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      clean: true,
      all: true,
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts', 'shared/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        'src/test/**',
        'vite.config.ts',
        'server/index.ts',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
})
