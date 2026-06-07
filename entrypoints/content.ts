import { defineContentScript } from 'wxt/sandbox'
import {
  HIGHLIGHT_CLASS,
  HIGHLIGHT_WORD_ATTR,
  TOOLTIP_DELAY_MS,
} from '../src/shared/constants'
import {
  setSnapshot,
  getOrEmpty,
  subscribe,
} from '../src/content/index-store'
import {
  isPageMostlyEnglish,
  collectTextNodes,
} from '../src/content/scanner'
import {
  processTextNode,
  removeAllHighlights,
  removeHighlightsByWord,
} from '../src/content/highlighter'
import { startMutationObserver } from '../src/content/mutation'
import {
  injectHighlightCss,
  applyHighlightStyle,
} from '../src/content/styles'
import {
  showTooltip,
  scheduleHide,
  hideTooltipImmediate,
} from '../src/content/tooltip'
import { isHostDisabled } from '../src/storage/sites'
import { currentHost } from '../src/content/dom-utils'
import { preloadSpeechVoices } from '../src/speech/speak'
import type {
  DictEntry,
  IndexSnapshot,
  MsgSnapshotUpdated,
} from '../src/shared/types'

export default defineContentScript({
  matches: ['https://*/*', 'http://*/*'],
  allFrames: true,
  runAt: 'document_idle',
  async main() {
    injectHighlightCss()

    // 拉首份快照（带重试，DESIGN §9.2）
    const snap = await requestSnapshot(undefined)
    if (!snap) {
      // 静默放弃，下次刷新再试
      return
    }
    applyState(snap)

    // 监听设置变化 → 重新决定是否扫描
    subscribe((idx) => {
      applyHighlightStyle(idx.settings)
      preloadSpeechVoices(idx.settings)
      const host = currentHost()
      const shouldRun =
        idx.settings.enabled && !isHostDisabled(host, idx.settings.disabledSites)
      if (!shouldRun) {
        removeAllHighlights()
        return
      }
      // 设置或词库变了，简单清理后重扫
      removeAllHighlights()
      runScan(document.body)
    })

    // 监听 worker 广播
    chrome.runtime.onMessage.addListener((msg: MsgSnapshotUpdated, _s, sendResp) => {
      if (msg?.type === 'LM_SNAPSHOT_UPDATED') {
        const known = getOrEmpty().version
        if (known === msg.version) return
        ;(async () => {
          const fresh = await requestSnapshot(known)
          if (fresh) applyState(fresh)
        })()
      }
      // 不阻塞回包
      sendResp?.({})
      return false
    })

    // 注册 hover / mutation
    setupHoverListener()
    startMutationObserver((nodes) => {
      const idx = getOrEmpty()
      if (!idx.settings.enabled) return
      if (isHostDisabled(currentHost(), idx.settings.disabledSites)) return
      for (const n of nodes) {
        if (n.nodeType === Node.TEXT_NODE) {
          processTextNode(n as Text, idx)
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          runScan(n as Element)
        }
      }
    })
  },
})

// ============ helpers ============

const visited = new WeakSet<Node>()

async function requestSnapshot(known: number | undefined): Promise<IndexSnapshot | null> {
  const tries = [0, 500, 1000, 2000]
  for (const wait of tries) {
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'LM_REQUEST_SNAPSHOT',
        knownVersion: known,
      })
      if (!resp) continue
      if ('upToDate' in resp && resp.upToDate) {
        // worker 确认快照版本未变；caller 不再 applyState
        return null
      }
      if ('snapshot' in resp && resp.snapshot) {
        return resp.snapshot as IndexSnapshot
      }
    } catch {
      // worker 可能未就绪，继续重试
    }
  }
  return null
}

function applyState(snap: IndexSnapshot) {
  const idx = setSnapshot(snap)
  applyHighlightStyle(idx.settings)
  preloadSpeechVoices(idx.settings)
  const host = currentHost()
  const shouldRun =
    idx.settings.enabled && !isHostDisabled(host, idx.settings.disabledSites)
  if (!shouldRun) {
    removeAllHighlights()
    return
  }
  if (!isPageMostlyEnglish(idx.settings.skipCodeBlocks)) return
  // 首次扫描
  runScan(document.body)
}

function runScan(root: Node) {
  const idx = getOrEmpty()
  if (!idx.settings.enabled) return
  const nodes = collectTextNodes(root, idx.settings.skipCodeBlocks, visited)
  // 分片处理，避免阻塞主线程
  const CHUNK = 80
  let i = 0
  const step = () => {
    const end = Math.min(i + CHUNK, nodes.length)
    for (; i < end; i++) {
      const n = nodes[i]!
      visited.add(n)
      processTextNode(n, idx)
    }
    if (i < nodes.length) {
      requestIdleSafe(step)
    }
  }
  requestIdleSafe(step)
}

function requestIdleSafe(cb: () => void) {
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined
  if (typeof ric === 'function') {
    ric(cb, { timeout: 200 })
  } else {
    setTimeout(cb, 16)
  }
}

// ============ hover 委托 ============

let hoverSeq = 0

function setupHoverListener() {
  let hoverTimer: number | null = null
  let pendingWord: string | null = null
  let pendingPos: { x: number; y: number } = { x: 0, y: 0 }

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = e.target as Element | null
      if (!target || !(target instanceof Element)) return
      if (!target.classList?.contains(HIGHLIGHT_CLASS)) return
      const word = target.getAttribute(HIGHLIGHT_WORD_ATTR)
      if (!word) return
      const seq = ++hoverSeq
      pendingWord = word
      pendingPos = { x: e.clientX, y: e.clientY }
      if (hoverTimer != null) clearTimeout(hoverTimer)
      hoverTimer = window.setTimeout(() => {
        hoverTimer = null
        if (pendingWord !== word || hoverSeq !== seq) return
        showCardFor(word, pendingPos, target, seq)
      }, TOOLTIP_DELAY_MS)
    },
    true,
  )

  document.addEventListener(
    'mouseout',
    (e) => {
      const related = (e as MouseEvent).relatedTarget as Element | null
      const target = e.target as Element | null
      if (!target?.classList?.contains(HIGHLIGHT_CLASS)) return
      if (related && related.closest?.('#leximark-tooltip-host')) return
      hoverSeq++
      if (hoverTimer != null) {
        clearTimeout(hoverTimer)
        hoverTimer = null
      }
      pendingWord = null
      scheduleHide(200)
    },
    true,
  )

  // 滚动 / 页面卸载时立刻隐藏
  window.addEventListener('scroll', () => hideTooltipImmediate(), { passive: true })
}

async function showCardFor(
  word: string,
  pos: { x: number; y: number },
  target: Element,
  seq: number,
) {
  const idx = getOrEmpty()
  let entry: DictEntry | null = null
  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'LM_QUERY_ENTRY',
      word,
    })
    entry = (resp as { entry: DictEntry | null })?.entry ?? null
  } catch (e) {
    console.warn('[LexiMark] query entry failed:', e)
  }
  if (seq !== hoverSeq || !target.isConnected) return
  showTooltip({
    word,
    entry,
    position: pos,
    settings: idx.settings,
    onExclude: (w) => {
      // 立即响应：本页面同词高亮去掉，再发到 worker 持久化
      removeHighlightsByWord(w)
      chrome.runtime.sendMessage({ type: 'LM_ADD_EXCLUDED', word: w }).catch(() => {})
    },
  })
}
