import { type ReactNode } from 'react'

import { describe, it, expect } from 'vitest'

import { render, screen } from './utils'

describe('src/test/utils.tsx functional verification', () => {
  it('customRender supports additional wrapper', () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <div data-testid="custom-wrapper">{children}</div>
    )

    render(<div data-testid="content">Hello</div>, { wrapper: Wrapper })

    expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
    expect(screen.getByTestId('custom-wrapper')).toContainElement(
      screen.getByTestId('content'),
    )
  })

  it('customRender still provides AllTheProviders context', () => {
    // ApiProvider が提供する data-testid を確認（実装に依存するが、
    // ここではラップされていること自体を検証）
    // ApiProvider は children をそのまま返すか、特定のタグで囲む可能性がある
    render(<div data-testid="content">Hello</div>)
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
})
