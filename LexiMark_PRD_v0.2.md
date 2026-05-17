# LexiMark 英语生词高亮 Chrome 扩展 PRD v0.2

纯 MVP 版｜本地优先｜按用户英语水平自动高亮可能不熟的词

> 版本：v0.2  
> 定位：自用优先、MVP 优先、不做商业全家桶  
> 核心修正：用户选择 A2，不是只高亮 A2，而是高亮 A2 及以上难度词。


## 1. 产品定位

**一句话描述**：LexiMark 是一个本地优先的 Chrome 英语阅读辅助扩展，根据用户当前英语水平，在网页中自动高亮可能不熟的词，hover 后展示中文释义，并默认使用美音朗读。

**产品边界**：它不是全文翻译插件，不是 AI 英语老师，不是复习系统，而是一个低打扰的网页生词提示工具。

**核心场景**：用户阅读 GitHub README、英文技术文档、Reddit、X/Twitter、博客或普通英文网页时，页面中的目标词会被下划线/高亮标出；鼠标移上去后，展示释义卡片并朗读。

## 2. 核心目标

插件只解决一个问题：在英文网页中标出用户可能不熟的词，并快速展示释义和发音。

例如用户当前水平是 A2，插件默认高亮 A2 + B1 + B2 + B2+/未分级高级词，不高亮 A1。因为 A1 词大概率已经认识，继续高亮会干扰阅读。

## 3. 明确不做的功能

MVP 明确不做以下功能，避免产品范围膨胀（后续版本也不在规划范围内）：

- 全文翻译
- AI 上下文解释
- 云同步
- 账号系统
- YouTube 字幕
- PDF 支持
- Anki 导出
- 复习系统
- 词汇量测试
- 多端同步
- 复杂语法分析
- 自定义词 / 排除词的导入导出
- 任何形式的使用统计面板（高亮量、阅读时长、生词积累等）

## 4. 用户水平与高亮范围

用户不再手动勾选 A1/A2/B1/B2，而是选择“我的英语水平”。

默认值：A2。

高亮范围规则：

| 用户水平 | 默认高亮 |
|---|---|
| A1 | A1 + A2 + B1 + B2 + B2+ |
| A2 | A2 + B1 + B2 + B2+ |
| B1 | B1 + B2 + B2+ |
| B2 | B2 + B2+ |

B2+ 指：不在 A1/A2/B1/B2 词库中，但存在于本地词典里的高级词或未分级词。这样可以避免“文章很难，但高级词反而没有被高亮”的问题。

## 5. 是否包含当前等级词

设置项：包含当前等级词。

默认开启。

示例：

- 我的水平：A2
- 包含当前等级词：开启
- 实际高亮：A2 + B1 + B2 + B2+

如果关闭：

- 我的水平：A2
- 包含当前等级词：关闭
- 实际高亮：B1 + B2 + B2+

对当前使用者来说，建议默认开启，因为 A2 左右的学习者通常并不是所有 A2 词都完全熟悉。

## 6. 词库设计

词库分为四层：

1. **A1/A2/B1/B2 分级词库**：用于判断词的基础难度。
2. **B2+/未分级高级词**：不在分级词库中，但存在于本地词典里的高级词。判定时需满足 BNC 词频排名 ≤ 20000，过滤掉人名、地名、生僻派生词，避免页面被打成花脸。
3. **自定义词库 customWords**：用户手动添加，强制高亮。
4. **排除词 excludedWords**：用户手动排除，永远不高亮。

注意：分级词库只负责”判断难度”，不是用户直接选择的高亮列表。

## 7. 高亮优先级

最终优先级：

```txt
排除词 > 自定义词 > 等级规则 > B2+/未分级规则
```

解释：

| 情况 | 是否高亮 |
|---|---|
| 在排除词里 | 不高亮 |
| 在自定义词里 | 高亮 |
| 在当前用户水平及以上 | 高亮 |
| 是 B2+/未分级高级词 | 高亮 |
| 低于用户水平 | 不高亮 |
| 不在词典里 | 不高亮 |

也就是说，只要一个词被加入排除词，不管它属于什么等级，都不再高亮；只要一个词被加入自定义词，并且不在排除词里，就会高亮。

## 8. 本地词典

本地词典使用 ECDICT 的裁剪子集。

裁剪规则：只保留 `bnc` 或 `frq` 排名 ≤ 50000 的词条，体积约 5-10MB，可直接随扩展打包，安装即用，无需联网下载。低于该阈值的人名、地名、生僻派生词不进入词典。

**分级词库来源**：使用 **CEFR-J Wordlist**（日本团队整理，CC 协议可商用），覆盖 A1/A2/B1/B2 共约 7000-8000 词。词表按等级拆分为 `a1.json` / `a2.json` / `b1.json` / `b2.json` 内置在扩展中。需在文档与 about 页保留来源署名。

ECDICT 负责提供：

- 中文释义（`translation`）
- 英文释义（`definition`）
- 音标
- 词性
- 词形变化（`exchange` 字段）
- 词频信息（`bnc` / `frq`）

需要注意：

```txt
CEFR-J 词表       = 判断等级用（A1-B2）
ECDICT 子集       = 查词用 + 提供 exchange 数据
customWords      = 用户强制高亮
excludedWords    = 用户强制排除
```

不要把 ECDICT 直接当成 A1/A2/B1/B2 分级词库。

**ECDICT 协议**：MIT License。扩展打包发布时需在 README 与扩展 about 页保留原作者署名与 LICENSE 文本。

## 8.5 词形还原（lemmatization）

英语里同一个词在网页中通常以变形形式出现（`deployed`、`deploying`、`went`、`children`），而词库只存原型（`deploy`、`go`、`child`）。如果不做词形还原，扫描到的变形词全部查不到，对应单词不会被高亮，体验差。

**方案**：利用 ECDICT 自带的 `exchange` 字段建反查表。

`exchange` 字段示例：

```txt
deploy → "d:deployed/i:deploying/3:deploys"
go     → "p:went/d:gone/i:going/3:goes"
child  → "s:children"
```

扩展启动时遍历一次 ECDICT 子集，把所有 `exchange` 展开成 `inflected → lemma` 反查表，存入内存：

```txt
deployed   → deploy
deploying  → deploy
deploys    → deploy
went       → go
gone       → go
children   → child
```

判定流程：

```txt
页面 token → 小写 → 反查表归一到原型 → 再去判定等级/B2+/自定义/排除
```

实现要点：

- 反查表全程驻留内存，构建后供同步判定使用。
- 反查表只覆盖词典里收录的词，未收录的变形词按原样处理（大概率不会被高亮，符合预期）。
- 大小写：先小写化再查表；专有名词（首字母大写 + 非句首）默认不高亮，避免把 Apple/React 这种当作生词。
- **歧义处理**：若小写后的原词本身在 CEFR-J 词表或 ECDICT 子集中存在，**优先按原词处理**，不再走 lemma 反查。例：`left` 本身是形容词/名词且在词表里，则直接按 `left` 判定，不归到 `leave`。这能避免"the left side"被错误识别为动词 `leave`。

## 9. 页面高亮功能

插件会扫描网页文本节点，把符合规则的单词标记出来。

默认样式：**虚线下划线**（`text-decoration: underline dashed`）。高亮颜色独立配置：选择文字颜色模式时改变文字颜色；选择下划线模式时改变下划线颜色。

可选样式：

- 虚线下划线（默认）
- 实线下划线
- 直接改变文字颜色

样式实现要求：

- 颜色使用 CSS 变量，由 `highlightColor` 设置统一控制；样式模式只决定颜色作用到文字本身还是下划线。
- 高亮 span 的样式选择器优先使用 `:where(.leximark-hl)` 这类零特异性写法，最大化避免被网页自身 CSS 覆盖；但不强制使用 `!important`，与原页风格冲突时由用户主动切换样式。
- 高亮 span 不能继承网页 `text-decoration-color`，需显式覆盖。

## 10. hover 释义卡片

用户鼠标移到高亮词上，延迟 300ms 后显示卡片。

卡片内容：

- 单词
- 音标
- 中文释义（来自 ECDICT `translation`）
- 英文释义（来自 ECDICT `definition`）
- 发音按钮
- 不再提示

中英释义同时展示，中文在上、英文在下，帮助用户在快速理解的同时接触英文原义、培养语感。

示例：

```txt
deploy
/dɪˈplɔɪ/

v. 部署；调动；展开；使用

to move soldiers or equipment into position
so that they are ready to be used; to use
sth effectively

[🔊 发音] [不再提示]
```

注意：早期版本里"加入自定义词库"按钮已移除——hover 卡片只会出现在已经被高亮的词上，再"加入词库"在语义上多余；customWords 的使用场景（强制高亮一个本来不会被高亮的词）改为只在 Options 页面手动管理。

## 11. 发音规则

默认使用浏览器原生 Web Speech API。

默认配置：

- 语言：en-US
- 口音：美音
- 语速：0.9

默认行为：

- hover 自动朗读默认开启（自用场景下，听一遍发音对建立词→音映射有帮助；办公等场合可在 popup 或设置页快速关闭）
- 卡片显示后始终保留发音按钮，用户点击即朗读
- 用户可在设置页或 popup 关闭 hover 自动朗读

hover 自动朗读期间的限制（无论默认值如何，始终生效）：

- 鼠标悬停超过 300ms 才显示卡片
- 只有卡片显示后才朗读
- 同一个词 3 秒内不重复朗读
- 鼠标快速划过不朗读

注意：Web Speech API 在 Chrome 上部分高质量声音由浏览器/系统的在线 TTS 合成，不一定 100% 离线，详见隐私章节。

## 12. 技术选型

推荐技术栈：

| 模块 | 选型 |
|---|---|
| 扩展框架 | WXT |
| 语言 | TypeScript |
| UI 框架 | React |
| 样式 | Tailwind CSS |
| 页面扫描 | Content Script + 原生 DOM API |
| Tooltip 隔离 | Shadow DOM |
| 小数据存储 | chrome.storage.local |
| 词典存储 | IndexedDB + Dexie |
| 本地词典 | ECDICT |
| 发音 | Web Speech API |
| 包管理 | pnpm |
| 测试 | Vitest |

选择 WXT 的原因：减少扩展工程化配置成本，支持 TypeScript、React、Manifest V3，适合快速做 Chrome 扩展 MVP。

## 13. 系统架构

判定路径同步、释义路径异步。判定相关索引由 service worker 启动期构建一次，然后**通过 `chrome.runtime.sendMessage` 一次性快照下发**到每个 content script，content script 自己持有一份内存索引，扫描热路径不再跨 context 通信。service worker 休眠也不影响 content script 的判定能力（快照已在 content 内存中）。设置变更或词库更新时，worker 主动广播新快照。

```txt
Chrome Extension
│
├── Content Script（每个 tab 一份内存索引）
│   ├── 启动时向 worker 请求索引快照（一次性）
│   ├── 扫描网页文本（含页面英文比例抽样）
│   ├── token 归一（小写 + lemma 反查）
│   ├── 判断单词是否需要高亮（查本地内存索引，同步）
│   ├── 包裹目标单词
│   ├── 监听 hover
│   ├── 显示 tooltip（通过 worker 异步查 IndexedDB 拿释义）
│   └── 调用发音
│
├── Background Service Worker
│   ├── 初始化词典（首次启动写入 IndexedDB）
│   ├── 构建判定索引（等级 Map / B2+ Set / lemma 反查表）
│   ├── 响应 content script 的快照请求
│   ├── 设置变更时广播新快照
│   ├── 查询 ECDICT 释义
│   └── 处理扩展消息
│
├── In-Memory Indexes（worker 构建，下发给 content）
│   ├── levelWordMap：word → 等级（来自 CEFR-J）
│   ├── advancedWordSet：BNC ≤ 20000 的非分级词
│   ├── lemmaMap：inflected → lemma（来自 ECDICT exchange）
│   ├── customWords / excludedWords
│   └── settings 快照
│
├── Popup
│   ├── 总开关
│   ├── 当前网站开关
│   ├── 自动发音开关
│   └── 进入设置页
│
├── Options Page
│   ├── 设置我的英语水平
│   ├── 设置是否包含当前等级词
│   ├── 设置是否高亮 B2+/未分级词
│   ├── 管理自定义词
│   ├── 管理排除词
│   └── 设置高亮样式
│
└── Local Data
    ├── chrome.storage.local（设置、自定义/排除词）
    └── IndexedDB（ECDICT 子集，按需查询释义）
```

**关于内存占用**：每个 tab 持有一份索引（粗估 5-10 MB），多 tab 场景下会线性增加。这是与"判定全程同步、性能优先"的权衡，开发期需实测验证。

## 14. 推荐目录结构

```txt
leximark-extension/
  package.json
  wxt.config.ts
  tsconfig.json

  entrypoints/
    background.ts
    content.ts

    popup/
      index.html
      main.tsx
      App.tsx

    options/
      index.html
      main.tsx
      App.tsx

  src/
    content/
      scanner.ts
      highlighter.ts
      tooltip.ts
      dom-utils.ts
      mutation.ts

    dictionary/
      db.ts
      query.ts
      import-ecdict.ts
      lemma-map.ts
      normalize.ts

    wordbook/
      level-words.ts
      advanced-word.ts
      should-highlight.ts

    storage/
      settings.ts

    speech/
      speak.ts

    shared/
      types.ts
      constants.ts

  data/
    levels/                  # 来源：CEFR-J Wordlist
      a1.json
      a2.json
      b1.json
      b2.json

    dict/
      ecdict.subset.csv      # 裁剪后的子集，BNC ≤ 50000

  scripts/
    build-ecdict-subset.ts   # 从完整 ECDICT 生成裁剪子集
    build-cefrj-levels.ts    # 从 CEFR-J 原始数据生成 a1-b2.json
    convert-ecdict.ts
```

## 15. 核心数据模型

```ts
export type UserLevel = 'A1' | 'A2' | 'B1' | 'B2'

export type Settings = {
  enabled: boolean
  userLevel: UserLevel
  includeCurrentLevel: boolean
  highlightAdvancedUnknownWords: boolean
  highlightMode: 'dashed-underline' | 'underline' | 'text-color'
  highlightColor: string
  definitionLang: 'zh' | 'en' | 'both'
  autoSpeakOnHover: boolean
  speakLang: 'en-US'
  speakRate: number
  disabledSites: string[]
  skipCodeBlocks: boolean
}

export type LevelWord = {
  word: string
  level: 'A1' | 'A2' | 'B1' | 'B2'
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
  translation?: string   // 中文释义
  definition?: string    // 英文释义
  pos?: string
  exchange?: string      // 词形变化，用于构建 lemmaMap
  frq?: number           // COCA 词频排名
  bnc?: number           // BNC 词频排名
}

// 内存中的判定索引（不持久化，启动时构建）
export type InMemoryIndexes = {
  levelWordMap: Map<string, 'A1' | 'A2' | 'B1' | 'B2'>
  advancedWordSet: Set<string>   // 非分级 + BNC ≤ 20000 的词
  lemmaMap: Map<string, string>  // inflected → lemma
  customWords: Set<string>
  excludedWords: Set<string>
}
```

## 16. 默认设置

```ts
export const defaultSettings: Settings = {
  enabled: true,
  userLevel: 'A2',
  includeCurrentLevel: true,
  highlightAdvancedUnknownWords: true,
  highlightMode: 'dashed-underline',
  highlightColor: '#4d4d4d',
  definitionLang: 'both',
  autoSpeakOnHover: true,
  speakLang: 'en-US',
  speakRate: 0.9,
  disabledSites: [],
  skipCodeBlocks: true
}
```

## 17. 高亮判断逻辑

判定流程必须是同步的（扫描热路径，不能每个词都 await）。所有判定相关数据在启动期一次性加载到内存（`InMemoryIndexes`）。释义查询（hover 时）才走 IndexedDB 异步。

`normalizeWord` 包含：trim → 小写 → lemma 反查（命中则替换为原型）。

`isAdvancedDictionaryWord` 的判定为：词在内存中的 `advancedWordSet` 里（即不在分级词库 + 存在于 ECDICT 子集 + BNC 排名 ≤ 20000）。

```ts
const levelRank = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4
} as const

function shouldHighlight(rawWord: string): boolean {
  const normalized = normalizeWord(rawWord) // 小写 + lemma 反查

  if (excludedWords.has(normalized)) {
    return false
  }

  if (customWords.has(normalized)) {
    return true
  }

  const wordLevel = levelWordMap.get(normalized)
  const userLevel = settings.userLevel

  if (wordLevel) {
    const wordRank = levelRank[wordLevel]
    const userRank = levelRank[userLevel]

    if (settings.includeCurrentLevel) {
      return wordRank >= userRank
    }

    return wordRank > userRank
  }

  if (settings.highlightAdvancedUnknownWords) {
    return advancedWordSet.has(normalized) // 已预先用 BNC ≤ 20000 过滤
  }

  return false
}
```

## 18. 页面扫描规则

扫描方式：必须使用 TreeWalker，只扫描文本节点。

不允许使用：

```txt
document.body.innerHTML = ...
```

原因：会破坏网页事件、React/Vue 状态和原页面结构。

**页面英文比例抽样**：扫描开始前先抽样若干文本节点，估算英文字符占比，低于阈值（建议 30%）直接跳过当前页面，避免在中文/日文页面上浪费 CPU 并防止偶发英文片段被误高亮。

**默认跳过标签**：

```txt
script, style, textarea, input, select, button, svg, canvas, math, kbd, samp
```

**代码相关标签**（`code`、`pre`）：由 `skipCodeBlocks` 设置控制，默认开启（即默认跳过）。该设置开启时，将上述标签合并到跳过列表；关闭时仅跳过非代码相关标签。目标用户经常阅读技术文档，因此推荐保持默认开启。

**专有名词处理**：在句中（非句首位置）以大写字母开头的 token 默认不参与高亮判定，避免把 React、Apple、Twitter 这类品牌/项目名当作生词。

## 19. 动态内容处理

使用 MutationObserver 处理动态加载内容。

要求：

- 使用 debounce，避免频繁扫描导致卡顿
- 只扫描新增节点
- 跳过已处理节点
- 不针对每个网站做深度适配
- **SPA 路由切换兼容**：GitHub、Twitter 等 SPA 切页不会重新触发 `document_idle`，依赖 MutationObserver 触发对新内容的扫描。

**iframe 处理**：MVP 不支持任何 iframe。manifest 的 `content_scripts.all_frames` 保持默认值 `false`，content script 只注入到主框架。第三方 widget、Twitter embed、广告 iframe 等不会被处理。

目标支持：

- GitHub README
- 技术博客
- 英文文档网站
- Reddit 普通页面
- X/Twitter 普通文本
- Medium
- MDN
- 普通英文网页

## 20. Popup 设计

Popup 保持简单，只做快速控制。

包含：

- 插件总开关
- 当前网站启用/禁用
- 自动发音开关
- 进入设置页按钮

不做任何统计面板。

## 21. Options 设置页

Options 页面包含：

```txt
我的英语水平：
[ A2 ▼ ]

高亮范围：
[x] 包含当前等级词
[x] 高亮 B2+/未分级高级词

当前会高亮：
A2、B1、B2、B2+/未分级词

高亮样式：
[x] 虚线下划线（默认）
[ ] 实线下划线
[ ] 直接改变文字颜色

高亮颜色：
[#4d4d4d] 默认灰

释义语言：
( ) 仅中文
( ) 仅英文
(x) 中英同时显示（默认）

发音设置：
[x] hover 自动朗读（默认开启）
语言：美音 en-US
语速：0.9

自定义词：
输入单词
添加
删除

排除词：
输入单词
添加
删除
```

## 22. 权限设计

最小权限：

```json
{
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://*/*", "http://*/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

不使用远程 API，所以不需要：

- host_permissions
- identity
- tabs
- cookies
- history

说明：由于 `content_scripts.matches` 覆盖所有站点，Chrome 在安装时仍会展示"读取和更改你访问的所有网站上的数据"权限提示。这是注入 content script 的必要代价，并非真的请求 host_permissions。文案上需要在隐私章节告知用户：该权限仅用于本地扫描文本，扩展不读取也不上传页面内容。

## 23. 隐私原则

插件默认：

- 不上传网页内容
- 不上传生词
- 不需要账号
- 不需要后端
- 不调用 AI
- 不调用远程翻译 API
- 所有用户数据（设置、自定义词、排除词、词典查询）保存在本地浏览器

**关于发音**：扩展本身不联网。但发音功能调用浏览器原生 `speechSynthesis`，Chrome 在某些平台/语音上会通过 Google 在线 TTS 合成音频，文本可能离开本机。如果用户介意，可以在系统语音列表中选择本地语音，或关闭发音功能。

隐私文案：

> 本扩展本身完全本地运行：网页内容、词库、生词和设置不会被扩展上传到任何服务器。扩展安装时所需的"读取和更改你访问的所有网站上的数据"权限，仅用于在本地浏览器内扫描页面文本，不会读取也不会上传任何页面内容。注意：发音功能调用浏览器原生 Web Speech API，部分系统语音由浏览器/操作系统在线合成，这部分行为由浏览器控制，不在本扩展掌控范围内。

## 24. 性能要求

判定阶段使用内存索引，全程同步；释义阶段仅在 hover 时触发，走 IndexedDB 异步。指标按阶段拆分：

| 阶段 | 指标 | 目标 |
|---|---|---|
| 启动 | 内存索引构建（首次） | 后台完成，不阻塞页面，2 秒内可用 |
| 启动 | 内存索引构建（已缓存） | 200ms 内 |
| 判定 | 普通文章页扫描 + 包裹 | 500ms 内（含 tokenize 与 wrap） |
| 判定 | 大型文档页扫描 + 包裹 | 1500ms 内 |
| 判定 | 单 token 内存判定（同步） | 微秒级，不计入预算 |
| 释义 | hover 后查 IndexedDB 拿释义 | 50ms 内（单词） |
| 渲染 | hover 卡片出现延迟 | 300ms（含查词） |
| 体感 | 页面滚动 / 输入 | 不明显卡顿 |

优化策略：

- 判定相关索引（`levelWordMap`、`advancedWordSet`、`lemmaMap`、`customWords`、`excludedWords`）启动期一次性加载到内存，扫描热路径只做内存查询。
- 分批扫描文本节点，使用 `requestIdleCallback` 切片。
- MutationObserver debounce。
- 跳过已处理节点，跳过代码块和输入框。
- 释义查询结果在内存做 LRU 缓存。
- 同一单词短时间不重复朗读。
- 大页面对 token 数量设置上限（如 50000），超过则只处理可视区附近。

## 25. 验收标准

### 25.1 A2 用户高亮 A2 及以上

```gherkin
Given 用户水平设置为 A2
And 包含当前等级词为开启
When 用户打开英文网页
Then A2、B1、B2、B2+/未分级高级词应该被高亮
And A1 词不应该被高亮
```

### 25.2 关闭包含当前等级词

```gherkin
Given 用户水平设置为 A2
And 包含当前等级词为关闭
When 用户打开英文网页
Then B1、B2、B2+/未分级高级词应该被高亮
And A1、A2 词不应该被高亮
```

### 25.3 排除词不高亮

```gherkin
Given 单词 "developer" 已加入排除词
When 用户打开包含 "developer" 的网页
Then "developer" 不应该被高亮
```

### 25.4 自定义词强制高亮

```gherkin
Given 用户把 "middleware" 加入自定义词库
When 用户打开包含 "middleware" 的网页
Then "middleware" 应该被高亮
```

### 25.5 hover 展示卡片

```gherkin
Given 页面中某个单词已被高亮
When 用户鼠标悬停该词超过 300ms
Then 页面应该显示释义卡片
And 卡片包含单词、音标、中文释义和发音按钮
```

### 25.6 hover 自动发音

```gherkin
Given 用户开启了 hover 自动朗读
And 页面中某个单词已被高亮
When 用户鼠标悬停该词并显示卡片
Then 浏览器应该使用 en-US 朗读该单词
```

### 25.7 不再提示

```gherkin
Given 页面中 "scale" 被高亮
When 用户在卡片中点击 "不再提示"
Then "scale" 应加入排除词
And 当前页面中的 "scale" 高亮应被移除
And 后续页面不再高亮 "scale"
```

### 25.8 词形还原

```gherkin
Given 用户水平为 A2 且 "deploy" 属于 B1 级
When 用户打开包含 "deployed" / "deploying" / "deploys" 的网页
Then 这些变形形式都应该被高亮，且 hover 后显示的释义是 "deploy" 的释义
```

### 25.9 词形还原歧义优先原词

```gherkin
Given "left" 本身存在于 CEFR-J 词表（形容词/名词）
When 页面中出现 "the left side"
Then "left" 按其本身的等级判定，而不是被错误归到 "leave" 的过去式
```

### 25.10 页面语言抽样跳过

```gherkin
Given 当前页面英文字符占比低于 30%（如纯中文新闻页）
When content script 完成抽样
Then 不应扫描该页面任何文本
And 不应有任何单词被高亮
```

### 25.11 B2+ 词频过滤

```gherkin
Given 单词 "Aaronic" 在 ECDICT 中存在但 BNC 排名 > 20000
And 用户开启了 highlightAdvancedUnknownWords
When 用户打开包含 "Aaronic" 的网页
Then "Aaronic" 不应该被高亮
```

### 25.12 暗色模式下高亮可读

```gherkin
Given 用户的网页处于暗色模式
When 页面中出现高亮词
Then 高亮装饰颜色应有足够对比度
And 不应继承原页面文本色导致不可见
```

### 25.13 中英释义同时显示

```gherkin
Given definitionLang 设置为 "both"
When 用户 hover 一个高亮词并显示卡片
Then 卡片应同时显示中文释义（ECDICT translation）和英文释义（ECDICT definition）
And 中文释义在上、英文释义在下
```

## 26. 开发里程碑

### Milestone 1：工程初始化

- 创建 WXT 项目
- 配置 React + TypeScript
- 创建 popup 页面
- 创建 options 页面
- content script 注入成功

### Milestone 2：本地词库和设置

- 用 `build-cefrj-levels.ts` 从 CEFR-J 数据生成 A1/A2/B1/B2 JSON 并内置
- 实现 userLevel 设置
- 实现 includeCurrentLevel 设置
- 实现 highlightAdvancedUnknownWords 设置
- 实现 customWords 和 excludedWords 存储
- 实现 definitionLang / highlightMode 设置

### Milestone 3：网页高亮

- TreeWalker 扫描文本节点
- 页面英文比例抽样判定
- 英文 tokenize + 大写专有名词跳过
- shouldHighlight 判断（同步，查 content script 本地内存索引）
- span 包裹目标词，使用 dashed underline 默认样式 + 暗色模式适配
- 跳过 code/pre/input 等标签（受 skipCodeBlocks 控制）
- iframe 不处理（`all_frames: false`）

### Milestone 4：词典接入

- 编写 `build-ecdict-subset.ts`，按 BNC ≤ 50000 裁剪生成子集（约 5-10MB）
- 子集打包进扩展并首次启动写入 IndexedDB
- worker 构建内存索引：`levelWordMap`、`advancedWordSet`（BNC ≤ 20000）、`lemmaMap`（来自 `exchange`）
- 实现 content script 启动期向 worker 拉取索引快照的消息协议
- 设置变更时 worker 主动广播新快照
- 按 word 查询 IndexedDB 拿释义（中英文）
- 返回音标和中英释义

### Milestone 5：Tooltip 和发音

- hover 显示卡片
- 展示单词、音标，按 definitionLang 显示中文/英文/中英释义
- 实现 en-US 发音
- 卡片内点击按钮朗读（默认行为）
- hover 自动朗读作为可选项（默认开启）
- 实现"不再提示"加入排除词
- 卡片不包含"加入词库"按钮

### Milestone 6：设置页

- 设置我的英语水平
- 设置是否包含当前等级词
- 设置是否高亮 B2+/未分级词
- 管理自定义词
- 管理排除词
- 设置高亮样式（dashed underline / underline / text color）和独立高亮颜色
- 设置释义语言
- 设置是否 hover 自动发音（默认开启）

### Milestone 7：性能与兼容性回归

- 在 GitHub README / MDN / 长博客 / Reddit / X 等代表性页面跑性能指标
- 检查中文页面英文比例抽样是否生效
- 验证 MutationObserver debounce 与 SPA 路由切换兼容
- 验证 service worker 休眠/唤醒不影响 content script 判定
- 验证暗色模式高亮可读性
- 量化内存占用（content 索引 × N tab + 释义 LRU 缓存）
- 校验 ECDICT MIT 与 CEFR-J 协议署名已在 about 页与 README 写明

## 27. 最终 MVP 范围

最终只做这些：

- Chrome 扩展
- WXT + React + TypeScript
- ECDICT 裁剪子集（BNC ≤ 50000，5-10MB），直接打包
- CEFR-J Wordlist 作为 A1/A2/B1/B2 分级词库
- B2+/未分级高级词提示（BNC ≤ 20000 过滤）
- ECDICT `exchange` 词形还原（lemma 反查表，原词优先于 lemma）
- 根据用户水平自动计算高亮范围
- 网页目标词高亮（含页面英文比例抽样、专有名词跳过、dashed underline + 暗色适配）
- hover 释义卡片（默认中英同时显示）+ 点击发音
- 默认美音 en-US（hover 自动朗读默认开启，可在设置中关闭）
- 自定义词（仅在 Options 页管理）
- 排除词（卡片"不再提示"或 Options 页）
- content script 启动期从 worker 拉取判定索引快照，热路径全程同步
- 仅注入主框架（`all_frames: false`），不处理 iframe
- 本地存储
- 无后端
- 无账号
- 无云同步
- 无 AI
- 无全文翻译
- 无首次水平评估引导（默认 A2，用户自己调）

核心逻辑：

```txt
旧逻辑：用户勾选 A2 → 只高亮 A2
新逻辑：用户水平 A2 → 高亮 A2 及以上，也就是 A2 + B1 + B2 + B2+
```

这才符合真实学习场景。
