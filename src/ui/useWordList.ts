import { useEffect, useState, useCallback } from 'react'

/**
 * 监听 chrome.storage 中的一个字符串数组 key，提供 add/remove/setAll API。
 */
export function useWordList(key: 'customWords' | 'excludedWords'): {
  words: string[]
  loading: boolean
  add: (w: string) => Promise<void>
  addMany: (items: string[]) => Promise<void>
  remove: (w: string) => Promise<void>
  setAll: (next: string[]) => Promise<void>
} {
  const [words, setWords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    chrome.storage.local.get(key).then((got) => {
      if (!alive) return
      const raw = got[key]
      const list = Array.isArray(raw) ? (raw.filter((x) => typeof x === 'string') as string[]) : []
      setWords(list)
      setLoading(false)
    })
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return
      if (key in changes) {
        const v = changes[key]?.newValue
        if (Array.isArray(v)) setWords(v.filter((x) => typeof x === 'string') as string[])
      }
    }
    chrome.storage.onChanged.addListener(handler)
    return () => {
      alive = false
      chrome.storage.onChanged.removeListener(handler)
    }
  }, [key])

  const persist = useCallback(
    async (next: string[]) => {
      const cleaned = Array.from(new Set(next.map((w) => w.trim().toLowerCase()).filter(Boolean)))
      await chrome.storage.local.set({ [key]: cleaned })
      setWords(cleaned)
    },
    [key],
  )

  return {
    words,
    loading,
    add: async (w) => {
      const cur = await getCurrent(key)
      await persist([...cur, w])
    },
    addMany: async (items) => {
      const cur = await getCurrent(key)
      await persist([...cur, ...items])
    },
    remove: async (w) => {
      const cur = await getCurrent(key)
      const target = w.trim().toLowerCase()
      await persist(cur.filter((x) => x !== target))
    },
    setAll: persist,
  }
}

async function getCurrent(key: string): Promise<string[]> {
  const got = await chrome.storage.local.get(key)
  const raw = got[key]
  return Array.isArray(raw) ? (raw.filter((x) => typeof x === 'string') as string[]) : []
}
