import { describe, expect, it } from 'vitest'
import { shouldIncludeEcdictEntry } from './subset-filter'

describe('shouldIncludeEcdictEntry', () => {
  it('keeps CEFR words even when they are outside the frequency limit', () => {
    expect(shouldIncludeEcdictEntry('cyberschool', 80_000, 90_000, new Set(['cyberschool']))).toBe(true)
  })

  it('keeps non-CEFR words inside the frequency limit', () => {
    expect(shouldIncludeEcdictEntry('common', 0, 40_000, new Set())).toBe(true)
  })

  it('still excludes non-CEFR words outside the frequency limit', () => {
    expect(shouldIncludeEcdictEntry('rare', 80_000, 90_000, new Set())).toBe(false)
  })
})
