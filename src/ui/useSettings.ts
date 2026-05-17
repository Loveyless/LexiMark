import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'
import {
  getSettings,
  setSettings,
} from '../storage/settings'

/**
 * 监听 chrome.storage 的 settings key，提供响应式的 settings hook。
 * - 适合 popup / options 页面共享
 */
export function useSettings(): {
  settings: Settings | null
  update: (patch: Partial<Settings>) => Promise<void>
  loading: boolean
} {
  const [settings, setSt] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getSettings().then((s) => {
      if (!alive) return
      setSt(s)
      setLoading(false)
    })
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return
      if ('settings' in changes) {
        const next = changes.settings?.newValue as Settings | undefined
        if (next) setSt(next)
      }
    }
    chrome.storage.onChanged.addListener(handler)
    return () => {
      alive = false
      chrome.storage.onChanged.removeListener(handler)
    }
  }, [])

  return {
    settings,
    loading,
    update: async (patch) => {
      const next = await setSettings(patch)
      setSt(next)
    },
  }
}
