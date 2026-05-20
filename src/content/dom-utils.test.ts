import { describe, expect, it } from 'vitest'

import { hasEnoughLettersToHighlight } from './dom-utils'

describe('hasEnoughLettersToHighlight', () => {
  it('rejects a single English letter', () => {
    expect(hasEnoughLettersToHighlight('G')).toBe(false)
    expect(hasEnoughLettersToHighlight('a')).toBe(false)
  })

  it('accepts tokens with at least two English letters', () => {
    expect(hasEnoughLettersToHighlight('go')).toBe(true)
    expect(hasEnoughLettersToHighlight("I'm")).toBe(true)
    expect(hasEnoughLettersToHighlight('A-plus')).toBe(true)
  })
})
