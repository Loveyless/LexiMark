import { afterEach, describe, expect, it, vi } from 'vitest'

type VoiceListener = () => void

function installSpeechMock(initialVoices: SpeechSynthesisVoice[] = []) {
  const listeners = new Set<VoiceListener>()
  const spoken: SpeechSynthesisUtterance[] = []
  let voices = initialVoices

  class MockUtterance {
    text: string
    lang = ''
    rate = 1
    voice: SpeechSynthesisVoice | null = null

    constructor(text: string) {
      this.text = text
    }
  }

  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
  vi.stubGlobal('window', {
    speechSynthesis: {
      getVoices: vi.fn(() => voices),
      addEventListener: vi.fn((type: string, cb: VoiceListener) => {
        if (type === 'voiceschanged') listeners.add(cb)
      }),
      removeEventListener: vi.fn((type: string, cb: VoiceListener) => {
        if (type === 'voiceschanged') listeners.delete(cb)
      }),
      cancel: vi.fn(),
      speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
        spoken.push(utterance)
      }),
    },
    setTimeout,
    clearTimeout,
  })

  return {
    spoken,
    setVoices(next: SpeechSynthesisVoice[]) {
      voices = next
    },
    fireVoicesChanged() {
      for (const listener of listeners) listener()
    },
  }
}

function makeVoice(voiceURI: string, name = voiceURI): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'en-US',
    localService: true,
    name,
    voiceURI,
  } as SpeechSynthesisVoice
}

describe('speak', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('waits for the selected voice before first playback when voices load asynchronously', async () => {
    const speech = installSpeechMock()
    const selectedVoice = makeVoice('selected-voice')
    const { speak } = await import('./speak')

    speak('hello', {
      speakLang: 'en-US',
      speakRate: 0.9,
      speakVoiceURI: selectedVoice.voiceURI,
    }, true)

    expect(speech.spoken).toHaveLength(0)

    speech.setVoices([selectedVoice])
    speech.fireVoicesChanged()
    await Promise.resolve()

    expect(speech.spoken).toHaveLength(1)
    expect(speech.spoken[0]?.voice).toBe(selectedVoice)
  })

  it('uses an already available selected voice immediately', async () => {
    const selectedVoice = makeVoice('selected-voice')
    const speech = installSpeechMock([selectedVoice])
    const { speak } = await import('./speak')

    speak('hello', {
      speakLang: 'en-US',
      speakRate: 0.9,
      speakVoiceURI: selectedVoice.voiceURI,
    }, true)
    await Promise.resolve()

    expect(speech.spoken).toHaveLength(1)
    expect(speech.spoken[0]?.voice).toBe(selectedVoice)
  })

  it('preloads voices before the first playback', async () => {
    const speech = installSpeechMock()
    const selectedVoice = makeVoice('selected-voice')
    const { preloadSpeechVoices, speak } = await import('./speak')

    preloadSpeechVoices({ speakVoiceURI: selectedVoice.voiceURI })
    speech.setVoices([selectedVoice])
    speech.fireVoicesChanged()
    await Promise.resolve()

    speak('hello', {
      speakLang: 'en-US',
      speakRate: 0.9,
      speakVoiceURI: selectedVoice.voiceURI,
    }, true)
    await Promise.resolve()

    expect(speech.spoken).toHaveLength(1)
    expect(speech.spoken[0]?.voice).toBe(selectedVoice)
  })
})
