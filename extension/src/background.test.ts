import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('background service worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    // background.ts を再読み込みしてイベントリスナーを登録させる
    vi.resetModules()
  })

  it('拡張機能インストール時にログを出力すること', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // chrome.runtime.onInstalled.addListener のモックを取得
    const addListenerMock = vi.mocked(chrome.runtime.onInstalled.addListener)

    // background.ts をインポート
    await import('./background')

    // リスナーが登録されたか確認
    expect(addListenerMock).toHaveBeenCalled()

    // 登録されたリスナー（コールバック）を直接呼び出す
    const callback = addListenerMock.mock.calls[0][0]
    callback({ reason: 'install' } as chrome.runtime.InstalledDetails)

    expect(consoleSpy).toHaveBeenCalledWith('Extension installed')
  })
})
