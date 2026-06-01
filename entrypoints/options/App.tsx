import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../src/ui/useSettings'
import { useWordList } from '../../src/ui/useWordList'
import {
  ALL_LEVELS,
  LEVEL_RANK,
  HIGHLIGHT_MODE_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  DEFINITION_LANG_OPTIONS,
} from '../../src/shared/constants'
import type { DefinitionLang, HighlightMode, Settings, UserLevel } from '../../src/shared/types'
import { listVoices, onVoicesChanged, speak } from '../../src/speech/speak'

export default function App() {
  const { settings, update, loading } = useSettings()
  const custom = useWordList('customWords')
  const excluded = useWordList('excludedWords')

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        加载中…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold">LexiMark 设置</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            本地优先的英语生词高亮扩展。所有设置和词库都保存在你的浏览器中。
          </p>
        </header>

        {/* 我的英语水平 */}
        <Section title="我的英语水平">
          <div className="flex items-center gap-3">
            <select
              value={settings.userLevel}
              onChange={(e) => update({ userLevel: e.target.value as UserLevel })}
              className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5"
            >
              {ALL_LEVELS.map((lv) => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              默认 A2；选 A2 表示高亮 A2 及以上难度词。
            </span>
          </div>
        </Section>

        {/* 高亮范围 */}
        <Section title="高亮范围">
          <Check
            checked={settings.includeCurrentLevel}
            onChange={(v) => update({ includeCurrentLevel: v })}
            label="包含当前等级词"
            desc="开启时同时高亮你当前水平的词；关闭时只高亮更高难度。"
          />
          <Check
            checked={settings.highlightAdvancedUnknownWords}
            onChange={(v) => update({ highlightAdvancedUnknownWords: v })}
            label="高亮 B2+ / 未分级高级词"
            desc="本地词典中不在 A1-B2 词表、且 BNC 词频排名 ≤ 20000 的词。"
          />
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            当前会高亮：<LevelPreview lv={settings.userLevel} includeCurrent={settings.includeCurrentLevel} adv={settings.highlightAdvancedUnknownWords} />
          </div>
        </Section>

        {/* 高亮样式 */}
        <Section title="高亮样式">
          <Radios<HighlightMode>
            value={settings.highlightMode}
            onChange={(v) => update({ highlightMode: v })}
            options={HIGHLIGHT_MODE_OPTIONS}
          />
          <HighlightColorPicker
            value={settings.highlightColor}
            mode={settings.highlightMode}
            onChange={(highlightColor) => update({ highlightColor })}
          />
        </Section>

        {/* 释义语言 */}
        <Section title="释义语言">
          <Radios<DefinitionLang>
            value={settings.definitionLang}
            onChange={(v) => update({ definitionLang: v })}
            options={DEFINITION_LANG_OPTIONS}
          />
        </Section>

        {/* 发音设置 */}
        <Section title="发音">
          <Check
            checked={settings.autoSpeakOnHover}
            onChange={(v) => update({ autoSpeakOnHover: v })}
            label="hover 自动朗读"
            desc="默认开启；悬停高亮词后会自动朗读一次。"
          />
          <VoicePicker
            value={settings.speakVoiceURI}
            onChange={(uri) => update({ speakVoiceURI: uri })}
            previewSettings={settings}
          />
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="w-24 text-gray-500 dark:text-gray-400">语速</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={settings.speakRate}
              onChange={(e) => update({ speakRate: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-10 text-right tabular-nums">{settings.speakRate.toFixed(2)}</span>
          </div>
        </Section>

        {/* 跳过代码块 */}
        <Section title="阅读">
          <Check
            checked={settings.skipCodeBlocks}
            onChange={(v) => update({ skipCodeBlocks: v })}
            label="跳过代码块"
            desc="跳过 <code> / <pre> 标签内的内容，避免在代码块里制造花脸。"
          />
        </Section>

        {/* 自定义词 */}
        <Section title="自定义词（强制高亮）">
          <WordEditor
            words={custom.words}
            onAddWords={(items) => custom.addMany(items)}
            onRemove={(w) => custom.remove(w)}
            placeholder={'middleware, rendering\nlocalization'}
          />
        </Section>

        {/* 排除词 */}
        <Section title="排除词（永远不高亮）">
          <WordEditor
            words={excluded.words}
            onAddWords={(items) => excluded.addMany(items)}
            onRemove={(w) => excluded.remove(w)}
            placeholder={'developer, release\nbrowser'}
          />
        </Section>

        {/* About */}
        <Section title="关于">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 leading-relaxed">
            <div>词典来源：ECDICT（MIT License，作者 skywind3000）</div>
            <div>分级词表：CEFR-J Wordlist（CC BY-SA 4.0）</div>
            <div>插件完全本地运行，不会上传任何页面内容、词库或设置。发音功能调用浏览器原生 Web Speech API，部分系统语音由浏览器在线合成。</div>
          </div>
        </Section>
      </div>
    </div>
  )
}

// ============ 子组件 ============

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5 shadow-sm">
      <h2 className="text-base font-semibold mb-3">{props.title}</h2>
      <div className="space-y-2">{props.children}</div>
    </section>
  )
}

function Check(props: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  desc?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500"
      />
      <div>
        <div className="text-sm">{props.label}</div>
        {props.desc && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{props.desc}</div>
        )}
      </div>
    </label>
  )
}

function Radios<T extends string>(props: {
  value: T
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
}) {
  return (
    <div className="space-y-2">
      {props.options.map((o) => (
        <label key={o.value} className="flex items-center gap-3 cursor-pointer select-none text-sm">
          <input
            type="radio"
            checked={props.value === o.value}
            onChange={() => props.onChange(o.value)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700"
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}

function HighlightColorPicker(props: {
  value: string
  mode: HighlightMode
  onChange: (value: string) => void
}) {
  return (
    <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm">颜色</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            <HighlightPreview mode={props.mode} color={props.value} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            aria-label="高亮颜色"
            className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-950"
          />
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{props.value}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {HIGHLIGHT_COLOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => props.onChange(option.value)}
            className={[
              'h-6 w-6 rounded-full border transition',
              props.value === option.value
                ? 'border-gray-900 ring-2 ring-gray-900/20 dark:border-white dark:ring-white/25'
                : 'border-gray-300 hover:scale-105 dark:border-gray-700',
            ].join(' ')}
            style={{ backgroundColor: option.value }}
            title={option.label}
            aria-label={option.label}
          />
        ))}
      </div>
    </div>
  )
}

function HighlightPreview(props: { mode: HighlightMode; color: string }) {
  const style: React.CSSProperties =
    props.mode === 'text-color'
      ? { color: props.color }
      : {
          textDecorationLine: 'underline',
          textDecorationStyle: props.mode === 'dashed-underline' ? 'dashed' : 'solid',
          textDecorationColor: props.color,
          textDecorationThickness: '1.5px',
          textUnderlineOffset: '2px',
        }

  return <span style={style}>preview highlight</span>
}

type WordListViewMode = 'tags' | 'comma' | 'lines'

function WordEditor(props: {
  words: string[]
  onAddWords: (items: string[]) => void | Promise<void>
  onRemove: (w: string) => void | Promise<void>
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const [viewMode, setViewMode] = useState<WordListViewMode>('tags')
  const sorted = useMemo(() => [...props.words].sort(), [props.words])
  const pendingWords = useMemo(() => parseWordInput(input), [input])
  const textBlockValue = useMemo(
    () => viewMode === 'comma' ? sorted.join(', ') : sorted.join('\n'),
    [sorted, viewMode],
  )

  const handleAdd = async () => {
    if (pendingWords.length === 0) return
    await props.onAddWords(pendingWords)
    setInput('')
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={props.placeholder}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          rows={3}
          className="min-h-20 flex-1 resize-y rounded border border-gray-300 bg-white px-3 py-2 text-sm leading-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pendingWords.length === 0}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {pendingWords.length > 1 ? `添加 ${pendingWords.length} 个` : '添加'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">{sorted.length} 个词</div>
        <div className="inline-flex overflow-hidden rounded border border-gray-200 dark:border-gray-700">
          {([
            ['tags', '标签'],
            ['comma', '逗号'],
            ['lines', '换行'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={[
                'px-2.5 py-1 text-xs transition',
                viewMode === mode
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {sorted.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500">（暂无）</div>
        ) : viewMode === 'tags' ? (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800"
              >
                {w}
                <button
                  type="button"
                  onClick={() => props.onRemove(w)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`移除 ${w}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <textarea
            readOnly
            value={textBlockValue}
            rows={Math.min(Math.max(sorted.length, 4), 12)}
            className="w-full resize-y rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs leading-5 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
        )}
      </div>
    </div>
  )
}

function parseWordInput(raw: string): string[] {
  const seen = new Set<string>()
  const words: string[] = []
  for (const item of raw.split(/[\n,，]+/)) {
    const word = item.trim().toLowerCase()
    if (!word || seen.has(word)) continue
    seen.add(word)
    words.push(word)
  }
  return words
}

function LevelPreview(props: { lv: UserLevel; includeCurrent: boolean; adv: boolean }) {
  const items: string[] = []
  const start = props.includeCurrent ? LEVEL_RANK[props.lv] : LEVEL_RANK[props.lv] + 1
  for (const lv of ALL_LEVELS) {
    if (LEVEL_RANK[lv] >= start) items.push(lv)
  }
  if (props.adv) items.push('B2+/未分级')
  return <span className="font-mono">{items.join(' · ') || '（无）'}</span>
}

function VoicePicker(props: {
  value: string
  onChange: (uri: string) => void
  previewSettings: Settings
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => listVoices())

  useEffect(() => {
    // 首次渲染时 voices 可能为空，listVoices 内部已订阅 voiceschanged；
    // 这里再订阅一次，触发 React 重新拿列表。
    const refresh = () => setVoices(listVoices())
    refresh()
    const off = onVoicesChanged(refresh)
    // 兜底：某些浏览器 voiceschanged 不触发，1 秒后再拉一次
    const t = window.setTimeout(refresh, 1000)
    return () => {
      off()
      window.clearTimeout(t)
    }
  }, [])

  const enVoices = useMemo(
    () => voices.filter((v) => v.lang?.toLowerCase().startsWith('en')),
    [voices],
  )

  const hasCurrent = props.value === '' || enVoices.some((v) => v.voiceURI === props.value)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-3 text-sm">
        <span className="w-24 text-gray-500 dark:text-gray-400">语音</span>
        <select
          value={hasCurrent ? props.value : ''}
          onChange={(e) => props.onChange(e.target.value)}
          className="flex-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
        >
          <option value="">默认（浏览器自动选择）</option>
          {enVoices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {formatVoiceLabel(v)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => speak('hello world', props.previewSettings, true)}
          className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          试听
        </button>
      </div>
      <div className="ml-[6.75rem] text-xs text-gray-500 dark:text-gray-400">
        {enVoices.length === 0
          ? '正在加载浏览器语音列表…如果一直为空，刷新页面再试。'
          : !hasCurrent
            ? '已保存的语音在当前浏览器不存在，已临时回落到默认。'
            : 'Google 系语音需要联网；Microsoft Natural 系为本地高质量语音。'}
      </div>
    </div>
  )
}

function formatVoiceLabel(v: SpeechSynthesisVoice): string {
  const local = v.localService ? '本地' : '在线'
  const def = v.default ? ' · 系统默认' : ''
  return `${v.name} (${v.lang}) · ${local}${def}`
}
