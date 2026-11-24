import { useEffect, useState } from 'react'
import { useSettings } from '../../src/ui/useSettings'
import { isHostDisabled, toggleHostInList } from '../../src/storage/sites'
import { Switch } from '../../src/ui/controls'

export default function App() {
  const { settings, update, loading } = useSettings()
  const [host, setHost] = useState<string>('')

  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }).then((tabs) => {
      const url = tabs[0]?.url
      if (!url) return
      try {
        const u = new URL(url)
        setHost(u.host)
      } catch {
        setHost('')
      }
    })
  }, [])

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-stone-500 dark:text-stone-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
        加载中…
      </div>
    )
  }

  const siteDisabled = !!host && isHostDisabled(host, settings.disabledSites)

  return (
    <div className="bg-[#FFFDF7] text-stone-900 dark:bg-[#0C0A09] dark:text-stone-100">
      <header className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/icon/32.png" alt="" className="h-8 w-8 drop-shadow-sm" />
            <div>
              <div className="text-[15px] font-semibold tracking-tight">LexiMark</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                英语生词高亮
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}
            className="rounded-md px-1.5 py-1 text-[11px] font-medium text-brand-700 transition hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-950/50"
          >
            设置 →
          </button>
        </div>
      </header>

      <div className="space-y-3 border-t border-stone-200/70 px-4 py-3 text-sm dark:border-stone-800">
        <Row label="总开关" desc={settings.enabled ? '已启用' : '已停用'}>
          <Switch
            checked={settings.enabled}
            onChange={(enabled) => update({ enabled })}
            label="总开关"
          />
        </Row>

        <Row
          label="当前网站"
          desc={host ? (siteDisabled ? `已在 ${host} 关闭` : host) : '当前页不可用'}
        >
          <Switch
            checked={!!host && !siteDisabled}
            disabled={!host}
            onChange={() => {
              if (!host) return
              const next = toggleHostInList(host, settings.disabledSites)
              update({ disabledSites: next })
            }}
            label="当前网站"
          />
        </Row>

        <Row
          label="hover 自动朗读"
          desc={settings.autoSpeakOnHover ? '悬停时自动发音' : '点按钮才发音'}
        >
          <Switch
            checked={settings.autoSpeakOnHover}
            onChange={(autoSpeakOnHover) => update({ autoSpeakOnHover })}
            label="hover 自动朗读"
          />
        </Row>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-0.5 text-[10px] font-medium text-stone-500 dark:text-stone-400">
          <span className="text-stone-400 dark:text-stone-500">当前</span>
          <span>{settings.userLevel}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span>{settings.includeCurrentLevel ? '含本级' : '仅更高等级'}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span>{settings.highlightAdvancedUnknownWords ? '含 B2+' : '不含 B2+'}</span>
        </div>
      </div>
    </div>
  )
}

function Row(props: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{props.label}</div>
        {props.desc && (
          <div className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400">
            {props.desc}
          </div>
        )}
      </div>
      <div className="shrink-0">{props.children}</div>
    </div>
  )
}
