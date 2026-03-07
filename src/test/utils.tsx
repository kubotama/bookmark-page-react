import { useMemo, type ReactNode, type ReactElement } from 'react'
import { render, renderHook } from '@testing-library/react'
import type { RenderOptions, RenderHookOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ApiProvider } from '../contexts/ApiContext'

/**
 * テスト用の QueryClient を作成
 */
// eslint-disable-next-line react-refresh/only-export-components
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

/**
 * すべての Provider で包むラッパーコンポーネント
 */
export const AllTheProviders = ({
  children,
  initialUrl,
}: {
  children: ReactNode
  initialUrl?: string
}) => {
  // QueryClient をメモ化して再生成を防ぐ
  const queryClient = useMemo(() => createTestQueryClient(), [])

  // MemoryRouter 用にパス部分のみを抽出 (フルURLが渡された場合への対策)
  const initialPath = useMemo(() => {
    if (!initialUrl) return '/'
    try {
      const url = new URL(initialUrl)
      return `${url.pathname}${url.search}${url.hash}`
    } catch {
      // フルURLでない場合は、'/foo/bar' のようなパスと見なしてそのまま返す
      return initialUrl
    }
  }, [initialUrl])

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <ApiProvider initialUrl={initialUrl}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ApiProvider>
    </MemoryRouter>
  )
}

/**
 * カスタム render 関数
 */
const customRender = (
  ui: ReactElement,
  options?: RenderOptions & { initialUrl?: string },
) => {
  const { wrapper: Wrapper, initialUrl, ...rest } = options || {}

  const CombinedWrapper = ({ children }: { children: ReactNode }) => (
    <AllTheProviders initialUrl={initialUrl}>
      {Wrapper ? <Wrapper>{children}</Wrapper> : children}
    </AllTheProviders>
  )
  return render(ui, { wrapper: CombinedWrapper, ...rest })
}

/**
 * カスタム renderHook 関数
 */
const customRenderHook = <Result, Props>(
  hookRender: (initialProps: Props) => Result,
  options?: RenderHookOptions<Props> & { initialUrl?: string },
) => {
  const { wrapper: Wrapper, initialUrl, ...rest } = options || {}

  const CombinedWrapper = ({ children }: { children: ReactNode }) => (
    <AllTheProviders initialUrl={initialUrl}>
      {Wrapper ? <Wrapper>{children}</Wrapper> : children}
    </AllTheProviders>
  )
  return renderHook(hookRender, { wrapper: CombinedWrapper, ...rest })
}

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
// eslint-disable-next-line react-refresh/only-export-components
export { customRender as render, customRenderHook as renderHook }
