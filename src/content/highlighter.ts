import {
  HIGHLIGHT_CLASS,
  HIGHLIGHT_PROCESSED_ATTR,
  HIGHLIGHT_WORD_ATTR,
  TOKEN_REGEX,
} from '../shared/constants'
import {
  hasEnoughLettersToHighlight,
  iterTokens,
  isAllCaps,
  isCapitalizedWord,
  isMixedCase,
  isSentenceStart,
} from './dom-utils'
import { normalizeWord, lowerOnly } from '../dictionary/normalize'
import { shouldHighlight } from '../wordbook/should-highlight'
import type { InMemoryIndexes } from '../shared/types'

type TokenMatch = {
  start: number
  end: number
  /** data-word 存原型词，用于 hover 查词 */
  lemma: string
}

/** 内部状态：是否正在 wrap，用于 mutation observer 自反馈防护 */
let wrapping = false

export function isWrapping(): boolean {
  return wrapping
}

/**
 * 在单个文本节点内执行：tokenize → 判定 → wrap。
 * 单节点处理失败不影响其他节点。
 */
export function processTextNode(
  node: Text,
  idx: InMemoryIndexes,
): void {
  const text = node.nodeValue ?? ''
  if (!text || !/[A-Za-z]/.test(text)) return

  const matches: TokenMatch[] = []
  for (const tk of iterTokens(text, TOKEN_REGEX)) {
    if (!hasEnoughLettersToHighlight(tk.raw)) continue
    const norm = decideNormalized(tk.raw, tk.start, text, idx)
    if (!norm) continue
    const verdict = shouldHighlight(norm, idx)
    if (!verdict.hit) continue
    matches.push({ start: tk.start, end: tk.end, lemma: norm })
  }
  if (matches.length === 0) return

  wrapMatchesInTextNode(node, matches)
}

/**
 * 应用 normalize：先小写，原词优先（命中分级词/customWords/excludedWords/词典/高级词都按原词处理）；
 * 否则查 lemma 反查表。
 * 同时处理专有名词跳过规则（DESIGN §2）。
 */
function decideNormalized(
  raw: string,
  start: number,
  fullText: string,
  idx: InMemoryIndexes,
): string | null {
  if (isAllCaps(raw)) return null
  if (isMixedCase(raw)) return null

  let work = raw
  if (isCapitalizedWord(raw)) {
    if (isSentenceStart(fullText, start)) {
      // 句首：首字母小写后进入判定
      work = raw[0]!.toLowerCase() + raw.slice(1)
    } else {
      // 句中专有名词跳过
      return null
    }
  }

  const lower = lowerOnly(work)
  if (!lower) return null

  // 原词优先：如果 lower 本身在分级词/词典/custom/excluded 任意之一里，按原词
  if (
    idx.levelWordMap.has(lower) ||
    idx.advancedWordSet.has(lower) ||
    idx.customWords.has(lower) ||
    idx.excludedWords.has(lower)
  ) {
    return lower
  }
  return normalizeWord(work, idx.lemmaMap)
}

function wrapMatchesInTextNode(node: Text, matches: TokenMatch[]) {
  const parent = node.parentNode
  if (!parent) return
  wrapping = true
  try {
    const frag = document.createDocumentFragment()
    let cursor = 0
    const raw = node.nodeValue!
    for (const m of matches) {
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(raw.slice(cursor, m.start)))
      }
      const span = document.createElement('span')
      span.className = HIGHLIGHT_CLASS
      span.setAttribute(HIGHLIGHT_WORD_ATTR, m.lemma)
      span.textContent = raw.slice(m.start, m.end)
      frag.appendChild(span)
      cursor = m.end
    }
    if (cursor < raw.length) {
      frag.appendChild(document.createTextNode(raw.slice(cursor)))
    }
    // 在父级上做一次标记，避免后续 mutation 又把它当新节点处理
    if (parent instanceof Element) {
      parent.setAttribute(HIGHLIGHT_PROCESSED_ATTR, '1')
    }
    parent.replaceChild(frag, node)
  } finally {
    wrapping = false
  }
}

/**
 * 移除页面中所有由本扩展插入的高亮 span，把文本还原。
 * - 用于禁用扩展 / 把当前站点关闭 / 切换 disabledSites。
 */
export function removeAllHighlights(): void {
  const spans = document.querySelectorAll<HTMLSpanElement>(`.${HIGHLIGHT_CLASS}`)
  wrapping = true
  try {
    for (const span of Array.from(spans)) {
      const parent = span.parentNode
      if (!parent) continue
      const text = document.createTextNode(span.textContent ?? '')
      parent.replaceChild(text, span)
    }
    // 合并相邻文本节点，减少后续扫描误处理
    document.querySelectorAll<HTMLElement>(`[${HIGHLIGHT_PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIGHLIGHT_PROCESSED_ATTR)
      el.normalize?.()
    })
  } finally {
    wrapping = false
  }
}

/** 单词被加入排除词后，从页面中移除所有命中该词的高亮 */
export function removeHighlightsByWord(word: string): void {
  const w = word.trim().toLowerCase()
  if (!w) return
  const spans = document.querySelectorAll<HTMLSpanElement>(
    `.${HIGHLIGHT_CLASS}[${HIGHLIGHT_WORD_ATTR}="${cssAttrEscape(w)}"]`,
  )
  wrapping = true
  try {
    for (const span of Array.from(spans)) {
      const parent = span.parentNode
      if (!parent) continue
      const text = document.createTextNode(span.textContent ?? '')
      parent.replaceChild(text, span)
    }
  } finally {
    wrapping = false
  }
}

function cssAttrEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
}
