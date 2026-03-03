import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getPortFromUrl } from './shared/utils/port'
import { DEFAULT_PORTS } from './shared/constants'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendUrl = env.BOOKMARK_PAGE_FRONTEND_URL || ''
  const port = getPortFromUrl(frontendUrl, DEFAULT_PORTS.FRONTEND)

  return {
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    server: {
      port,
      proxy: {
        '/api': {
          target: 'http://localhost:3030',
          changeOrigin: true,
        },
      },
    },
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
