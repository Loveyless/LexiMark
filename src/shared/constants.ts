import type { DefinitionLang, HighlightMode, Settings, UserLevel } from './types'

// ============ 默认设置（PRD §16） ============

export const DEFAULT_HIGHLIGHT_COLOR = '#4d4d4d'

export const defaultSettings: Settings = {
  enabled: true,
  userLevel: 'A2',
  includeCurrentLevel: true,
  highlightAdvancedUnknownWords: true,
  highlightMode: 'dashed-underline',
  highlightColor: DEFAULT_HIGHLIGHT_COLOR,
  definitionLang: 'both',
  autoSpeakOnHover: true,
  speakLang: 'en-US',
  speakRate: 0.9,
  speakVoiceURI: '',
  disabledSites: [],
  skipCodeBlocks: true,
}

// ============ 等级 ============

export const LEVEL_RANK: Record<UserLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
} as const

export const ALL_LEVELS: UserLevel[] = ['A1', 'A2', 'B1', 'B2']

// ============ 选项列表（UI 和类型同源） ============

export const HIGHLIGHT_MODE_OPTIONS: ReadonlyArray<{ value: HighlightMode; label: string }> = [
  { value: 'dashed-underline', label: '虚线下划线（默认）' },
  { value: 'underline', label: '实线下划线' },
  { value: 'text-color', label: '直接改变文字颜色' },
]

export const HIGHLIGHT_COLOR_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: DEFAULT_HIGHLIGHT_COLOR, label: '默认灰' },
  { value: '#dc2626', label: '红色' },
  { value: '#2563eb', label: '蓝色' },
  { value: '#16a34a', label: '绿色' },
  { value: '#d97706', label: '橙色' },
  { value: '#7c3aed', label: '紫色' },
]

export const DEFINITION_LANG_OPTIONS: ReadonlyArray<{ value: DefinitionLang; label: string }> = [
  { value: 'zh', label: '仅中文' },
  { value: 'en', label: '仅英文' },
  { value: 'both', label: '中英同时显示（默认）' },
]

// ============ 词频阈值 ============

/** ECDICT 子集裁剪阈值：bnc / frq 排名上限 */
export const DICT_FREQ_LIMIT = 50_000

/** B2+/未分级词高亮的 BNC 排名上限 */
export const ADVANCED_BNC_LIMIT = 20_000

// ============ 扫描 ============

/** 跳过判定的 HTML 标签（小写） */
export const SKIP_TAGS_BASE = new Set([
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'button',
  'svg',
  'canvas',
  'math',
  'kbd',
  'samp',
])

/** skipCodeBlocks 开启时额外跳过 */
export const SKIP_TAGS_CODE = new Set(['code', 'pre'])

/** 页面英文比例抽样（DESIGN §3） */
export const SAMPLE_NODE_LIMIT = 50
export const SAMPLE_CHAR_LIMIT = 4000
export const ENGLISH_RATIO_THRESHOLD = 0.3

/** tokenize 正则（DESIGN §1.1） */
export const TOKEN_REGEX = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g

/** 单页面 token 数上限（PRD §24），超过则只处理 viewport 附近 */
export const MAX_TOKENS_PER_PAGE = 50_000

// ============ Tooltip / 高亮 ============

export const HIGHLIGHT_CLASS = 'leximark-hl'
export const HIGHLIGHT_PROCESSED_ATTR = 'data-leximark-processed'
export const HIGHLIGHT_WORD_ATTR = 'data-word'
export const TOOLTIP_DELAY_MS = 300
export const SPEECH_REPEAT_MS = 3000
export const SCAN_DEBOUNCE_MS = 250

// ============ Storage key ============

export const STORAGE_KEY_SETTINGS = 'settings'
export const STORAGE_KEY_CUSTOM_WORDS = 'customWords'
export const STORAGE_KEY_EXCLUDED_WORDS = 'excludedWords'
export const STORAGE_KEY_DICT_META = 'dictMeta'

// ============ IndexedDB ============

export const DB_NAME = 'leximark'
export const DB_VERSION = 1
export const DB_TABLE_ENTRIES = 'entries'

// ============ 数据资源路径（runtime） ============

export const PUBLIC_DICT_CSV = 'data/dict/ecdict.subset.csv'
export const PUBLIC_LEVEL_JSON = (level: UserLevel) =>
  `data/levels/${level.toLowerCase()}.json`
