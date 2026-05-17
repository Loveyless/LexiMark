import {
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_CUSTOM_WORDS,
  STORAGE_KEY_EXCLUDED_WORDS,
  STORAGE_KEY_DICT_META,
  HIGHLIGHT_MODE_OPTIONS,
  DEFAULT_HIGHLIGHT_COLOR,
  defaultSettings,
} from '../shared/constants'
import type { DictMeta, HighlightMode, Settings } from '../shared/types'

/**
 * chrome.storage.local 的轻封装。
 * - 所有读写都走小写词、字符串数组
 * - 写自定义/排除词时整组覆盖（DESIGN §7.1：预期规模下性能足够）
 */

export async function getSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(STORAGE_KEY_SETTINGS)
  const raw = got[STORAGE_KEY_SETTINGS]
  return mergeSettings(raw)
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings()
  const next = normalizeSettings({ ...cur, ...patch })
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: next })
  return next
}

export async function resetSettings(): Promise<Settings> {
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: defaultSettings })
  return defaultSettings
}

export async function getCustomWords(): Promise<string[]> {
  const got = await chrome.storage.local.get(STORAGE_KEY_CUSTOM_WORDS)
  return normalizeWordList(got[STORAGE_KEY_CUSTOM_WORDS])
}

export async function setCustomWords(words: string[]): Promise<string[]> {
  const cleaned = normalizeWordList(words)
  await chrome.storage.local.set({ [STORAGE_KEY_CUSTOM_WORDS]: cleaned })
  return cleaned
}

export async function addCustomWord(word: string): Promise<string[]> {
  const list = await getCustomWords()
  const w = word.trim().toLowerCase()
  if (!w || list.includes(w)) return list
  const next = [...list, w]
  return setCustomWords(next)
}

export async function removeCustomWord(word: string): Promise<string[]> {
  const list = await getCustomWords()
  const w = word.trim().toLowerCase()
  return setCustomWords(list.filter((x) => x !== w))
}

export async function getExcludedWords(): Promise<string[]> {
  const got = await chrome.storage.local.get(STORAGE_KEY_EXCLUDED_WORDS)
  return normalizeWordList(got[STORAGE_KEY_EXCLUDED_WORDS])
}

export async function setExcludedWords(words: string[]): Promise<string[]> {
  const cleaned = normalizeWordList(words)
  await chrome.storage.local.set({ [STORAGE_KEY_EXCLUDED_WORDS]: cleaned })
  return cleaned
}

export async function addExcludedWord(word: string): Promise<string[]> {
  const list = await getExcludedWords()
  const w = word.trim().toLowerCase()
  if (!w || list.includes(w)) return list
  const next = [...list, w]
  return setExcludedWords(next)
}

export async function removeExcludedWord(word: string): Promise<string[]> {
  const list = await getExcludedWords()
  const w = word.trim().toLowerCase()
  return setExcludedWords(list.filter((x) => x !== w))
}

export async function getDictMeta(): Promise<DictMeta | null> {
  const got = await chrome.storage.local.get(STORAGE_KEY_DICT_META)
  const raw = got[STORAGE_KEY_DICT_META]
  if (!raw || typeof raw !== 'object') return null
  return raw as DictMeta
}

export async function setDictMeta(meta: DictMeta): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_DICT_META]: meta })
}

// ============ helpers ============

function mergeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return { ...defaultSettings }
  const partial = raw as Partial<Settings>
  return normalizeSettings({ ...defaultSettings, ...partial })
}

function normalizeSettings(settings: Partial<Settings>): Settings {
  const merged: Settings = { ...defaultSettings, ...settings }
  // 范围保护
  if (typeof merged.speakRate !== 'number' || !Number.isFinite(merged.speakRate)) {
    merged.speakRate = defaultSettings.speakRate
  }
  merged.speakRate = Math.min(Math.max(merged.speakRate, 0.5), 1.5)
  merged.highlightMode = normalizeHighlightMode((settings as { highlightMode?: unknown }).highlightMode)
  merged.highlightColor = normalizeHighlightColor((settings as { highlightColor?: unknown }).highlightColor)
  if (typeof merged.speakVoiceURI !== 'string') merged.speakVoiceURI = ''
  if (!Array.isArray(merged.disabledSites)) merged.disabledSites = []
  return merged
}

function normalizeHighlightMode(raw: unknown): HighlightMode {
  if (raw === 'wavy-underline') return 'dashed-underline'
  if (raw === 'background') return 'text-color'
  if (
    typeof raw === 'string' &&
    HIGHLIGHT_MODE_OPTIONS.some((option) => option.value === raw)
  ) {
    return raw as HighlightMode
  }
  return defaultSettings.highlightMode
}

function normalizeHighlightColor(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_HIGHLIGHT_COLOR
  const value = raw.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return DEFAULT_HIGHLIGHT_COLOR
  return value.toLowerCase()
}

function normalizeWordList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const set = new Set<string>()
  for (const it of raw) {
    if (typeof it !== 'string') continue
    const w = it.trim().toLowerCase()
    if (w) set.add(w)
  }
  return Array.from(set)
}
