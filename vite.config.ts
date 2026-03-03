import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * 環境変数からフロントエンドのポート番号を抽出する
 * 
 * 注意: この関数は shared/utils/url.ts の getPortFromUrl と重複しています。
 * vite.config.ts の実行フェーズでは、shared 配下のモジュールが使用している
 * パスエイリアス (@shared/*) を解決できないため、自己完結させる必要があります。
 */
const getFrontendPort = (url: string | undefined): number => {
  const defaultPort = 5173
  if (!url) return defaultPort
  try {
    const parsed = new URL(url)
    const portString = parsed.port
    if (portString) {
      const p = Number(portString)
      // 1024 未満の特権ポートはセキュリティ上の理由により除外し、
      // 65535 (TCP ポートの最大値) を超える値も無効としてデフォルトを使用。
      if (p >= 1024 && p <= 65535) return p
    }
  } catch {
    // 無効な URL 形式の場合はデフォルトを使用
  }
  return defaultPort
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendUrl = env.BOOKMARK_PAGE_FRONTEND_URL || ''
  const port = getFrontendPort(frontendUrl)

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
