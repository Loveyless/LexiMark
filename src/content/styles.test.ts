import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyHighlightStyle, HIGHLIGHT_CSS } from './styles'

describe('applyHighlightStyle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the page text color only in text-color mode when enabled', () => {
    const attributes = new Map<string, string>()
    const root = {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      style: { setProperty: vi.fn() },
    }
    vi.stubGlobal('document', { documentElement: root })

    applyHighlightStyle({
      highlightMode: 'text-color',
      highlightColor: '#dc2626',
      preserveTextColor: true,
    })
    expect(attributes.get('data-leximark-preserve-text-color')).toBe('true')

    applyHighlightStyle({
      highlightMode: 'underline',
      highlightColor: '#dc2626',
      preserveTextColor: true,
    })
    expect(attributes.has('data-leximark-preserve-text-color')).toBe(false)
  })

  it('does not apply a text color while preservation is enabled', () => {
    expect(HIGHLIGHT_CSS).toContain(
      'data-leximark-mode="text-color"]:not([data-leximark-preserve-text-color="true"])',
    )
  })
})
