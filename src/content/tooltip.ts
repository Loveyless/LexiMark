import type { DictEntry, Settings } from '../shared/types'
import { speak, speakAndWait } from '../speech/speak'

/**
 * Tooltip / 释义卡片。
 * - 用 Shadow DOM 隔离样式
 * - 全局只有一个实例
 * - hover 300ms 后显示；移出 hover 200ms 后隐藏
 */

const TOOLTIP_HOST_ID = 'leximark-tooltip-host'
const HOVER_SPEECH_LOOP_GAP_MS = 250

const TOOLTIP_CSS = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.lm-card {
  pointer-events: none;
  min-width: 220px;
  max-width: 360px;
  background: #ffffff;
  color: #1f2937;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.18);
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.45;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 120ms ease, transform 120ms ease;
}
.lm-card.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
.lm-card .lm-head { display: flex; align-items: baseline; gap: 8px; }
.lm-card .lm-word { font-size: 15px; font-weight: 600; color: #111827; }
.lm-card .lm-phon { font-size: 12px; color: #6b7280; }
.lm-card .lm-zh { margin-top: 8px; color: #111827; white-space: pre-wrap; }
.lm-card .lm-en { margin-top: 6px; color: #4b5563; font-size: 12px; white-space: pre-wrap; }
.lm-card .lm-actions { display: flex; gap: 8px; margin-top: 10px; }
.lm-card button {
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: #f3f4f6;
  color: #1f2937;
  border: 1px solid rgba(0,0,0,0.08);
}
.lm-card button:hover { background: #e5e7eb; }
.lm-card .lm-empty { color: #9ca3af; }

@media (prefers-color-scheme: dark) {
  .lm-card {
    background: #1f2937;
    color: #e5e7eb;
    border-color: rgba(255,255,255,0.08);
    box-shadow: 0 8px 28px rgba(0,0,0,0.55);
  }
  .lm-card .lm-word { color: #f9fafb; }
  .lm-card .lm-phon { color: #9ca3af; }
  .lm-card .lm-zh { color: #f3f4f6; }
  .lm-card .lm-en { color: #d1d5db; }
  .lm-card button {
    background: #374151;
    color: #f3f4f6;
    border-color: rgba(255,255,255,0.08);
  }
  .lm-card button:hover { background: #4b5563; }
}
`

type Position = { x: number; y: number }
type ShowOptions = {
  word: string
  entry: DictEntry | null
  position: Position
  settings: Settings
  onExclude: (word: string) => void
}

let host: HTMLDivElement | null = null
let shadow: ShadowRoot | null = null
let cardEl: HTMLDivElement | null = null
let hideTimer: number | null = null
let currentWord: string | null = null
let speechLoopId = 0
let speechLoopTimer: number | null = null
let speechLoopResolve: (() => void) | null = null

function ensureMounted(): void {
  if (host) return
  host = document.createElement('div')
  host.id = TOOLTIP_HOST_ID
  shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = TOOLTIP_CSS
  shadow.appendChild(style)
  cardEl = document.createElement('div')
  cardEl.className = 'lm-card'
  shadow.appendChild(cardEl)
  document.documentElement.appendChild(host)

  // hover 卡片本身：取消隐藏
  cardEl.addEventListener('mouseenter', () => {
    if (hideTimer != null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  })
  cardEl.addEventListener('mouseleave', () => {
    scheduleHide(200)
  })
}

export function showTooltip(opts: ShowOptions): void {
  ensureMounted()
  if (!host || !cardEl) return
  currentWord = opts.word

  cardEl.innerHTML = renderCard(opts.word, opts.entry, opts.settings)
  bindActions(opts)

  // 位置
  const pad = 12
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 先临时显示一次以拿到尺寸
  cardEl.classList.add('show')
  host.style.left = '0px'
  host.style.top = '0px'
  const rect = cardEl.getBoundingClientRect()
  let x = opts.position.x + pad
  let y = opts.position.y + pad
  if (x + rect.width + pad > vw) x = Math.max(pad, opts.position.x - rect.width - pad)
  if (y + rect.height + pad > vh) y = Math.max(pad, opts.position.y - rect.height - pad)
  host.style.left = `${x}px`
  host.style.top = `${y}px`

  if (opts.settings.autoSpeakOnHover) {
    startAutoSpeechLoop(opts.word, opts.settings)
  } else {
    stopAutoSpeechLoop()
  }
}

export function scheduleHide(delay = 200): void {
  stopAutoSpeechLoop()
  if (hideTimer != null) clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    hideTimer = null
    currentWord = null
    if (cardEl) cardEl.classList.remove('show')
  }, delay)
}

export function hideTooltipImmediate(): void {
  stopAutoSpeechLoop()
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  currentWord = null
  if (cardEl) cardEl.classList.remove('show')
}

export function getCurrentTooltipWord(): string | null {
  return currentWord
}

function renderCard(word: string, entry: DictEntry | null, settings: Settings): string {
  const phon = entry?.phonetic ? `<span class="lm-phon">/${escapeHtml(entry.phonetic)}/</span>` : ''
  const showZh = settings.definitionLang === 'zh' || settings.definitionLang === 'both'
  const showEn = settings.definitionLang === 'en' || settings.definitionLang === 'both'
  const zh = showZh && entry?.translation
    ? `<div class="lm-zh">${escapeHtml(entry.translation)}</div>`
    : ''
  const en = showEn && entry?.definition
    ? `<div class="lm-en">${escapeHtml(entry.definition)}</div>`
    : ''
  const empty = !entry || (!entry.translation && !entry.definition)
    ? `<div class="lm-empty">（暂无释义）</div>`
    : ''
  return `
    <div class="lm-head">
      <span class="lm-word">${escapeHtml(word)}</span>
      ${phon}
    </div>
    ${zh}${en}${empty}
    <div class="lm-actions">
      <button data-act="speak" type="button">🔊 发音</button>
      <button data-act="exclude" type="button">不再提示</button>
    </div>
  `
}

function bindActions(opts: ShowOptions): void {
  if (!cardEl) return
  cardEl.querySelector<HTMLButtonElement>('[data-act="speak"]')?.addEventListener('click', () => {
    if (opts.settings.autoSpeakOnHover) {
      startAutoSpeechLoop(opts.word, opts.settings)
      return
    }
    stopAutoSpeechLoop()
    speak(opts.word, opts.settings, true)
  })
  cardEl.querySelector<HTMLButtonElement>('[data-act="exclude"]')?.addEventListener('click', () => {
    opts.onExclude(opts.word)
    hideTooltipImmediate()
  })
}

function startAutoSpeechLoop(word: string, settings: Settings): void {
  stopAutoSpeechLoop()
  const loopId = ++speechLoopId
  const speechSettings = {
    speakLang: settings.speakLang,
    speakRate: settings.speakRate,
    speakVoiceURI: settings.speakVoiceURI,
  }

  const loop = async () => {
    while (loopId === speechLoopId && currentWord === word) {
      const result = await speakAndWait(word, speechSettings, true)
      if (loopId !== speechLoopId || currentWord !== word) return
      if (result === 'skipped' || result === 'error') return
      await waitForSpeechLoopGap(loopId)
    }
  }

  void loop()
}

function stopAutoSpeechLoop(): void {
  speechLoopId++
  if (speechLoopTimer != null) {
    clearTimeout(speechLoopTimer)
    speechLoopTimer = null
  }
  if (speechLoopResolve) {
    speechLoopResolve()
    speechLoopResolve = null
  }
}

function waitForSpeechLoopGap(loopId: number): Promise<void> {
  return new Promise((resolve) => {
    speechLoopResolve = () => {
      speechLoopResolve = null
      resolve()
    }
    speechLoopTimer = window.setTimeout(() => {
      if (speechLoopTimer != null && loopId === speechLoopId) {
        speechLoopTimer = null
      }
      speechLoopResolve = null
      resolve()
    }, HOVER_SPEECH_LOOP_GAP_MS)
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
