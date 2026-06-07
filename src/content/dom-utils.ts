import {
  SKIP_TAGS_BASE,
  SKIP_TAGS_CODE,
  HIGHLIGHT_CLASS,
  HIGHLIGHT_PROCESSED_ATTR,
  MIN_HIGHLIGHT_TOKEN_LETTERS,
} from '../shared/constants'

/** 判断元素是否落在跳过标签里（或它的祖先里有跳过标签） */
export function isInSkippedTag(
  el: Element | null | undefined,
  skipCode: boolean,
): boolean {
  let cur: Element | null = el ?? null
  while (cur && cur !== document.body) {
    const tag = cur.tagName?.toLowerCase()
    if (!tag) return false
    if (SKIP_TAGS_BASE.has(tag)) return true
    if (skipCode && SKIP_TAGS_CODE.has(tag)) return true
    if (cur.classList?.contains(HIGHLIGHT_CLASS)) return true
    if (cur.hasAttribute?.(HIGHLIGHT_PROCESSED_ATTR)) return true
    if ((cur as HTMLElement).isContentEditable) return true
    cur = cur.parentElement
  }
  return false
}

/** 取本页面 host */
export function currentHost(): string {
  try {
    return location.host
  } catch {
    return ''
  }
}

/** 把字符串按 token 正则切出来 */
export function* iterTokens(
  text: string,
  regex: RegExp,
): IterableIterator<{ raw: string; start: number; end: number }> {
  regex.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    yield { raw: m[0], start: m.index, end: m.index + m[0].length }
  }
}

/** 少于三个英文字母的 token 不作为可高亮单词处理 */
export function hasEnoughLettersToHighlight(raw: string): boolean {
  const matched = raw.match(/[A-Za-z]/g)
  return (matched?.length ?? 0) >= MIN_HIGHLIGHT_TOKEN_LETTERS
}

/**
 * 句首判定（DESIGN §2 第 3 条）：
 * - 该 token 在所在文本中的 start 之前，trim 后为空，或前一个非空白字符是 . ! ? \n :
 */
export function isSentenceStart(text: string, start: number): boolean {
  for (let i = start - 1; i >= 0; i--) {
    const c = text[i]!
    if (c === ' ' || c === '\t') continue
    if (c === '\n' || c === '.' || c === '!' || c === '?' || c === ':') return true
    return false
  }
  return true
}

/** 首字母大写 + 其余小写 */
export function isCapitalizedWord(raw: string): boolean {
  return /^[A-Z][a-z]+$/.test(raw)
}

/** 全大写且长度 ≥ 2（缩写 NASA / API） */
export function isAllCaps(raw: string): boolean {
  return raw.length >= 2 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)
}

/** camelCase / PascalCase：含至少一个内部大写字母 */
export function isMixedCase(raw: string): boolean {
  if (raw.length < 2) return false
  // 首字符大写或小写都可能，但要求内部至少出现一次大写
  for (let i = 1; i < raw.length; i++) {
    const c = raw[i]!
    if (c >= 'A' && c <= 'Z') return true
  }
  return false
}
