import { getDb } from './db'
import type { DictEntry } from '../shared/types'

/**
 * worker 侧的词典查询入口。
 * - 单词主键直接查 IndexedDB
 * - hover 走这里
 */
export async function queryEntry(word: string): Promise<DictEntry | null> {
  const w = word.trim().toLowerCase()
  if (!w) return null
  const db = getDb()
  const got = await db.entries.get(w)
  return got ?? null
}

/** 批量取词条（构建内存索引用） */
export async function getAllEntries(): Promise<DictEntry[]> {
  const db = getDb()
  return db.entries.toArray()
}

/** 取 BNC ≤ limit 的所有 entries，构建 advancedWordSet 用 */
export async function getEntriesByBncLte(limit: number): Promise<DictEntry[]> {
  const db = getDb()
  // bnc 有索引，直接走 where
  return db.entries.where('bnc').between(1, limit, true, true).toArray()
}
