import Dexie, { type Table } from 'dexie'
import { DB_NAME, DB_TABLE_ENTRIES } from '../shared/constants'
import type { DictEntry } from '../shared/types'

/**
 * IndexedDB schema（DESIGN §7.2）。
 * - word 为主键（小写）
 * - 加 bnc/frq 索引便于按词频范围筛选
 */
export class LexiMarkDB extends Dexie {
  entries!: Table<DictEntry, string>

  constructor() {
    super(DB_NAME)
    this.version(1).stores({
      [DB_TABLE_ENTRIES]: 'word, bnc, frq',
    })
  }
}

let _db: LexiMarkDB | null = null

export function getDb(): LexiMarkDB {
  if (!_db) _db = new LexiMarkDB()
  return _db
}

/** 删库重建（词典首次导入失败重试用） */
export async function resetDb(): Promise<void> {
  if (_db) {
    try {
      _db.close()
    } catch {
      // ignore
    }
    _db = null
  }
  await Dexie.delete(DB_NAME)
}
