import { importEcdictIfNeeded } from '../dictionary/import-ecdict'
import { getAllEntries } from '../dictionary/query'
import { buildLemmaPairs } from '../dictionary/lemma-map'
import {
  loadLevelWords,
  flattenLevelMap,
} from '../wordbook/level-words'
import { buildAdvancedWordSet } from '../wordbook/advanced-word'
import {
  getSettings,
  getCustomWords,
  getExcludedWords,
} from '../storage/settings'
import { defaultSettings } from '../shared/constants'
import type { IndexSnapshot } from '../shared/types'

type SnapshotState = {
  snapshot: IndexSnapshot
  buildingPromise: Promise<IndexSnapshot> | null
  initialized: boolean
  dictReady: boolean
  dictError?: string
}

const state: SnapshotState = {
  snapshot: emptySnapshot(),
  buildingPromise: null,
  initialized: false,
  dictReady: false,
}

let versionCounter = 0

/**
 * 构建一次新的索引快照（worker 启动 / 设置变更 / 词典刷新都会触发）。
 * - 并发去重：同一时刻只允许一个构建
 */
export function buildSnapshot(): Promise<IndexSnapshot> {
  if (state.buildingPromise) return state.buildingPromise
  state.buildingPromise = (async () => {
    try {
      // 1. 词典（必要时首次导入）
      if (!state.dictReady) {
        try {
          await importEcdictIfNeeded()
          state.dictReady = true
          state.dictError = undefined
        } catch (e) {
          state.dictError = String(e instanceof Error ? e.message : e)
          // 词典失败：仍然构建出空快照，shouldHighlight 会全部返回 false
        }
      }

      // 2. 设置 / 用户词
      const [settings, customWords, excludedWords] = await Promise.all([
        getSettings(),
        getCustomWords(),
        getExcludedWords(),
      ])

      // 3. 分级词
      let levelWords: IndexSnapshot['levelWords'] = { A1: [], A2: [], B1: [], B2: [] }
      try {
        levelWords = await loadLevelWords()
      } catch (e) {
        console.warn('[LexiMark] loadLevelWords failed:', e)
      }
      const levelWordMap = flattenLevelMap(levelWords)

      // 4. 高级词
      let advancedWords: string[] = []
      let lemmaPairs: [string, string][] = []
      if (state.dictReady) {
        try {
          advancedWords = await buildAdvancedWordSet(levelWordMap)
        } catch (e) {
          console.warn('[LexiMark] buildAdvancedWordSet failed:', e)
        }
        try {
          const entries = await getAllEntries()
          lemmaPairs = buildLemmaPairs(entries)
        } catch (e) {
          console.warn('[LexiMark] buildLemmaPairs failed:', e)
        }
      }

      // 5. 组装快照
      versionCounter = (versionCounter + 1) | 0
      const snap: IndexSnapshot = {
        version: versionCounter,
        levelWords,
        advancedWords,
        lemmaPairs,
        customWords,
        excludedWords,
        settings,
      }
      state.snapshot = snap
      state.initialized = true
      return snap
    } finally {
      state.buildingPromise = null
    }
  })()
  return state.buildingPromise
}

export async function getSnapshot(): Promise<IndexSnapshot> {
  if (state.initialized && !state.buildingPromise) return state.snapshot
  return buildSnapshot()
}

export function isDictReady(): boolean {
  return state.dictReady
}

export function getDictError(): string | undefined {
  return state.dictError
}

function emptySnapshot(): IndexSnapshot {
  return {
    version: 0,
    levelWords: { A1: [], A2: [], B1: [], B2: [] },
    advancedWords: [],
    lemmaPairs: [],
    customWords: [],
    excludedWords: [],
    settings: { ...defaultSettings },
  }
}
