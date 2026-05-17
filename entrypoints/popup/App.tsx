import { useEffect, useState } from 'react'
import { useSettings } from '../../src/ui/useSettings'
import { isHostDisabled, toggleHostInList } from '../../src/storage/sites'

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
      <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
        加载中…
      </div>
    )
  }

  const siteDisabled = !!host && isHostDisabled(host, settings.disabledSites)

  return (
    <div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <header className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">LexiMark</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              英语生词高亮
            </div>
          </div>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            设置 →
          </button>
        </div>
      </header>

      <div className="p-4 space-y-3 text-sm">
        <Row
          label="总开关"
          desc={settings.enabled ? '已启用' : '已停用'}
        >
          <Toggle
            checked={settings.enabled}
            onChange={(v) => update({ enabled: v })}
          />
        </Row>

        <Row
          label="当前网站"
          desc={host ? (siteDisabled ? `已在 ${host} 关闭` : host || '—') : '当前页不可用'}
        >
          <Toggle
            checked={!!host && !siteDisabled}
            disabled={!host}
            onChange={() => {
              if (!host) return
              const next = toggleHostInList(host, settings.disabledSites)
              update({ disabledSites: next })
            }}
          />
        </Row>

        <Row
          label="hover 自动朗读"
          desc={settings.autoSpeakOnHover ? '悬停时自动发音' : '点按钮才发音'}
        >
          <Toggle
            checked={settings.autoSpeakOnHover}
            onChange={(v) => update({ autoSpeakOnHover: v })}
          />
        </Row>

        <div className="pt-2 text-[11px] text-gray-400 dark:text-gray-500">
          我的水平：{settings.userLevel}
          {settings.includeCurrentLevel ? '（含本级）' : '（不含本级）'} ·
          {settings.highlightAdvancedUnknownWords ? ' 含 B2+' : ' 不含 B2+'}
        </div>
      </div>
    </div>
  )
}

function Row(props: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div>{props.label}</div>
        {props.desc && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400">{props.desc}</div>
        )}
      </div>
      <div className="shrink-0">{props.children}</div>
    </div>
  )
}

function Toggle(props: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      onClick={() => !props.disabled && props.onChange(!props.checked)}
      className={[
        'inline-flex h-5 w-9 items-center rounded-full transition',
        props.checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
        props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white transition shadow',
          props.checked ? 'translate-x-4' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}
