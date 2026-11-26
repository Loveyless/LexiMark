/**
 * build-ecdict-subset.ts
 *
 * 从完整 ECDICT 生成裁剪子集，体积控制在 5-10 MB（DESIGN §5.2）。
 *
 * 用法：
 *   pnpm tsx scripts/build-ecdict-subset.ts <ecdict.csv> [out.csv]
 *
 * 过滤：保留词频阈值内的词条，并完整保留 CEFR-J 词表中的词条。
 * 保留字段：word, phonetic, translation, definition, pos, exchange, bnc, frq
 *
 * 数据源：https://github.com/skywind3000/ECDICT  MIT License。
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { shouldIncludeEcdictEntry } from '../src/dictionary/subset-filter'

const KEEP_FIELDS = [
  'word',
  'phonetic',
  'translation',
  'definition',
  'pos',
  'exchange',
  'bnc',
  'frq',
] as const

type SupplementalEntry = {
  word: string
  phonetic?: string
  translation?: string
  definition?: string
  pos?: string
  exchange?: string
  bnc?: string
  frq?: string
}

async function main() {
  const input = process.argv[2]
  const output =
    process.argv[3] ?? path.resolve(process.cwd(), 'public/data/dict/ecdict.subset.csv')
  if (!input) {
    console.error('Usage: tsx scripts/build-ecdict-subset.ts <ecdict.csv> [out.csv]')
    process.exit(1)
  }

  const text = await fs.readFile(path.resolve(input), 'utf8')
  const rows = parseCsv(text.replace(/^﻿/, ''))
  if (rows.length < 2) {
    console.error('Empty input')
    process.exit(1)
  }
  const header = rows[0]!
  const indexes: Record<string, number> = {}
  for (let i = 0; i < header.length; i++) {
    indexes[header[i]!.toLowerCase()] = i
  }
  for (const f of KEEP_FIELDS) {
    if (!(f in indexes)) {
      console.error(`Missing column: ${f}`)
      process.exit(1)
    }
  }

  const levelWordSet = await loadLevelWordSet()
  const supplementalData = JSON.parse(
    await fs.readFile(path.resolve('scripts/ecdict-overrides.json'), 'utf8'),
  ) as { entries?: SupplementalEntry[] }

  const out: string[][] = [[...KEEP_FIELDS] as string[]]
  const includedWords = new Set<string>()
  let kept = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!
    if (row.length === 1 && row[0] === '') continue
    const word = (row[indexes['word']!] ?? '').trim().toLowerCase()
    if (!word) continue
    if (/\s/.test(word)) continue
    const bnc = toIntOrZero(row[indexes['bnc']!])
    const frq = toIntOrZero(row[indexes['frq']!])
    if (!shouldIncludeEcdictEntry(word, bnc, frq, levelWordSet)) continue
    out.push(
      KEEP_FIELDS.map((f) => (f === 'word' ? word : row[indexes[f]!] ?? '')),
    )
    includedWords.add(word)
    kept++
  }

  for (const entry of supplementalData.entries ?? []) {
    const word = entry.word.trim().toLowerCase()
    if (!word || /\s/.test(word) || includedWords.has(word)) continue
    out.push(KEEP_FIELDS.map((f) => (f === 'word' ? word : entry[f] ?? '')))
    includedWords.add(word)
    kept++
  }

  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, stringifyCsv(out), 'utf8')
  console.log(`wrote ${output}: ${kept} entries`)
}

async function loadLevelWordSet(): Promise<Set<string>> {
  const words = new Set<string>()
  for (const level of ['a1', 'a2', 'b1', 'b2']) {
    const file = path.resolve(`public/data/levels/${level}.json`)
    const data = JSON.parse(await fs.readFile(file, 'utf8')) as { words?: string[] }
    for (const word of data.words ?? []) {
      const normalized = word.trim().toLowerCase()
      if (normalized) words.add(normalized)
    }
  }
  return words
}

function toIntOrZero(v: string | undefined): number {
  if (!v) return 0
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQ = false
      } else field += c
      continue
    }
    if (c === '"') {
      inQ = true
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (c === '\r') {
      if (text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      continue
    }
    if (c === '\n') {
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      continue
    }
    field += c
  }
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function stringifyCsv(rows: string[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          if (cell == null) return ''
          const s = String(cell)
          if (/["\n\r,]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(','),
    )
    .join('\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
