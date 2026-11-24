import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSettings } from './settings'

function mockStoredSettings(settings: unknown) {
  const local = {
    get: vi.fn(async () => ({ settings })),
    set: vi.fn(async () => undefined),
  }
  vi.stubGlobal('chrome', { storage: { local } })
}

describe('tooltip settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses default tooltip preferences for new and existing installs', async () => {
    mockStoredSettings(undefined)
    const settings = await getSettings()

    expect(settings.enabled).toBe(true)
    expect(settings.definitionLang).toBe('zh')
    expect(settings.tooltipFontFamily).toBe('system')
    expect(settings.tooltipTextColor).toBe('auto')
    expect(settings.tooltipOpacity).toBe(1)
    expect(settings.tooltipFontSize).toBe(13)
    expect(settings.tooltipDelayMs).toBe(300)

    mockStoredSettings({ enabled: true, definitionLang: 'both' })
    const migrated = await getSettings()
    expect(migrated.definitionLang).toBe('both')
    expect(migrated.tooltipDelayMs).toBe(300)
  })

  it('clamps numeric values and replaces invalid font and color values', async () => {
    mockStoredSettings({
      tooltipFontFamily: 'comic-sans',
      tooltipTextColor: 'red',
      tooltipOpacity: 5,
      tooltipFontSize: 40,
      tooltipDelayMs: -20,
    })
    const settings = await getSettings()

    expect(settings.tooltipFontFamily).toBe('system')
    expect(settings.tooltipTextColor).toBe('auto')
    expect(settings.tooltipOpacity).toBe(1)
    expect(settings.tooltipFontSize).toBe(24)
    expect(settings.tooltipDelayMs).toBe(0)
  })

  it('preserves supported custom values', async () => {
    mockStoredSettings({
      tooltipFontFamily: 'serif',
      tooltipTextColor: '#AABBCC',
      tooltipOpacity: 0.65,
      tooltipFontSize: 18,
      tooltipDelayMs: 450,
    })
    const settings = await getSettings()

    expect(settings.tooltipFontFamily).toBe('serif')
    expect(settings.tooltipTextColor).toBe('#aabbcc')
    expect(settings.tooltipOpacity).toBe(0.65)
    expect(settings.tooltipFontSize).toBe(18)
    expect(settings.tooltipDelayMs).toBe(450)
  })
})
