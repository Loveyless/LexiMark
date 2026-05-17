import { SPEECH_REPEAT_MS } from '../shared/constants'
import type { Settings } from '../shared/types'

const lastSpoken = new Map<string, number>()

let voicesCache: SpeechSynthesisVoice[] = []
let voicesBound = false

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  if (!voicesBound) {
    voicesBound = true
    voicesCache = window.speechSynthesis.getVoices()
    // Chrome 首次调用常常返回空，等 voiceschanged
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      voicesCache = window.speechSynthesis.getVoices()
    })
  } else if (voicesCache.length === 0) {
    voicesCache = window.speechSynthesis.getVoices()
  }
  return voicesCache
}

/** 暴露给 UI：当前可用 voice 列表。返回前会触发懒加载。 */
export function listVoices(): SpeechSynthesisVoice[] {
  return getVoices()
}

/** UI 订阅 voice 列表变化（getVoices 异步初始化）。返回取消函数。 */
export function onVoicesChanged(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return () => {}
  const handler = () => cb()
  window.speechSynthesis.addEventListener?.('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', handler)
}

function pickVoice(uri: string): SpeechSynthesisVoice | undefined {
  const voices = getVoices()
  if (voices.length === 0) return undefined
  if (uri) {
    const hit = voices.find((v) => v.voiceURI === uri)
    if (hit) return hit
    // 找不到 URI 时不强行 fallback 到任意 voice，交给浏览器按 lang 选默认
  }
  return undefined
}

/**
 * Web Speech API 朗读单个英文词（PRD §11）。
 * - 同词 SPEECH_REPEAT_MS 内不重复
 * - 默认 en-US / 美音 / 0.9 语速
 * - force=true 时跳过节流（用户点发音按钮）
 */
export function speak(
  word: string,
  settings: Pick<Settings, 'speakLang' | 'speakRate' | 'speakVoiceURI'>,
  force = false,
): void {
  if (!word) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const key = word.toLowerCase()
  const now = Date.now()
  if (!force) {
    const last = lastSpoken.get(key) ?? 0
    if (now - last < SPEECH_REPEAT_MS) return
  }
  lastSpoken.set(key, now)
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    const lang = settings.speakLang ?? 'en-US'
    u.lang = lang
    const rate = typeof settings.speakRate === 'number' ? settings.speakRate : 0.9
    u.rate = Math.min(Math.max(rate, 0.5), 1.5)
    const v = pickVoice(settings.speakVoiceURI ?? '')
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  } catch (e) {
    console.warn('[LexiMark] speak failed:', e)
  }
}

export function clearSpeechCache(): void {
  lastSpoken.clear()
}
