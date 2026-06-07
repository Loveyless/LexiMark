import { describe, expect, it } from 'vitest'

import { hasEnoughLettersToHighlight } from './dom-utils'

describe('hasEnoughLettersToHighlight', () => {
  it('rejects tokens with fewer than three English letters', () => {
    expect(hasEnoughLettersToHighlight('G')).toBe(false)
    expect(hasEnoughLettersToHighlight('a')).toBe(false)
    expect(hasEnoughLettersToHighlight('go')).toBe(false)
    expect(hasEnoughLettersToHighlight("I'm")).toBe(false)
  })

  it('accepts tokens with at least three English letters', () => {
    expect(hasEnoughLettersToHighlight('get')).toBe(true)
    expect(hasEnoughLettersToHighlight('A-plus')).toBe(true)
  })
})
