import {
  ENGLISH_RATIO_THRESHOLD,
  SAMPLE_CHAR_LIMIT,
  SAMPLE_NODE_LIMIT,
  TOKEN_REGEX,
  MAX_TOKENS_PER_PAGE,
} from '../shared/constants'
import { isInSkippedTag } from './dom-utils'

/**
 * 抽样估算页面英文字符比例（DESIGN §3）。
 */
export function isPageMostlyEnglish(skipCode: boolean): boolean {
  let text = ''
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (n) => {
        const parent = (n as Text).parentElement
        if (isInSkippedTag(parent, skipCode)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )
  let count = 0
  while (walker.nextNode() && count < SAMPLE_NODE_LIMIT && text.length < SAMPLE_CHAR_LIMIT) {
    const v = (walker.currentNode as Text).nodeValue ?? ''
    if (v) {
      text += v
      count++
    }
  }
  const compact = text.replace(/\s+/g, '')
  if (compact.length < 50) return true
  const matched = compact.match(/[A-Za-z]/g)
  const ascii = matched ? matched.length : 0
  return ascii / compact.length >= ENGLISH_RATIO_THRESHOLD
}

/**
 * 在 root 范围内收集所有可处理的文本节点。
 */
export function collectTextNodes(
  root: Node,
  skipCode: boolean,
  visited: WeakSet<Node>,
): Text[] {
  const out: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const parent = (n as Text).parentElement
      if (isInSkippedTag(parent, skipCode)) return NodeFilter.FILTER_REJECT
      const v = (n as Text).nodeValue
      if (!v || !/[A-Za-z]/.test(v)) return NodeFilter.FILTER_REJECT
      if (visited.has(n)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let totalTokens = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    out.push(node)
    // 粗估每节点 token 数（保护上限，PRD §24）
    const matches = node.nodeValue?.match(TOKEN_REGEX) ?? null
    totalTokens += matches ? matches.length : 0
    if (totalTokens > MAX_TOKENS_PER_PAGE) break
  }
  return out
}
