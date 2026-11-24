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
    expect(settings.definitionLang).toBe('both')
    expect(settings.subtitleFontSize).toBe(12)
    expect(settings.subtitleGap).toBe(2)

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
      subtitleGap: -20,
    })
    const settings = await getSettings()

    expect(settings.subtitleFontSize).toBe(24)
    expect(settings.subtitleGap).toBe(0)
  })

  it('preserves supported subtitle values', async () => {
    mockStoredSettings({
      subtitleFontSize: 18,
      subtitleGap: 10,
    })
    const settings = await getSettings()

    expect(settings.subtitleFontSize).toBe(18)
    expect(settings.subtitleGap).toBe(10)
  })
})
