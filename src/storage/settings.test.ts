import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings } from './settings'

function mockStoredSettings(settings: unknown) {
  const local = {
    get: vi.fn(async () => ({ settings })),
    set: vi.fn(async () => undefined),
  }
  vi.stubGlobal('chrome', { storage: { local } })
}

describe('subtitle settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses persistent subtitle defaults and preserves the card language preference', async () => {
    mockStoredSettings(undefined)
    const settings = await getSettings()

    expect(settings.enabled).toBe(true)
    expect(settings.userLevel).toBe('A2')
    expect(settings.highlightMode).toBe('text-color')
    expect(settings.preserveTextColor).toBe(true)
    expect(settings.definitionLang).toBe('both')
    expect(settings.subtitlePosition).toBe('below')
    expect(settings.subtitleFontSize).toBe(10)
    expect(settings.subtitleGap).toBe(-4)

    mockStoredSettings({
      enabled: true,
      definitionLang: 'both',
      tooltipFontFamily: 'serif',
      tooltipTextColor: '#aabbcc',
      tooltipOpacity: 0.5,
      tooltipFontSize: 20,
      tooltipDelayMs: 500,
    })
    const migrated = await getSettings()
    expect(migrated.definitionLang).toBe('both')
    expect(migrated).not.toHaveProperty('tooltipFontFamily')
    expect(migrated).not.toHaveProperty('tooltipTextColor')
    expect(migrated).not.toHaveProperty('tooltipOpacity')
    expect(migrated).not.toHaveProperty('tooltipFontSize')
    expect(migrated).not.toHaveProperty('tooltipDelayMs')
  })

  it('clamps subtitle size and spacing', async () => {
    mockStoredSettings({
      subtitleFontSize: 40,
      subtitleGap: -40,
    })
    const settings = await getSettings()

    expect(settings.subtitleFontSize).toBe(24)
    expect(settings.subtitleGap).toBe(-24)
  })

  it('preserves smaller fonts, negative gaps, and the above position', async () => {
    mockStoredSettings({
      subtitlePosition: 'above',
      subtitleFontSize: 4,
      subtitleGap: -8,
    })
    const settings = await getSettings()

    expect(settings.subtitlePosition).toBe('above')
    expect(settings.subtitleFontSize).toBe(4)
    expect(settings.subtitleGap).toBe(-8)
  })

  it('uses below when the saved subtitle position is invalid', async () => {
    mockStoredSettings({ subtitlePosition: 'sideways' })
    const settings = await getSettings()

    expect(settings.subtitlePosition).toBe('below')
  })

  it('preserves the setting to keep the page text color', async () => {
    mockStoredSettings({ preserveTextColor: true })
    const settings = await getSettings()

    expect(settings.preserveTextColor).toBe(true)
  })
})
