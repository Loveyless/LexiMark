import { PUBLIC_LEVEL_JSON, ALL_LEVELS } from '../shared/constants'
import type { UserLevel } from '../shared/types'

export type LevelWordsBundle = Record<UserLevel, string[]>

/**
 * 从打包进扩展的 data/levels/*.json 加载分级词表。
 * - JSON 结构：{ words: ["abandon", ...] }
 * - 全部小写化、去重
 */
export async function loadLevelWords(): Promise<LevelWordsBundle> {
  const result: LevelWordsBundle = { A1: [], A2: [], B1: [], B2: [] }
  await Promise.all(
    ALL_LEVELS.map(async (lv) => {
      const url = chrome.runtime.getURL(PUBLIC_LEVEL_JSON(lv))
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`fetch ${url} failed: ${res.status}`)
      }
      const data = (await res.json()) as { words?: string[] }
      const set = new Set<string>()
      for (const w of data.words ?? []) {
        const s = (w ?? '').trim().toLowerCase()
        if (!s) continue
        // 跳过空格短语（DESIGN §5.1）
        if (/\s/.test(s)) continue
        set.add(s)
      }
      result[lv] = Array.from(set)
    }),
  )
  return result
}

/**
 * 把按等级的列表压平成 word→level 的 pair 数组，"最低等级优先"。
 * 这里直接按 ALL_LEVELS 顺序遍历，遇到已存在的 word 跳过。
 */
export function flattenLevelMap(bundle: LevelWordsBundle): Map<string, UserLevel> {
  const map = new Map<string, UserLevel>()
  for (const lv of ALL_LEVELS) {
    for (const w of bundle[lv]) {
      if (!map.has(w)) map.set(w, lv)
    }
  }
  return map
}
