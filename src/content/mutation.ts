import { isWrapping } from './highlighter'
import { SCAN_DEBOUNCE_MS } from '../shared/constants'

/**
 * 监听 DOM 变化触发增量扫描。
 * - debounce，避免动画/批量更新引爆
 * - wrap 期间忽略自反馈
 */
export function startMutationObserver(onChange: (nodes: Node[]) => void): () => void {
  let pending: Node[] = []
  let timer: number | null = null

  const flush = () => {
    timer = null
    const batch = pending
    pending = []
    if (batch.length > 0) onChange(batch)
  }

  const schedule = () => {
    if (timer != null) return
    timer = window.setTimeout(flush, SCAN_DEBOUNCE_MS)
  }

  const observer = new MutationObserver((mutations) => {
    if (isWrapping()) return
    for (const m of mutations) {
      if (m.type === 'characterData') {
        const t = m.target as Text
        if (t.parentElement) pending.push(t.parentElement)
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          // 文本节点直接放，元素节点也放进来再 collect
          pending.push(n)
        })
      }
    }
    if (pending.length > 0) schedule()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  return () => {
    observer.disconnect()
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  }
}
