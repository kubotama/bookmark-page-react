import { describe, expect, it } from 'vitest'

import { UI_MESSAGES } from '@shared/constants'
import { render, screen } from '@testing-library/react'

import { Popup } from './Popup'

describe('Popup Component', () => {
  it('正しくタイトルが表示されること', () => {
    render(<Popup />)

    expect(screen.getByText(UI_MESSAGES.EXTENSION_TITLE)).toBeInTheDocument()
    expect(screen.getByText(UI_MESSAGES.EXTENSION_CONTENT)).toBeInTheDocument()
  })
})
