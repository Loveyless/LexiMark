import { defineBackground } from 'wxt/sandbox'
import {
  buildSnapshot,
  getSnapshot,
} from '../src/background/snapshot'
import { broadcastSnapshotUpdated } from '../src/background/broadcast'
import { queryEntry } from '../src/dictionary/query'
import { addExcludedWord } from '../src/storage/settings'
import {
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_CUSTOM_WORDS,
  STORAGE_KEY_EXCLUDED_WORDS,
} from '../src/shared/constants'
import type {
  MsgFromContent,
  MsgQueryEntryResp,
  MsgRequestSnapshotResp,
  MsgAddExcludedResp,
} from '../src/shared/types'

export default defineBackground({
  type: 'module',
  persistent: false,
  main() {
    // 启动时尽快构建一次（不阻塞消息处理）
    buildSnapshot().catch((e) => {
      console.error('[LexiMark] initial buildSnapshot failed:', e)
    })

    // ============ 消息处理 ============

    chrome.runtime.onMessage.addListener(
      (msg: MsgFromContent, _sender, sendResponse) => {
        // 必须返回 true 才能异步 sendResponse
        ;(async () => {
          try {
            switch (msg?.type) {
              case 'LM_REQUEST_SNAPSHOT': {
                const snap = await getSnapshot()
                if (
                  typeof msg.knownVersion === 'number' &&
                  msg.knownVersion === snap.version
                ) {
                  const resp: MsgRequestSnapshotResp = {
                    upToDate: true,
                    version: snap.version,
                  }
                  sendResponse(resp)
                } else {
                  const resp: MsgRequestSnapshotResp = { snapshot: snap }
                  sendResponse(resp)
                }
                return
              }
              case 'LM_QUERY_ENTRY': {
                const entry = await queryEntry(msg.word)
                const resp: MsgQueryEntryResp = { entry }
                sendResponse(resp)
                return
              }
              case 'LM_ADD_EXCLUDED': {
                await addExcludedWord(msg.word)
                const resp: MsgAddExcludedResp = { ok: true }
                sendResponse(resp)
                return
              }
              default: {
                sendResponse({ error: 'unknown message type' })
              }
            }
          } catch (e) {
            sendResponse({ error: String(e instanceof Error ? e.message : e) })
          }
        })()
        return true
      },
    )

    // ============ storage 变化 → 重建快照并广播 ============

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return
      const relevant =
        STORAGE_KEY_SETTINGS in changes ||
        STORAGE_KEY_CUSTOM_WORDS in changes ||
        STORAGE_KEY_EXCLUDED_WORDS in changes
      if (!relevant) return
      buildSnapshot()
        .then((snap) => broadcastSnapshotUpdated(snap.version))
        .catch((e) => console.warn('[LexiMark] rebuild after storage change failed:', e))
    })

    // 安装/更新事件：确保词典最新
    chrome.runtime.onInstalled.addListener(() => {
      buildSnapshot().catch(() => {
        // 错误兜底见 snapshot.ts
      })
    })
  },
})
