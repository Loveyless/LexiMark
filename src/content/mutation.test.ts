import { afterEach, describe, expect, it, vi } from 'vitest'
import { startMutationObserver } from './mutation'

describe('startMutationObserver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('notifies on removed-only mutations so disconnected anchors can be cleaned up', () => {
    vi.useFakeTimers()
    let handleMutations: ((mutations: MutationRecord[]) => void) | undefined

    class MockMutationObserver {
      constructor(callback: (mutations: MutationRecord[]) => void) {
        handleMutations = callback
      }
      observe = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal('MutationObserver', MockMutationObserver)
    vi.stubGlobal('document', { body: {} })
    vi.stubGlobal('window', {
      setTimeout: (callback: () => void) => setTimeout(callback, 0),
      clearTimeout,
    })

    const onChange = vi.fn()
    startMutationObserver(onChange)
    handleMutations?.([
      {
        type: 'childList',
        addedNodes: [] as unknown as NodeList,
        removedNodes: [{}] as unknown as NodeList,
      } as MutationRecord,
    ])

    expect(onChange).not.toHaveBeenCalled()
    vi.runOnlyPendingTimers()
    expect(onChange).toHaveBeenCalledWith([])
  })
})
