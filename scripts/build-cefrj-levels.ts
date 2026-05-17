/**
 * build-cefrj-levels.ts
 *
 * 从 CEFR-J Wordlist 原始 CSV / TSV 生成 a1/a2/b1/b2.json 内置词表。
 *
 * 用法：
 *   pnpm tsx scripts/build-cefrj-levels.ts <input.csv|tsv> [outDir]
 *
 * 输入说明（CEFR-J Wordlist Version 1.6 风格）：
 *   - 至少包含两列：headword、CEFR
 *   - 列分隔符自动识别（,/\t）
 *   - 首行视为 header
 *
 * 处理规则（参考 DESIGN §5.1）：
 *   - headword 全部小写化
 *   - 含空格的短语丢弃（MVP 不处理）
 *   - 同一 headword 多等级时取最低等级
 *   - 输出 JSON：{ "words": ["..."] }
 *
 * 数据源：https://www.cefr-j.org/  CC BY-SA 4.0，需在 README/about 保留署名。
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

type Level = 'A1' | 'A2' | 'B1' | 'B2'
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']
const RANK: Record<Level, number> = { A1: 1, A2: 2, B1: 3, B2: 4 }

async function main() {
  const input = process.argv[2]
  const outDir = process.argv[3] ?? path.resolve(process.cwd(), 'public/data/levels')
  if (!input) {
    console.error('Usage: tsx scripts/build-cefrj-levels.ts <input.csv|tsv> [outDir]')
    process.exit(1)
  }

  const text = await fs.readFile(path.resolve(input), 'utf8')
  const rows = parseTable(text.replace(/^﻿/, ''))
  if (rows.length < 2) {
    console.error('Empty input')
    process.exit(1)
  }
  const header = rows[0]!.map((h) => h.trim().toLowerCase())
  const headwordIdx = pickColumn(header, ['headword', 'word', 'lemma', '見出し語'])
  const levelIdx = pickColumn(header, ['cefr', 'cefr_level', 'level', 'cefrlevel'])
  if (headwordIdx < 0 || levelIdx < 0) {
    console.error('Missing headword/cefr column. Detected header:', header)
    process.exit(1)
  }

  /** word → lowest level */
  const map = new Map<string, Level>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!
    const raw = row[headwordIdx]?.trim() ?? ''
    const lvRaw = (row[levelIdx]?.trim() ?? '').toUpperCase()
    if (!raw || !lvRaw) continue
    if (/\s/.test(raw)) continue
    const w = raw.toLowerCase()
    if (!/^[a-z][a-z'’\-]*$/.test(w)) continue
    const lv = normalizeLevel(lvRaw)
    if (!lv) continue
    const cur = map.get(w)
    if (!cur || RANK[lv] < RANK[cur]) map.set(w, lv)
  }

  const buckets: Record<Level, string[]> = { A1: [], A2: [], B1: [], B2: [] }
  for (const [w, lv] of map) buckets[lv].push(w)
  for (const lv of LEVELS) buckets[lv].sort()

  await fs.mkdir(outDir, { recursive: true })
  for (const lv of LEVELS) {
    const file = path.join(outDir, `${lv.toLowerCase()}.json`)
    await fs.writeFile(file, JSON.stringify({ words: buckets[lv] }, null, 0))
    console.log(`wrote ${file}: ${buckets[lv].length} words`)
  }
}

function parseTable(text: string): string[][] {
  // 自动判分隔符
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const sep = firstLine.includes('\t') ? '\t' : ','
  return text
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => parseLine(l, sep))
}

function parseLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === sep) {
        out.push(cur)
        cur = ''
      } else cur += c
    }
  }
  out.push(cur)
  return out
}

function pickColumn(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = header.indexOf(c)
    if (i >= 0) return i
  }
  return -1
}

function normalizeLevel(s: string): Level | null {
  const v = s.replace(/\s+/g, '').toUpperCase()
  if (v.startsWith('A1')) return 'A1'
  if (v.startsWith('A2')) return 'A2'
  if (v.startsWith('B1')) return 'B1'
  if (v.startsWith('B2')) return 'B2'
  return null
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
