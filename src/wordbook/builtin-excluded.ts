import raw from './builtin-excluded.json'

/**
 * 内置排除词：随扩展打包，构建索引快照时与用户自己的排除词合并。
 *
 * 数据在 `builtin-excluded.json` 的 groups 里按主题分组，加载时拍平、
 * 小写化、去重；含空格的词组直接跳过（扫描器按单词处理）。
 */
function flattenGroups(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  const groups = (data as { groups?: unknown }).groups
  if (!groups || typeof groups !== 'object') return []

  const seen = new Set<string>()
  const words: string[] = []
  for (const group of Object.values(groups as Record<string, unknown>)) {
    if (!Array.isArray(group)) continue
    for (const item of group) {
      if (typeof item !== 'string') continue
      const word = item.trim().toLowerCase()
      if (!word || /\s/.test(word)) continue
      if (seen.has(word)) continue
      seen.add(word)
      words.push(word)
    }
  }
  return words
}

export const BUILTIN_EXCLUDED_WORDS: readonly string[] = flattenGroups(raw)

/** 内置词在前、用户词在后，按首次出现去重。 */
export function mergeExcludedWords(userWords: readonly string[]): string[] {
  return Array.from(new Set([...BUILTIN_EXCLUDED_WORDS, ...userWords]))
}
