import { act } from 'react'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_ACTIONS, APP_PATHS, KEY_VALUES } from '@shared/constants'
import { MOCK_BOOKMARK_1 } from '@shared/test/fixtures'
import * as urlUtils from '@shared/utils/url'
import { openUrlInNewTab } from '@shared/utils/url'

import { commonSetup, setupHook } from './useBookmarkPage.test-utils'
import { mockNavigate, verifyNavigateToPath, verifySuccess } from '../test/mock'
import { fireEvent } from '../test/utils'

// react-router-dom のモックはファイルごとに必要
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: MOCK_BOOKMARK_1.id })),
    useNavigate: () => mockNavigate,
  }
})

// openUrlInNewTab をモック
vi.mock('@shared/utils/url', async () => {
  const actual = await vi.importActual<typeof urlUtils>('@shared/utils/url')
  return {
    ...actual,
    openUrlInNewTab: vi.fn(),
  }
})

describe('useBookmarkPage Hook - Navigation & Shortcuts', () => {
  beforeEach(() => {
    commonSetup()
  })

  describe('Navigation', () => {
    it('handleBack が呼ばれた際、onBack を実行し一覧へ戻ること', async () => {
      const onBack = vi.fn()
      const result = await setupHook({ onBack })

      act(() => {
        result.current.handleBack()
      })

      expect(onBack).toHaveBeenCalled()
      verifyNavigateToPath()
    })

    it('handleOpen が呼ばれた際、URL を別タブで開くこと', async () => {
      const result = await setupHook()

      act(() => {
        result.current.handleOpen()
      })

      verifyNavigateToPath({
        path: MOCK_BOOKMARK_1.url,
        navigation: openUrlInNewTab,
      })
    })
  })

  describe('Keyboard shortcuts', () => {
    it('Escape キーで handleBack が呼ばれること', async () => {
      await setupHook()
      fireEvent.keyDown(window, { key: KEY_VALUES.ESCAPE })
      verifyNavigateToPath()
    })

    it('Enter キー単体で handleOpen が呼ばれること', async () => {
      await setupHook()
      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER })
      verifyNavigateToPath({
        path: MOCK_BOOKMARK_1.url,
        navigation: openUrlInNewTab,
      })
    })

    it('Ctrl + Enter キーで handleUpdate が呼ばれること', async () => {
      await setupHook({
        mock: {
          action: API_ACTIONS.UPDATE_BOOKMARK,
          params: { success: true, data: MOCK_BOOKMARK_1 },
        },
      })
      fireEvent.keyDown(window, { key: KEY_VALUES.ENTER, ctrlKey: true })

      await verifySuccess({
        action: API_ACTIONS.UPDATE_BOOKMARK,
        payload: {
          id: MOCK_BOOKMARK_1.id,
          title: MOCK_BOOKMARK_1.title,
          url: MOCK_BOOKMARK_1.url,
        },
        expectedData: MOCK_BOOKMARK_1,
        path: APP_PATHS.HOME,
      })
    })
  })
})
