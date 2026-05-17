// 项目所有公共类型集中在这里。
// PRD §15 + DESIGN §7 / §8 是事实来源。

export type UserLevel = 'A1' | 'A2' | 'B1' | 'B2'

export type HighlightMode = 'dashed-underline' | 'underline' | 'text-color'

export type DefinitionLang = 'zh' | 'en' | 'both'

export type SpeakLang = 'en-US'

export type Settings = {
  enabled: boolean
  userLevel: UserLevel
  includeCurrentLevel: boolean
  highlightAdvancedUnknownWords: boolean
  highlightMode: HighlightMode
  highlightColor: string
  definitionLang: DefinitionLang
  autoSpeakOnHover: boolean
  speakLang: SpeakLang
  speakRate: number
  /** 指定 SpeechSynthesisVoice.voiceURI；空串表示用浏览器默认 voice。 */
  speakVoiceURI: string
  /** 用户在 popup 主动关闭的站点 host（如 "github.com"） */
  disabledSites: string[]
  skipCodeBlocks: boolean
}

export type LevelWord = {
  word: string
  level: UserLevel
}

export type UserWord = {
  word: string
  type: 'custom' | 'excluded'
  createdAt: number
  updatedAt: number
}

export type DictEntry = {
  word: string
  phonetic?: string
  translation?: string
  definition?: string
  pos?: string
  exchange?: string
  frq?: number
  bnc?: number
}

export type DictMeta = {
  version: string
  importedAt: number
  /** 词条总数，用于 popup 显示 */
  entryCount?: number
}

/** worker 一次性下发到 content 的索引快照（DESIGN §7.3） */
export type IndexSnapshot = {
  version: number
  levelWords: Record<UserLevel, string[]>
  advancedWords: string[]
  lemmaPairs: [string, string][]
  customWords: string[]
  excludedWords: string[]
  settings: Settings
}

/** content 在内存里重建后的运行时索引 */
export type InMemoryIndexes = {
  levelWordMap: Map<string, UserLevel>
  advancedWordSet: Set<string>
  lemmaMap: Map<string, string>
  customWords: Set<string>
  excludedWords: Set<string>
  settings: Settings
  version: number
}

// ============ 消息协议（DESIGN §8） ============

export type MsgRequestSnapshot = {
  type: 'LM_REQUEST_SNAPSHOT'
  knownVersion?: number
}

export type MsgRequestSnapshotResp =
  | { snapshot: IndexSnapshot }
  | { upToDate: true; version: number }
  | { error: string }

export type MsgQueryEntry = {
  type: 'LM_QUERY_ENTRY'
  word: string
}

export type MsgQueryEntryResp = {
  entry: DictEntry | null
}

export type MsgAddExcluded = {
  type: 'LM_ADD_EXCLUDED'
  word: string
}

export type MsgAddExcludedResp = {
  ok: boolean
}

export type MsgSnapshotUpdated = {
  type: 'LM_SNAPSHOT_UPDATED'
  version: number
}

export type MsgFromContent =
  | MsgRequestSnapshot
  | MsgQueryEntry
  | MsgAddExcluded

export type MsgFromWorker = MsgSnapshotUpdated
