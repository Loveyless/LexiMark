import type { IndexSnapshot, InMemoryIndexes, UserLevel } from '../shared/types'
import { defaultSettings } from '../shared/constants'

/**
 * content script 持有的运行时内存索引。
 * - 由 worker 通过 LM_REQUEST_SNAPSHOT 一次性下发，扫描热路径不再跨 context。
 */
let current: InMemoryIndexes | null = null

const subscribers = new Set<(idx: InMemoryIndexes) => void>()

export function setSnapshot(snap: IndexSnapshot): InMemoryIndexes {
  const levelWordMap = new Map<string, UserLevel>()
  for (const lv of ['A1', 'A2', 'B1', 'B2'] as UserLevel[]) {
    for (const w of snap.levelWords[lv] ?? []) levelWordMap.set(w, lv)
  }
  const idx: InMemoryIndexes = {
    levelWordMap,
    advancedWordSet: new Set(snap.advancedWords),
    lemmaMap: new Map(snap.lemmaPairs),
    customWords: new Set(snap.customWords),
    excludedWords: new Set(snap.excludedWords),
    settings: snap.settings,
    version: snap.version,
  }
  current = idx
  for (const fn of subscribers) {
    try {
      fn(idx)
    } catch (e) {
      console.warn('[LexiMark] subscriber error:', e)
    }
  }
  return idx
}

export function getSnapshot(): InMemoryIndexes | null {
  return current
}

export function getOrEmpty(): InMemoryIndexes {
  return (
    current ?? {
      levelWordMap: new Map(),
      advancedWordSet: new Set(),
      lemmaMap: new Map(),
      customWords: new Set(),
      excludedWords: new Set(),
      settings: { ...defaultSettings },
      version: 0,
    }
  )
}

export function subscribe(fn: (idx: InMemoryIndexes) => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}
