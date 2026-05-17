import { LEVEL_RANK } from '../shared/constants'
import type { InMemoryIndexes, Settings, UserLevel } from '../shared/types'

/**
 * 单词高亮判定（PRD §17）。
 *
 * 入参 word 必须是已经 normalize 过的（小写 + lemma 反查）。
 *
 * 优先级：
 *   excluded > custom > level rule > advanced rule
 */
export function shouldHighlight(
  normalized: string,
  idx: InMemoryIndexes,
): { hit: boolean; reason: 'excluded' | 'custom' | 'level' | 'advanced' | 'none'; level?: UserLevel } {
  if (!normalized) return { hit: false, reason: 'none' }
  const settings = idx.settings

  if (idx.excludedWords.has(normalized)) return { hit: false, reason: 'excluded' }

  if (idx.customWords.has(normalized)) return { hit: true, reason: 'custom' }

  const wordLevel = idx.levelWordMap.get(normalized)
  if (wordLevel) {
    if (matchesLevel(wordLevel, settings)) {
      return { hit: true, reason: 'level', level: wordLevel }
    }
    return { hit: false, reason: 'level', level: wordLevel }
  }

  if (settings.highlightAdvancedUnknownWords && idx.advancedWordSet.has(normalized)) {
    return { hit: true, reason: 'advanced' }
  }

  return { hit: false, reason: 'none' }
}

function matchesLevel(wordLevel: UserLevel, settings: Settings): boolean {
  const wr = LEVEL_RANK[wordLevel]
  const ur = LEVEL_RANK[settings.userLevel]
  if (settings.includeCurrentLevel) return wr >= ur
  return wr > ur
}
