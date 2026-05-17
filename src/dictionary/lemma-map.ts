import type { DictEntry } from '../shared/types'

/**
 * 从 ECDICT entries 构建 inflected→lemma 反查表（DESIGN §6）。
 *
 * exchange 字段格式：`p:past/d:past_participle/i:present_participle/...`
 * 我们只关心 p/d/i/3/r/t/s 这些类型（PRD §8.5 示例）。
 *
 * 原词优先：如果 inflected 本身也是另一个 entry 的 lemma（即出现在 entryWordSet 中），
 * 跳过该映射；扫描时小写后的原词命中词典就直接按原词判定，不再走 lemma。
 *
 * 冲突时不覆盖：第一次写入即定（DESIGN §6 当前策略）。
 */
const VALID_EXCHANGE_TYPES = new Set(['p', 'd', 'i', '3', 'r', 't', 's'])

export function buildLemmaPairs(entries: DictEntry[]): [string, string][] {
  const wordSet = new Set<string>()
  for (const e of entries) wordSet.add(e.word)

  const map = new Map<string, string>()

  for (const e of entries) {
    if (!e.exchange) continue
    const parts = e.exchange.split('/')
    for (const part of parts) {
      const idx = part.indexOf(':')
      if (idx <= 0) continue
      const type = part.slice(0, idx).trim()
      const form = part.slice(idx + 1).trim().toLowerCase()
      if (!form || !type) continue
      if (!VALID_EXCHANGE_TYPES.has(type)) continue
      if (form === e.word) continue
      if (wordSet.has(form)) continue // 原词优先
      if (map.has(form)) continue // 冲突不覆盖
      map.set(form, e.word)
    }
  }

  return Array.from(map.entries())
}
