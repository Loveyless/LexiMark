import type { Settings } from '../shared/types'

/**
 * 高亮 span 的样式（PRD §9）。
 *
 * 设计要点：
 *  - `:where(.leximark-hl)` 零特异性，最大程度避免被网页样式覆盖
 *  - 颜色用 CSS 变量，由设置页控制
 *  - 显式覆盖 text-decoration-color，避免继承网页色
 *  - 不强制使用 !important
 *  - 模式切换通过 documentElement 上的 data-leximark-mode
 */
export const HIGHLIGHT_CSS = `
:root {
  --leximark-color: #4d4d4d;
}

:where(.leximark-hl) {
  text-decoration-line: none;
  text-decoration-color: var(--leximark-color);
  background-color: transparent;
  color: inherit;
  cursor: help;
}

html[data-leximark-mode="underline"] :where(.leximark-hl) {
  text-decoration-line: underline;
  text-decoration-style: solid;
  text-decoration-color: var(--leximark-color);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
html[data-leximark-mode="dashed-underline"] :where(.leximark-hl) {
  text-decoration-line: underline;
  text-decoration-style: dashed;
  text-decoration-color: var(--leximark-color);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
html[data-leximark-mode="text-color"] :where(.leximark-hl) {
  color: var(--leximark-color);
}
`

let injected = false

export function injectHighlightCss(): void {
  if (injected) return
  if (typeof document === 'undefined') return
  const style = document.createElement('style')
  style.id = 'leximark-styles'
  style.textContent = HIGHLIGHT_CSS
  document.documentElement.appendChild(style)
  injected = true
}

export function applyHighlightStyle(settings: Pick<Settings, 'highlightMode' | 'highlightColor'>): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-leximark-mode', settings.highlightMode)
  document.documentElement.style.setProperty('--leximark-color', settings.highlightColor)
}
