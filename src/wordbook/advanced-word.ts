import { getEntriesByBncLte } from '../dictionary/query'
import { ADVANCED_BNC_LIMIT } from '../shared/constants'

/**
 * 构建 B2+/未分级高级词集合（PRD §6 + §17）。
 *
 * 规则：
 *   - 词在 ECDICT 子集里
 *   - BNC 排名 ≤ ADVANCED_BNC_LIMIT
 *   - 不在 A1/A2/B1/B2 分级词表里
 */
export async function buildAdvancedWordSet(
  levelWordMap: Map<string, unknown>,
): Promise<string[]> {
  const entries = await getEntriesByBncLte(ADVANCED_BNC_LIMIT)
  const out: string[] = []
  for (const e of entries) {
    if (!e.word) continue
    if (levelWordMap.has(e.word)) continue
    out.push(e.word)
  }
  return out
}
