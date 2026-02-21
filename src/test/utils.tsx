import React from 'react'
import { render, renderHook } from '@testing-library/react'
import type { RenderOptions, RenderHookOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  initialUrl 
}: { 
  children: React.ReactNode, 
  initialUrl?: string 
}) => {
  // キャッシュの干渉を防ぐため常に新鮮な QueryClient を使用
  const queryClient = createTestQueryClient()
  return (
    <ApiProvider initialUrl={initialUrl}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ApiProvider>
  )
}

/**
 * カスタム render 関数
 */
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialUrl?: string }
) => {
  const wrapper = (props: { children: React.ReactNode }) => (
    <AllTheProviders {...props} initialUrl={options?.initialUrl} />
  )
  return render(ui, { wrapper, ...options })
}

/**
 * カスタム renderHook 関数
 */
const customRenderHook = <Result, Props>(
  hookRender: (initialProps: Props) => Result,
  options?: Omit<RenderHookOptions<Props>, 'wrapper'> & { initialUrl?: string }
) => {
  const wrapper = (props: { children: React.ReactNode }) => (
    <AllTheProviders {...props} initialUrl={options?.initialUrl} />
  )
  return renderHook(hookRender, { wrapper, ...options })
}

// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'
// eslint-disable-next-line react-refresh/only-export-components
export { customRender as render, customRenderHook as renderHook }
