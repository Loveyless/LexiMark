import type { DictEntry, Settings } from '../shared/types'
import { HIGHLIGHT_WORD_ATTR } from '../shared/constants'

const SUBTITLE_HOST_ID = 'leximark-subtitles-host'
const QUERY_BATCH_SIZE = 100
const SUBTITLE_CSS = `
:host {
  all: initial;
  position: fixed;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: 2147483645;
  pointer-events: none;
}
.lm-caption {
  position: fixed;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: max-content;
  max-width: min(260px, calc(100vw - 16px));
  color: #f9fafb;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.2;
  text-align: center;
  white-space: normal;
  overflow-wrap: anywhere;
  pointer-events: none;
  text-shadow: 0 1px 2px rgba(0,0,0,0.95), 1px 0 rgba(0,0,0,0.9), -1px 0 rgba(0,0,0,0.9), 0 -1px rgba(0,0,0,0.9);
}
@media (prefers-color-scheme: light) {
  .lm-caption {
    color: #111827;
    text-shadow: 0 1px 2px rgba(255,255,255,0.95), 1px 0 rgba(255,255,255,0.9), -1px 0 rgba(255,255,255,0.9), 0 -1px rgba(255,255,255,0.9);
  }
}
`

type Caption = {
  element: HTMLSpanElement
  wordRect: DOMRect
  width: number
}

let host: HTMLDivElement | null = null
let root: ShadowRoot | null = null
let observer: IntersectionObserver | null = null
let observerSupported: boolean | null = null
let settings: Settings | null = null
let listenersInstalled = false
let lookupTimer: number | null = null
let layoutFrame: number | null = null

const trackedAnchors = new Set<HTMLSpanElement>()
const visibleAnchors = new Set<HTMLSpanElement>()
const captions = new Map<HTMLSpanElement, HTMLSpanElement>()
const translations = new Map<string, string | null>()
const pendingAnchors = new Map<string, Set<HTMLSpanElement>>()
const wordsInFlight = new Set<string>()

export function configureSubtitles(nextSettings: Settings): void {
  settings = nextSettings
  ensureLayer()
  for (const caption of captions.values()) {
    caption.style.fontSize = `${settings.subtitleFontSize}px`
  }
  scheduleLayout()
}

export function observeSubtitles(anchors: HTMLSpanElement[]): void {
  if (anchors.length === 0) return
  ensureLayer()
  for (const anchor of anchors) {
    if (!anchor.isConnected || trackedAnchors.has(anchor)) continue
    trackedAnchors.add(anchor)
    if (observer) {
      observer.observe(anchor)
    } else {
      scheduleLayout()
    }
  }
}

export function cleanupDisconnectedSubtitles(): void {
  for (const anchor of trackedAnchors) {
    if (anchor.isConnected) continue
    observer?.unobserve(anchor)
    trackedAnchors.delete(anchor)
    visibleAnchors.delete(anchor)
    removeCaption(anchor)
  }
  scheduleLayout()
}

export function clearSubtitles(): void {
  observer?.disconnect()
  observer = null
  for (const caption of captions.values()) caption.remove()
  trackedAnchors.clear()
  visibleAnchors.clear()
  captions.clear()
  pendingAnchors.clear()
  if (lookupTimer != null) {
    clearTimeout(lookupTimer)
    lookupTimer = null
  }
  if (layoutFrame != null) {
    cancelAnimationFrame(layoutFrame)
    layoutFrame = null
  }
}

export function firstTranslationMeaning(translation?: string): string {
  if (!translation) return ''
  for (const line of translation.split(/[\r\n]+/)) {
    const parts = line.split(/[,，;；]/)
    for (const part of parts) {
      const meaning = part
        .trim()
        .replace(/^[a-z]+\.\s*/i, '')
        .replace(/^\[[^\]]+\]\s*/, '')
        .trim()
      if (meaning) return meaning
    }
  }
  return ''
}

function ensureLayer(): void {
  if (!host) {
    host = document.createElement('div')
    host.id = SUBTITLE_HOST_ID
    root = host.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')
    style.textContent = SUBTITLE_CSS
    root.appendChild(style)
    document.documentElement.appendChild(host)
  }

  if (observerSupported == null) {
    observerSupported = typeof IntersectionObserver !== 'undefined'
  }
  if (observerSupported && !observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const anchor = entry.target as HTMLSpanElement
        if (!trackedAnchors.has(anchor)) continue
        if (entry.isIntersecting) {
          activateAnchor(anchor)
        } else {
          visibleAnchors.delete(anchor)
          removeCaption(anchor)
        }
      }
      scheduleLayout()
    })
  }

  if (!listenersInstalled) {
    window.addEventListener('scroll', scheduleLayout, { capture: true, passive: true })
    window.addEventListener('resize', scheduleLayout, { passive: true })
    listenersInstalled = true
  }
}

function activateAnchor(anchor: HTMLSpanElement): void {
  visibleAnchors.add(anchor)
  const word = anchor.getAttribute(HIGHLIGHT_WORD_ATTR)
  if (!word) return
  if (translations.has(word)) {
    const translation = translations.get(word)
    if (translation) createCaption(anchor, translation)
    scheduleLayout()
    return
  }
  let anchors = pendingAnchors.get(word)
  if (!anchors) {
    anchors = new Set()
    pendingAnchors.set(word, anchors)
  }
  anchors.add(anchor)
  if (!wordsInFlight.has(word)) scheduleLookup()
}

function scheduleLookup(): void {
  if (lookupTimer != null) return
  lookupTimer = window.setTimeout(() => {
    lookupTimer = null
    const words = [...pendingAnchors.keys()]
      .filter((word) => !wordsInFlight.has(word))
      .slice(0, QUERY_BATCH_SIZE)
    if (words.length === 0) return
    for (const word of words) wordsInFlight.add(word)
    void fetchTranslations(words)
  }, 0)
}

async function fetchTranslations(words: string[]): Promise<void> {
  let entries: DictEntry[] = []
  try {
    const response = await chrome.runtime.sendMessage({ type: 'LM_QUERY_ENTRIES', words })
    entries = (response as { entries?: DictEntry[] })?.entries ?? []
  } catch (error) {
    console.warn('[LexiMark] subtitle lookup failed:', error)
  }

  const byWord = new Map(entries.map((entry) => [entry.word.toLowerCase(), entry]))
  for (const word of words) {
    wordsInFlight.delete(word)
    const translation = firstTranslationMeaning(byWord.get(word)?.translation)
    translations.set(word, translation || null)
    const anchors = pendingAnchors.get(word)
    pendingAnchors.delete(word)
    if (!translation || !anchors) continue
    for (const anchor of anchors) {
      if (anchor.isConnected && visibleAnchors.has(anchor)) createCaption(anchor, translation)
    }
  }
  scheduleLayout()
  if ([...pendingAnchors.keys()].some((word) => !wordsInFlight.has(word))) scheduleLookup()
}

function createCaption(anchor: HTMLSpanElement, text: string): void {
  if (!root || captions.has(anchor)) return
  const caption = document.createElement('span')
  caption.className = 'lm-caption'
  caption.textContent = text
  caption.style.fontSize = `${settings?.subtitleFontSize ?? 12}px`
  root.appendChild(caption)
  captions.set(anchor, caption)
}

function removeCaption(anchor: HTMLSpanElement): void {
  captions.get(anchor)?.remove()
  captions.delete(anchor)
}

function scheduleLayout(): void {
  if (!host || layoutFrame != null) return
  if (!observerSupported) updateFallbackVisibility()
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = null
    layoutCaptions()
  })
}

function updateFallbackVisibility(): void {
  for (const anchor of trackedAnchors) {
    const rect = anchor.getBoundingClientRect()
    const isVisible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
    if (isVisible && !visibleAnchors.has(anchor)) {
      activateAnchor(anchor)
    } else if (!isVisible && visibleAnchors.has(anchor)) {
      visibleAnchors.delete(anchor)
      removeCaption(anchor)
    }
  }
}

function layoutCaptions(): void {
  if (!settings) return
  const items: Caption[] = []
  for (const anchor of visibleAnchors) {
    const element = captions.get(anchor)
    if (!anchor.isConnected || !element) continue
    const wordRect = anchor.getBoundingClientRect()
    if (wordRect.width === 0 || wordRect.height === 0) continue
    const rect = element.getBoundingClientRect()
    items.push({
      element,
      wordRect,
      width: rect.width,
    })
  }

  const pad = 8
  for (const item of items) {
    const centered = (item.wordRect.left + item.wordRect.right - item.width) / 2
    const left = Math.min(Math.max(pad, centered), Math.max(pad, window.innerWidth - item.width - pad))
    item.element.style.left = `${left}px`
    const top = settings.subtitlePosition === 'above'
      ? item.wordRect.top - item.element.getBoundingClientRect().height - settings.subtitleGap
      : item.wordRect.bottom + settings.subtitleGap
    item.element.style.top = `${top}px`
  }
}
