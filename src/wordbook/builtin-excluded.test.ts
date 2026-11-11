import { describe, expect, it } from 'vitest'
import raw from './builtin-excluded.json'
import { BUILTIN_EXCLUDED_WORDS, mergeExcludedWords } from './builtin-excluded'
import { shouldHighlight } from './should-highlight'
import { defaultSettings } from '../shared/constants'
import type { InMemoryIndexes, UserLevel } from '../shared/types'

describe('builtin excluded words', () => {
  it('flattens every group into lowercase single tokens', () => {
    const fromJson = Object.values(raw.groups).flat()
    expect(BUILTIN_EXCLUDED_WORDS.length).toBeGreaterThan(0)
    expect(new Set(BUILTIN_EXCLUDED_WORDS).size).toBe(BUILTIN_EXCLUDED_WORDS.length)
    expect(BUILTIN_EXCLUDED_WORDS.length).toBeLessThanOrEqual(fromJson.length)

    for (const group of Object.values(raw.groups)) {
      expect(new Set(group).size).toBe(group.length)
      expect([...group].sort()).toEqual(group)
    }

    for (const word of BUILTIN_EXCLUDED_WORDS) {
      expect(word).toBe(word.toLowerCase())
      expect(word).toMatch(/^[a-z]+(?:['-][a-z]+)*$/)
    }
  })

  it('keeps the words the user already excluded', () => {
    for (const word of ['accessibility', 'chamberlain', 'docker', 'shanghai', 'vibe']) {
      expect(BUILTIN_EXCLUDED_WORDS).toContain(word)
    }
  })

  it('merges user words after the builtins and dedupes overlap', () => {
    const merged = mergeExcludedWords(['docker', 'myword'])
    expect(merged[0]).toBe(BUILTIN_EXCLUDED_WORDS[0])
    expect(merged).toContain('myword')
    expect(merged.filter((word) => word === 'docker')).toHaveLength(1)
  })

  it('beats the level rule for a builtin word', () => {
    const idx: InMemoryIndexes = {
      levelWordMap: new Map<string, UserLevel>([['docker', 'B2']]),
      advancedWordSet: new Set<string>(),
      lemmaMap: new Map<string, string>(),
      customWords: new Set<string>(),
      excludedWords: new Set(mergeExcludedWords([])),
      settings: { ...defaultSettings },
      version: 1,
    }
    expect(shouldHighlight('docker', idx)).toEqual({ hit: false, reason: 'excluded' })
  })
})
