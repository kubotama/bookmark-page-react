import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { DEFAULT_API_URL, DEFAULT_PORTS } from './shared/constants'
import { getPortFromUrl } from './shared/utils/port'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendUrl = env.BOOKMARK_PAGE_FRONTEND_URL || ''
  const port = getPortFromUrl(frontendUrl, DEFAULT_PORTS.FRONTEND)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port,
      cors: true,
      proxy: {
        '/api': {
          target: DEFAULT_API_URL,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [
        './src/test/setup.ts',
        './extension/test/setup.ts',
        './server/test/setup.ts',
      ],
      exclude: ['node_modules', 'dist', 'dist-extension', '.git', '.cache'],
      coverage: {
        provider: 'v8',
        clean: true,
        all: true,
        reporter: ['text', 'json', 'html'],
        include: [
          'shared/**/*.ts',
          'src/**/*.ts',
          'src/**/*.tsx',
          'extension/**/*.ts',
          'extension/**/*.tsx',
          'server/**/*.ts',
        ],
        exclude: [
          '**/*.test.ts',
          '**/*.test.tsx',
          'src/test/**',
          'extension/test/**',
          'vite.config.ts',
          'src/main.tsx',
          'extension/sync-version.ts',
          'extension/src/main-options.tsx',
          'extension/src/main-popup.tsx',
        ],
        thresholds: {
          global: {
            lines: 90,
            branches: 80,
            functions: 90,
            statements: 90,
          },
        },
      },
    },
  }
})
