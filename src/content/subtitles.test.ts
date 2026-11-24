import { describe, expect, it } from 'vitest'
import { firstTranslationMeaning } from './subtitles'

describe('firstTranslationMeaning', () => {
  it('returns only the first Chinese meaning and strips the part of speech', () => {
    expect(firstTranslationMeaning('n. 苹果, 家伙\n[医] 苹果')).toBe('苹果')
    expect(firstTranslationMeaning('n. [医] 苹果, 家伙')).toBe('苹果')
    expect(firstTranslationMeaning('vt. 放弃，抛弃；使屈从')).toBe('放弃')
  })

  it('returns an empty string when the dictionary entry has no meaning', () => {
    expect(firstTranslationMeaning()).toBe('')
    expect(firstTranslationMeaning('  \n  ')).toBe('')
  })
})
