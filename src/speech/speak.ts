import { SPEECH_REPEAT_MS } from '../shared/constants'
import type { Settings } from '../shared/types'

const lastSpoken = new Map<string, number>()
const SELECTED_VOICE_WAIT_MS = 1200

let voicesCache: SpeechSynthesisVoice[] = []
let voicesBound = false
let speakRequestId = 0

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

/** 页面启动时预热浏览器 voice 列表，降低首次朗读落到默认 voice 的概率。 */
export function preloadSpeechVoices(
  settings: Pick<Settings, 'speakVoiceURI'>,
): void {
  getVoices()
  if (settings.speakVoiceURI) {
    void waitForSelectedVoice(settings.speakVoiceURI)
  }
}

function pickVoice(uri: string): SpeechSynthesisVoice | undefined {
  if (!uri) return undefined
  const voices = getVoices()
  if (voices.length === 0) return undefined
  return voices.find((v) => v.voiceURI === uri)
}

function waitForSelectedVoice(uri: string): Promise<SpeechSynthesisVoice | undefined> {
  if (!uri || typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve(undefined)
  }

  const immediate = pickVoice(uri)
  if (immediate) return Promise.resolve(immediate)

  return new Promise((resolve) => {
    let done = false
    let timer: number | undefined

    const cleanup = () => {
      if (timer != null) window.clearTimeout(timer)
      window.speechSynthesis.removeEventListener?.('voiceschanged', check)
    }

    const finish = (voice: SpeechSynthesisVoice | undefined) => {
      if (done) return
      done = true
      cleanup()
      resolve(voice)
    }

    const check = () => {
      const voice = pickVoice(uri)
      if (voice) finish(voice)
    }

    window.speechSynthesis.addEventListener?.('voiceschanged', check)
    timer = window.setTimeout(() => finish(pickVoice(uri)), SELECTED_VOICE_WAIT_MS)
    check()
  })
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
  void speakAsync(word, settings, force)
}

async function speakAsync(
  word: string,
  settings: Pick<Settings, 'speakLang' | 'speakRate' | 'speakVoiceURI'>,
  force: boolean,
): Promise<void> {
  if (!word) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const key = word.toLowerCase()
  const now = Date.now()
  if (!force) {
    const last = lastSpoken.get(key) ?? 0
    if (now - last < SPEECH_REPEAT_MS) return
  }
  lastSpoken.set(key, now)
  const requestId = ++speakRequestId
  try {
    window.speechSynthesis.cancel()
    const voice = await waitForSelectedVoice(settings.speakVoiceURI ?? '')
    if (requestId !== speakRequestId) return
    const u = new SpeechSynthesisUtterance(word)
    const lang = settings.speakLang ?? 'en-US'
    u.lang = lang
    const rate = typeof settings.speakRate === 'number' ? settings.speakRate : 0.9
    u.rate = Math.min(Math.max(rate, 0.5), 1.5)
    if (voice) u.voice = voice
    window.speechSynthesis.speak(u)
  } catch (e) {
    console.warn('[LexiMark] speak failed:', e)
  }
}

export function clearSpeechCache(): void {
  lastSpoken.clear()
  speakRequestId++
}
