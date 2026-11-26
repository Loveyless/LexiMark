import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { parseCsvWithHeader } from './csv'

describe('packaged dictionary coverage', () => {
  it('contains a translation or definition for every CEFR word', async () => {
    const [csv, ...levelFiles] = await Promise.all([
      readFile(new URL('../../public/data/dict/ecdict.subset.csv', import.meta.url), 'utf8'),
      ...['a1', 'a2', 'b1', 'b2'].map((level) =>
        readFile(new URL(`../../public/data/levels/${level}.json`, import.meta.url), 'utf8'),
      ),
    ])
    const entries = new Map<string, Record<string, string>>()
    for (const entry of parseCsvWithHeader(csv)) {
      const word = entry.word?.toLowerCase()
      if (word) entries.set(word, entry)
    }
    const levelWords = new Set(
      levelFiles.flatMap((file) => (JSON.parse(file) as { words: string[] }).words),
    )
    const missing = [...levelWords].filter((word) => !entries.has(word))
    const withoutMeaning = [...levelWords].filter((word) => {
      const entry = entries.get(word)
      return !entry?.translation?.trim() && !entry?.definition?.trim()
    })

    expect(missing).toEqual([])
    expect(withoutMeaning).toEqual([])
  })
})
