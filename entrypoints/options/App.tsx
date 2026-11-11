import { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../src/ui/useSettings'
import { useWordList } from '../../src/ui/useWordList'
import {
  ALL_LEVELS,
  LEVEL_RANK,
  HIGHLIGHT_COLOR_OPTIONS,
} from '../../src/shared/constants'
import type { HighlightMode, Settings, UserLevel } from '../../src/shared/types'
import { listVoices, onVoicesChanged, speak } from '../../src/speech/speak'
import { BUILTIN_EXCLUDED_WORDS } from '../../src/wordbook/builtin-excluded'
import {
  Icon,
  Range,
  Section,
  Segmented,
  Switch,
  ToggleRow,
  cx,
} from '../../src/ui/controls'

const LEVEL_OPTIONS: ReadonlyArray<{ value: UserLevel; label: string }> = ALL_LEVELS.map(
  (level) => ({ value: level, label: level }),
)

const MODE_OPTIONS: ReadonlyArray<{ value: HighlightMode; label: string }> = [
  { value: 'dashed-underline', label: '虚线下划线' },
  { value: 'underline', label: '实线下划线' },
  { value: 'text-color', label: '文字颜色' },
]

const LANG_OPTIONS: ReadonlyArray<{ value: Settings['definitionLang']; label: string }> = [
  { value: 'both', label: '中英对照' },
  { value: 'zh', label: '仅中文' },
  { value: 'en', label: '仅英文' },
]

export default function App() {
  const { settings, update, loading } = useSettings()
  const custom = useWordList('customWords')
  const excluded = useWordList('excludedWords')

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-[#FFFDF7] text-sm text-stone-500 dark:bg-[#0C0A09] dark:text-stone-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />
        加载设置…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-stone-900 dark:bg-[#0C0A09] dark:text-stone-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Header />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <main className="order-1 space-y-4 lg:order-1">
            <Section
              icon="level"
              title="我的英语水平"
              description="按 CEFR 分级判断哪些词值得标注。"
            >
              <Segmented
                value={settings.userLevel}
                options={LEVEL_OPTIONS}
                onChange={(userLevel) => update({ userLevel })}
                label="英语水平"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                <span>CEFR-J 分级词表</span>
                <span className="font-medium text-stone-600 dark:text-stone-300">
                  {rangeSummary(settings)}
                </span>
              </div>
            </Section>

            <Section
              icon="target"
              title="高亮范围"
              description="决定除了当前等级之外，还要不要看更难或未分级的词。"
            >
              <ToggleRow
                label="包含当前等级的词"
                description="关闭后只标注高于你水平的词，页面会更干净。"
                checked={settings.includeCurrentLevel}
                onChange={(includeCurrentLevel) => update({ includeCurrentLevel })}
              />
              <div className="h-px bg-stone-100 dark:bg-stone-800" />
              <ToggleRow
                label="B2+ 高级词"
                description="词典里存在、但不在 A1–B2 词表中的高频词。"
                checked={settings.highlightAdvancedUnknownWords}
                onChange={(highlightAdvancedUnknownWords) =>
                  update({ highlightAdvancedUnknownWords })
                }
              />
            </Section>

            <Section
              icon="highlight"
              title="高亮样式"
              description="标注方式和颜色会立即应用到所有页面。"
            >
              <Segmented
                value={settings.highlightMode}
                options={MODE_OPTIONS}
                onChange={(highlightMode) => update({ highlightMode })}
                label="高亮方式"
              />
              <div className="h-px bg-stone-100 dark:bg-stone-800" />
              <ColorPicker
                value={settings.highlightColor}
                mode={settings.highlightMode}
                onChange={(highlightColor) => update({ highlightColor })}
              />
            </Section>

            <Section
              icon="globe"
              title="释义语言"
              description="hover 高亮词时，卡片里显示哪种解释。"
            >
              <Segmented
                value={settings.definitionLang}
                options={LANG_OPTIONS}
                onChange={(definitionLang) => update({ definitionLang })}
                label="释义语言"
              />
            </Section>

            <Section
              icon="volume"
              title="发音"
              description="使用浏览器原生的 Web Speech API，不经过第三方服务。"
            >
              <ToggleRow
                label="hover 自动朗读"
                description="悬停高亮词后自动读一次；关闭后只在卡片里点按钮发音。"
                checked={settings.autoSpeakOnHover}
                onChange={(autoSpeakOnHover) => update({ autoSpeakOnHover })}
              />
              <div className="h-px bg-stone-100 dark:bg-stone-800" />
              <VoicePicker
                value={settings.speakVoiceURI}
                onChange={(speakVoiceURI) => update({ speakVoiceURI })}
                previewSettings={settings}
              />
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200">语速</span>
                  <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    {settings.speakRate.toFixed(2)}×
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">慢</span>
                  <Range
                    value={settings.speakRate}
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    onChange={(speakRate) => update({ speakRate })}
                    label="朗读语速"
                  />
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">快</span>
                </div>
              </div>
            </Section>

            <Section
              icon="book"
              title="阅读"
              description="控制页面扫描时的边界行为。"
            >
              <ToggleRow
                label="跳过代码块"
                description="跳过 <code> 和 <pre> 里的内容，避免在代码里制造花脸。"
                checked={settings.skipCodeBlocks}
                onChange={(skipCodeBlocks) => update({ skipCodeBlocks })}
              />
            </Section>

            <Section
              icon="list"
              title="自定义词"
              description="强制高亮，不受等级和词典收录限制。"
            >
              <WordEditor
                words={custom.words}
                onAddWords={(items) => custom.addMany(items)}
                onRemove={(word) => custom.remove(word)}
                placeholder={'middleware, rendering\nlocalization'}
              />
            </Section>

            <Section
              icon="filter"
              title="排除词"
              description="永远不高亮，优先级高于自定义词。"
            >
              <WordEditor
                words={excluded.words}
                onAddWords={(items) => excluded.addMany(items)}
                onRemove={(word) => excluded.remove(word)}
                placeholder={'developer, release\nbrowser'}
              />
              <p className="text-[11px] leading-5 text-stone-400 dark:text-stone-500">
                另有 {BUILTIN_EXCLUDED_WORDS.length} 个内置排除词（常用词、开发/产品词汇、人名品牌等），随扩展更新，不占用上面的列表。
              </p>
            </Section>
          </main>

          <aside className="order-2 space-y-4 lg:order-2 lg:sticky lg:top-6 lg:self-start">
            <PreviewPanel
              settings={settings}
              onToggle={(enabled) => update({ enabled })}
            />
          </aside>
        </div>

        <footer className="mt-8 flex flex-col gap-1 border-t border-stone-200/70 pt-5 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800 dark:text-stone-500">
          <span>LexiMark · 数据只保存在这台浏览器</span>
          <span>ECDICT · CEFR-J</span>
        </footer>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <img src="/icon/logo.svg" alt="" className="h-11 w-11" />
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">LexiMark</h1>
          <p className="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">
            本地优先的英语生词高亮
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-start pl-14 sm:self-auto sm:pl-0">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
          <Icon name="shield" className="h-3.5 w-3.5" />
          本地运行
        </span>
      </div>
    </header>
  )
}

function PreviewPanel(props: {
  settings: Settings
  onToggle: (enabled: boolean) => void
}) {
  const { settings } = props
  const style: React.CSSProperties =
    settings.highlightMode === 'text-color'
      ? { color: settings.highlightColor }
      : {
          textDecorationLine: 'underline',
          textDecorationStyle:
            settings.highlightMode === 'dashed-underline' ? 'dashed' : 'solid',
          textDecorationColor: settings.highlightColor,
          textDecorationThickness: '2px',
          textUnderlineOffset: '4px',
        }

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200/70 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.03)] dark:border-stone-800 dark:bg-stone-900/60">
      <div className="flex items-center gap-2 px-5 pt-5">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-700 dark:bg-brand-400" />
        <span className="text-[10px] font-semibold tracking-[0.14em] text-stone-400 dark:text-stone-500">
          实时预览
        </span>
      </div>
      <div className="p-5 pt-3">
        <div className="rounded-md border border-stone-200/70 bg-[#FFFDF7] p-4 text-[15px] leading-7 text-stone-800">
          The <span style={style}>deployment</span> pipeline is running, but the cache is
          stale.
        </div>
        <p className="mt-2.5 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
          示例文本 · 实际效果随等级与样式设置变化
        </p>
        <div className="mt-3 rounded-md border border-stone-200/60 bg-white p-3 dark:border-stone-700 dark:bg-stone-950/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                deployment
              </span>
              <span className="font-mono text-[10px] text-stone-400 dark:text-stone-500">
                /dɪˈplɔɪmənt/
              </span>
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              <Icon name="volume" className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-1.5 space-y-0.5 text-[11px] leading-5">
            {(settings.definitionLang === 'both' || settings.definitionLang === 'zh') && (
              <p className="text-stone-600 dark:text-stone-300">n. 部署；投放</p>
            )}
            {(settings.definitionLang === 'both' || settings.definitionLang === 'en') && (
              <p className="text-stone-500 dark:text-stone-400">
                n. the act of putting something into use
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-stone-100 px-5 py-4 dark:border-stone-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">总开关</div>
            <p className="mt-0.5 text-[11px] leading-5 text-stone-500 dark:text-stone-400">
              {settings.enabled ? '已开启 · 自动标注页面生词' : '已暂停 · 所有页面不显示标注'}
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onChange={props.onToggle}
            label="总开关"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {settings.userLevel}
          </span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span>{settings.includeCurrentLevel ? '含本级' : '仅更高等级'}</span>
          {settings.highlightAdvancedUnknownWords && (
            <>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <span>B2+ 高级词</span>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function ColorPicker(props: {
  value: string
  mode: HighlightMode
  onChange: (value: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-stone-800 dark:text-stone-200">颜色</span>
        <span className="font-mono text-[11px] text-stone-400 dark:text-stone-500">
          {props.value}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {HIGHLIGHT_COLOR_OPTIONS.map((option) => {
          const selected = props.value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => props.onChange(option.value)}
              aria-label={option.label}
              aria-pressed={selected}
              title={option.label}
              className={cx(
                'relative h-8 w-8 rounded-full border border-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
                selected
                  ? 'ring-2 ring-stone-500 ring-offset-2 ring-offset-white dark:ring-stone-400 dark:ring-offset-stone-900'
                  : 'hover:border-stone-400 dark:hover:border-stone-500',
              )}
              style={{ backgroundColor: option.value }}
            />
          )
        })}
        <label
          className="ml-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-300 transition hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
          title="自定义颜色"
          aria-label="自定义高亮颜色"
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              background:
                'conic-gradient(#f97316, #eab308, #22c55e, #3b82f6, #a855f7, #f97316)',
            }}
          >
            <svg
              viewBox="0 0 12 12"
              className="h-2.5 w-2.5 text-white drop-shadow"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 2.5v7M2.5 6h7" />
            </svg>
          </span>
          <input
            type="color"
            value={props.value}
            onChange={(event) => props.onChange(event.target.value)}
            aria-label="自定义高亮颜色"
            className="sr-only"
          />
        </label>
      </div>
    </div>
  )
}

type WordListViewMode = 'tags' | 'comma' | 'lines'

const WORD_VIEW_OPTIONS: ReadonlyArray<{ value: WordListViewMode; label: string }> = [
  { value: 'tags', label: '标签' },
  { value: 'comma', label: '逗号' },
  { value: 'lines', label: '换行' },
]

function WordEditor(props: {
  words: string[]
  onAddWords: (items: string[]) => void | Promise<void>
  onRemove: (word: string) => void | Promise<void>
  placeholder?: string
}) {
  const [input, setInput] = useState('')
  const [viewMode, setViewMode] = useState<WordListViewMode>('tags')
  const sorted = useMemo(() => [...props.words].sort(), [props.words])
  const pendingWords = useMemo(() => parseWordInput(input), [input])
  const textBlockValue = useMemo(
    () => (viewMode === 'comma' ? sorted.join(', ') : sorted.join('\n')),
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
          onChange={(event) => setInput(event.target.value)}
          placeholder={props.placeholder}
          aria-label="输入要添加的词，用换行或逗号分隔"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault()
              handleAdd()
            }
          }}
          rows={3}
          className="min-h-20 flex-1 resize-y rounded-md border border-stone-200 bg-stone-50/60 px-3 py-2 text-sm leading-5 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-stone-700 dark:bg-stone-950/40 dark:placeholder:text-stone-600 dark:focus:bg-stone-950"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pendingWords.length === 0}
          className="shrink-0 rounded-md bg-brand-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none dark:bg-brand-600 dark:hover:bg-brand-500 dark:disabled:bg-stone-800 dark:disabled:text-stone-600"
        >
          {pendingWords.length > 1 ? `添加 ${pendingWords.length} 个` : '添加'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {sorted.length} 个词
        </div>
        <div className="w-44">
          <Segmented
            value={viewMode}
            options={WORD_VIEW_OPTIONS}
            onChange={setViewMode}
            label="词汇显示方式"
            size="sm"
          />
        </div>
      </div>

      <div className="mt-3">
        {sorted.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-200 px-3 py-4 text-xs text-stone-400 dark:border-stone-800 dark:text-stone-500">
            （暂无）
          </div>
        ) : viewMode === 'tags' ? (
          <div className="flex flex-wrap gap-1.5">
            {sorted.map((word) => (
              <span
                key={word}
                className="group inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-700 transition hover:border-brand-200 hover:bg-brand-50 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300 dark:hover:border-brand-900 dark:hover:bg-brand-950/50"
              >
                {word}
                <button
                  type="button"
                  onClick={() => props.onRemove(word)}
                  className="text-stone-400 transition hover:text-red-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 dark:text-stone-500"
                  aria-label={`移除 ${word}`}
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
            className="w-full resize-y rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs leading-5 text-stone-700 dark:border-stone-700 dark:bg-stone-950/50 dark:text-stone-300"
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

function rangeSummary(settings: Settings): string {
  const start = settings.includeCurrentLevel
    ? LEVEL_RANK[settings.userLevel]
    : LEVEL_RANK[settings.userLevel] + 1
  const levels = ALL_LEVELS.filter((level) => LEVEL_RANK[level] >= start)
  const levelPart =
    levels.length === 0
      ? ''
      : levels.length === 1
        ? levels[0]!
        : `${levels[0]} 及以上`
  if (levelPart && settings.highlightAdvancedUnknownWords) return `${levelPart} + 高级词`
  if (levelPart) return levelPart
  if (settings.highlightAdvancedUnknownWords) return '仅高级词'
  return '不标注'
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
    const timer = window.setTimeout(refresh, 1000)
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])

  const enVoices = useMemo(
    () => voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en')),
    [voices],
  )

  const hasCurrent =
    props.value === '' || enVoices.some((voice) => voice.voiceURI === props.value)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2.5">
        <span className="w-9 shrink-0 text-sm font-medium text-stone-800 dark:text-stone-200">
          语音
        </span>
        <select
          value={hasCurrent ? props.value : ''}
          onChange={(event) => props.onChange(event.target.value)}
          aria-label="朗读语音"
          className="min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-sm text-stone-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-200"
        >
          <option value="">默认（浏览器自动选择）</option>
          {enVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {formatVoiceLabel(voice)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => speak('hello world', props.previewSettings, true)}
          className="shrink-0 rounded-md border border-stone-200 px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-stone-700 dark:text-stone-300 dark:hover:border-brand-800 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
        >
          试听
        </button>
      </div>
      <p className="pl-[2.875rem] text-[11px] leading-4 text-stone-400 dark:text-stone-500">
        {enVoices.length === 0
          ? '正在加载浏览器语音列表…如果一直为空，刷新页面再试。'
          : !hasCurrent
            ? '已保存的语音在当前浏览器不存在，已临时回落到默认。'
            : 'Google 系语音需要联网；Microsoft Natural 系为本地高质量语音。'}
      </p>
    </div>
  )
}

function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  const local = voice.localService ? '本地' : '在线'
  const def = voice.default ? ' · 系统默认' : ''
  return `${voice.name} (${voice.lang}) · ${local}${def}`
}
