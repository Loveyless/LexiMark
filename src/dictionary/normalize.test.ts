import { describe, expect, it } from 'vitest'
import { buildLemmaPairs } from './lemma-map'
import { normalizeWord } from './normalize'

describe('normalizeWord', () => {
  it('resolves a dictionary lookup to the lemma when the inflected form has no entry', () => {
    const lemmaMap = new Map(
      buildLemmaPairs([
        { word: 'have', exchange: 'p:had/3:has/i:having' },
      ]),
    )

    expect(normalizeWord('had', lemmaMap)).toBe('have')
    expect(normalizeWord('HAVING', lemmaMap)).toBe('have')
  })

  it('keeps the original word when no lemma mapping exists', () => {
    expect(normalizeWord('facilities', new Map())).toBe('facilities')
  })

  it('keeps an exact dictionary entry ahead of another word\'s inflection mapping', () => {
    const lemmaMap = new Map(
      buildLemmaPairs([
        { word: 'have', exchange: 'p:had' },
        { word: 'had' },
      ]),
    )

    expect(normalizeWord('had', lemmaMap)).toBe('had')
  })
})
