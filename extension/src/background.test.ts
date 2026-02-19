import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EXTENSION_MESSAGE_TYPES, STORAGE_KEYS, LOG_MESSAGES } from '@shared/constants'

describe('background service worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    // background.ts を再読み込みしてイベントリスナーを登録させる
    vi.resetModules()
  })

  it('拡張機能インストール時にログを出力すること', async () => {
    const consoleSpy = vi.mocked(console.log)

    // chrome.runtime.onInstalled.addListener のモックを取得
    const addListenerMock = vi.mocked(chrome.runtime.onInstalled.addListener)

    // background.ts をインポート (初期ロードログが走る)
    await import('./background')
    expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.BACKGROUND_LOADED)

    // リスナーが登録されたか確認
    expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function))

    // 登録されたリスナー（コールバック）を直接呼び出す
    const callback = addListenerMock.mock.calls[0][0]
    callback({ reason: 'install' } as chrome.runtime.InstalledDetails)

    expect(consoleSpy).toHaveBeenCalledWith(LOG_MESSAGES.EXTENSION_INSTALLED)
  })

  it('外部からの GET_API_CONFIG メッセージに対してストレージの値を返すこと', async () => {
    const mockApiUrl = 'http://test-api.com'
    const addListenerMock = vi.mocked(chrome.runtime.onMessageExternal.addListener)
    
    // storage.sync.get の戻り値を設定
    vi.mocked(chrome.storage.sync.get).mockImplementation((_keys, callback) => {
      if (callback) {
        callback({ [STORAGE_KEYS.API_URL]: mockApiUrl })
      }
      return Promise.resolve({ [STORAGE_KEYS.API_URL]: mockApiUrl })
    })

    // background.ts をロード
    await import('./background')

    // リスナーが登録されたか確認
    expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function))

    // 登録されたリスナーを取得
    const messageHandler = addListenerMock.mock.calls[0][0]
    const sendResponse = vi.fn()

    // メッセージ受信をシミュレート
    const result = messageHandler(
      { type: EXTENSION_MESSAGE_TYPES.GET_API_CONFIG },
      {},
      sendResponse
    )

    // 非同期応答のために true が返されることを確認
    expect(result).toBe(true)

    // レスポンスが正しく送信されたか確認
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      apiUrl: mockApiUrl
    })
  })
})
