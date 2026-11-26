import { DICT_FREQ_LIMIT } from '../shared/constants'

export function shouldIncludeEcdictEntry(
  word: string,
  bnc: number,
  frq: number,
  levelWords: ReadonlySet<string>,
): boolean {
  const withinFrequencyLimit =
    (bnc > 0 && bnc <= DICT_FREQ_LIMIT) ||
    (bnc === 0 && frq > 0 && frq <= DICT_FREQ_LIMIT)
  return withinFrequencyLimit || levelWords.has(word)
}
