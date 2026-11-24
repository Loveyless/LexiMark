import type { DictEntry, Settings, TooltipFontFamily } from '../shared/types'
import { speakAndWait } from '../speech/speak'

/**
 * Subtitle-like definition overlay.
 * It is isolated from page styles and positioned without taking layout space.
 */

const TOOLTIP_HOST_ID = 'leximark-tooltip-host'
const HOVER_SPEECH_LOOP_GAP_MS = 250

const TOOLTIP_CSS = `
:host {
  all: initial;
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
}
.lm-subtitle {
  box-sizing: border-box;
  display: block;
  width: max-content;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 8px);
  overflow: hidden;
  color: var(--lm-tooltip-text-color, #f9fafb);
  font-family: var(--lm-tooltip-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
  font-size: var(--lm-tooltip-font-size, 13px);
  line-height: 1.3;
  text-align: center;
  white-space: pre-line;
  overflow-wrap: anywhere;
  opacity: 0;
  text-shadow: 0 1px 2px rgba(0,0,0,0.95), 1px 0 rgba(0,0,0,0.9), -1px 0 rgba(0,0,0,0.9), 0 -1px rgba(0,0,0,0.9);
  transition: opacity 100ms ease;
}
.lm-subtitle.show { opacity: var(--lm-tooltip-opacity, 1); }

@media (prefers-color-scheme: light) {
  .lm-subtitle {
    color: var(--lm-tooltip-text-color, #111827);
    text-shadow: 0 1px 2px rgba(255,255,255,0.95), 1px 0 rgba(255,255,255,0.9), -1px 0 rgba(255,255,255,0.9), 0 -1px rgba(255,255,255,0.9);
  }
}
`

type AnchorRect = { left: number; right: number; top: number; bottom: number }
type ShowOptions = {
  word: string
  entry: DictEntry | null
  anchorRect: AnchorRect
  settings: Settings
}

let host: HTMLDivElement | null = null
let subtitleEl: HTMLDivElement | null = null
let hideTimer: number | null = null
let currentWord: string | null = null
let speechLoopId = 0
let speechLoopTimer: number | null = null
let speechLoopResolve: (() => void) | null = null

const TOOLTIP_FONT_STACKS: Record<TooltipFontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  sans: 'Arial, Helvetica, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

function ensureMounted(): void {
  if (host) return
  host = document.createElement('div')
  host.id = TOOLTIP_HOST_ID
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = TOOLTIP_CSS
  shadow.appendChild(style)
  subtitleEl = document.createElement('div')
  subtitleEl.className = 'lm-subtitle'
  shadow.appendChild(subtitleEl)
  document.documentElement.appendChild(host)
}

export function showTooltip(opts: ShowOptions): void {
  ensureMounted()
  if (!host || !subtitleEl) return
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  currentWord = opts.word

  subtitleEl.textContent = renderSubtitle(opts.entry, opts.settings)
  applyTooltipSettings(subtitleEl, opts.settings)
  host.style.left = '0px'
  host.style.top = '0px'

  if (subtitleEl.textContent) {
    subtitleEl.classList.add('show')
    const pad = 8
    const gap = 4
    const rect = subtitleEl.getBoundingClientRect()
    const x = (opts.anchorRect.left + opts.anchorRect.right - rect.width) / 2
    const maxX = Math.max(pad, window.innerWidth - rect.width - pad)
    const belowY = opts.anchorRect.bottom + gap
    const maxY = Math.max(pad, window.innerHeight - rect.height - pad)
    host.style.left = `${Math.min(Math.max(pad, x), maxX)}px`
    // Keep the subtitle below the word unless the viewport edge leaves no room.
    host.style.top = `${Math.min(belowY, maxY)}px`
  } else {
    subtitleEl.classList.remove('show')
  }

  if (opts.settings.autoSpeakOnHover) {
    startAutoSpeechLoop(opts.word, opts.settings)
  } else {
    stopAutoSpeechLoop()
  }
}

function applyTooltipSettings(element: HTMLElement, settings: Settings): void {
  element.style.setProperty('--lm-tooltip-font-family', TOOLTIP_FONT_STACKS[settings.tooltipFontFamily])
  element.style.setProperty('--lm-tooltip-opacity', String(settings.tooltipOpacity))
  element.style.setProperty('--lm-tooltip-font-size', `${settings.tooltipFontSize}px`)
  if (settings.tooltipTextColor === 'auto') {
    element.style.removeProperty('--lm-tooltip-text-color')
  } else {
    element.style.setProperty('--lm-tooltip-text-color', settings.tooltipTextColor)
  }
}

function renderSubtitle(entry: DictEntry | null, settings: Settings): string {
  const lines: string[] = []
  if (settings.definitionLang !== 'en' && entry?.translation?.trim()) {
    lines.push(entry.translation.trim())
  }
  if (settings.definitionLang !== 'zh' && entry?.definition?.trim()) {
    lines.push(entry.definition.trim())
  }
  return lines.join('\n')
}

export function scheduleHide(delay = 200): void {
  stopAutoSpeechLoop()
  if (hideTimer != null) clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    hideTimer = null
    currentWord = null
    if (subtitleEl) subtitleEl.classList.remove('show')
  }, delay)
}

export function hideTooltipImmediate(): void {
  stopAutoSpeechLoop()
  if (hideTimer != null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  currentWord = null
  if (subtitleEl) subtitleEl.classList.remove('show')
}

export function getCurrentTooltipWord(): string | null {
  return currentWord
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
