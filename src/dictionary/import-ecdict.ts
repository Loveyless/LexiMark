import { getDb } from './db'
import { parseCsvWithHeader } from './csv'
import {
  PUBLIC_DICT_CSV,
  DICT_FREQ_LIMIT,
} from '../shared/constants'
import type { DictEntry, DictMeta } from '../shared/types'
import { getDictMeta, setDictMeta } from '../storage/settings'

/**
 * 把 public/data/dict/ecdict.subset.csv 一次性写入 IndexedDB。
 * - 首次启动调用；后续看 dictMeta.version 决定是否重导
 * - 错误兜底见 DESIGN §9.1
 */
export async function importEcdictIfNeeded(): Promise<{
  importedNow: boolean
  entryCount: number
  meta: DictMeta
}> {
  const cur = await getDictMeta()
  const url = chrome.runtime.getURL(PUBLIC_DICT_CSV)

  // 取 csv 的 ETag 作为 version 不现实；用 size + 首字节哈希 作为 version 也比较折腾。
  // 这里用更简单的策略：dictMeta.version 直接写入构建时的 hash 占位
  // 由 build-ecdict-subset.ts 生成 csv 时一起更新版本号（写入 csv 第一行注释）。
  // 简化起见：用 csv 的字节长度 + 前 16 字节内容 作为 version 指纹。
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`fetch dict csv failed: ${res.status}`)
  }
  const text = await res.text()
  const version = fingerprint(text)

  if (cur && cur.version === version) {
    return { importedNow: false, entryCount: cur.entryCount ?? 0, meta: cur }
  }

  const records = parseCsvWithHeader(text)
  const entries: DictEntry[] = []
  for (const r of records) {
    const word = (r['word'] ?? '').trim().toLowerCase()
    if (!word) continue
    const bnc = toIntOrUndef(r['bnc'])
    const frq = toIntOrUndef(r['frq'])
    if (bnc != null && bnc > DICT_FREQ_LIMIT && (frq == null || frq > DICT_FREQ_LIMIT)) {
      continue // 兜底过滤；构建脚本本应已经过滤
    }
    entries.push({
      word,
      phonetic: optStr(r['phonetic']),
      translation: optStr(r['translation']),
      definition: optStr(r['definition']),
      pos: optStr(r['pos']),
      exchange: optStr(r['exchange']),
      bnc,
      frq,
    })
  }

  const db = getDb()
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear()
    const CHUNK = 5000
    for (let i = 0; i < entries.length; i += CHUNK) {
      await db.entries.bulkPut(entries.slice(i, i + CHUNK))
    }
  })

  const meta: DictMeta = {
    version,
    importedAt: Date.now(),
    entryCount: entries.length,
  }
  await setDictMeta(meta)
  return { importedNow: true, entryCount: entries.length, meta }
}

function fingerprint(text: string): string {
  // 简单指纹：长度 + 前 32 字符的 hashCode（避免每次启动 hash 整文件）。
  // 词典内容每次构建变化时长度/前缀都会变，足够触发重导。
  const head = text.slice(0, 64).replace(/\s+/g, '')
  let h = 0
  for (let i = 0; i < head.length; i++) {
    h = (h * 31 + head.charCodeAt(i)) | 0
  }
  return `${text.length}-${h.toString(16)}`
}

function toIntOrUndef(v: string | undefined): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  if (n <= 0) return undefined
  return Math.floor(n)
}

function optStr(v: string | undefined): string | undefined {
  if (v == null) return undefined
  const s = v.trim()
  return s ? s : undefined
}
