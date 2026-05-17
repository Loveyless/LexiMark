# LexiMark 实施细节设计文档

> 与 `LexiMark_PRD_v0.2.md` 配对使用。
>
> PRD 负责"做什么"，本文负责"怎么做"。所有产品语义层的内容以 PRD 为准；本文档只描述实现层的算法、数据结构、协议、兜底策略。实现细节变化只更新本文档，不动 PRD。

---

## 1. Tokenize 规则

### 1.1 切词正则

```ts
const TOKEN_REGEX = /[A-Za-z]+(?:['’\-][A-Za-z]+)*/g
```

覆盖：

- 纯英文词：`deploy`
- 撇号缩写：`don't` / `it's` / `we're`（直引号 `'` 与 Unicode 弯引号 `’` 都接）
- 连字符复合词：`state-of-the-art` / `well-known` 作为整体匹配

不覆盖（按需扩展）：

- 数字混合：`H2O`、`C3PO` —— 不参与判定
- 缩写带点：`U.S.` / `e.g.` —— `.` 不在正则里，会被切成 `U` / `S`，由全大写规则跳过
- 符号词：`R&D` / `C++` —— `&` `+` 不在正则里，会被切碎，几乎不会命中词库

### 1.2 大小写与归一化

伪代码：

```ts
function normalizeToken(raw: string): {
  display: string         // 原样保留，用于显示和包裹
  normalized: string      // 用于判定查询
  isAllCaps: boolean      // 是否全大写
  isCapitalized: boolean  // 首字母大写 + 其余小写
} {
  const lower = raw.toLowerCase()
  return {
    display: raw,
    normalized: lower,
    isAllCaps: raw.length >= 2 && raw === raw.toUpperCase(),
    isCapitalized: /^[A-Z][a-z]+$/.test(raw),
  }
}
```

判定时先用 `normalized` 在 CEFR-J / ECDICT 子集里命中（命中则按原词处理，符合 PRD §8.5 的"原词优先"）；命中失败再走 lemma 反查。

---

## 2. 专有名词与缩写跳过规则

按以下顺序判断，命中即跳过判定：

1. **全大写且长度 ≥ 2**：判定为缩写（`NASA` / `API` / `URL` / `SQL`），不参与高亮。
2. **camelCase / PascalCase**（含至少一个内部大写字母，如 `useState` / `LexiMark`）：判定为标识符，不参与高亮。tokenize 正则只切到字母段，理论上不会出现，但用户可能输入；保险起见判断一次。
3. **首字母大写 + 非句首位置**：判定为专有名词。"句首"定义：
   - 该 token 在所在文本节点的第一个匹配位置，且其前面文本（trim 后）为空，**或**前一个非空白字符是 `.` / `!` / `?` / `\n` / `:` 之一。
   - 否则视为句中，跳过判定。
4. **首字母大写 + 句首**：先把首字母转小写再走判定流程（例：句首的 `Deploy the service`）。

实现要点：判句首需要往前看至少 2-3 个字符，配合 token 的 `index`（`exec` 时拿）做。

---

## 3. 页面英文比例抽样

### 3.1 时机

content script 启动 → 等 `document.readyState === 'interactive'` 或更晚 → 抽样判断 → 比例 ≥ 30% 才继续注册扫描；否则当前页面整体跳过（仍保留 popup 中的"当前页面开启"按钮以便手动覆盖，但 popup 的实现归 §20）。

### 3.2 算法

```ts
function isPageMostlyEnglish(): boolean {
  const SAMPLE_NODE_LIMIT = 50
  const SAMPLE_CHAR_LIMIT = 4000
  const THRESHOLD = 0.3

  let text = ''
  const walker = document.createTreeWalker(
    document.body, NodeFilter.SHOW_TEXT,
    { acceptNode: (n) => isInSkippedTag(n.parentElement) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }
  )

  let nodeCount = 0
  while (walker.nextNode() && nodeCount < SAMPLE_NODE_LIMIT && text.length < SAMPLE_CHAR_LIMIT) {
    text += walker.currentNode.nodeValue ?? ''
    nodeCount++
  }

  const compact = text.replace(/\s+/g, '')
  if (compact.length < 50) return true  // 文本太少，宁可走默认路径

  const asciiLetters = (compact.match(/[A-Za-z]/g) ?? []).length
  return asciiLetters / compact.length >= THRESHOLD
}
```

阈值 30% 是经验值，可放进 constants 便于调参。中英混排的技术博客通常英文字符占比 35%+，纯中文新闻页面 < 5%。

---

## 4. DOM Wrap 实现

### 4.1 基本约束

- 只在单个文本节点内匹配并包裹，不跨节点。
- 不修改 `innerHTML`，避免破坏事件监听器和框架状态。
- 包裹元素：`<span class="leximark-hl" data-word="deploy">deployed</span>`，`data-word` 存归一化后的原型词，供 hover 查询释义用。

### 4.2 单文本节点的处理

伪代码：

```ts
function wrapMatchesInTextNode(node: Text, matches: TokenMatch[]) {
  if (matches.length === 0) return
  const parent = node.parentNode
  if (!parent) return

  const frag = document.createDocumentFragment()
  let cursor = 0
  for (const m of matches) {
    if (m.start > cursor) {
      frag.appendChild(document.createTextNode(node.nodeValue!.slice(cursor, m.start)))
    }
    const span = document.createElement('span')
    span.className = 'leximark-hl'
    span.dataset.word = m.lemma
    span.textContent = node.nodeValue!.slice(m.start, m.end)
    frag.appendChild(span)
    cursor = m.end
  }
  if (cursor < node.nodeValue!.length) {
    frag.appendChild(document.createTextNode(node.nodeValue!.slice(cursor)))
  }
  parent.replaceChild(frag, node)
}
```

要点：

- 用 `DocumentFragment` 一次性 replace，减少 reflow。
- 不用 `Range.surroundContents`：它对包含多个子节点的 Range 会抛错，且不如手写直观。
- 替换后该 text node 已被销毁，原引用失效。MutationObserver 自身会忽略这次 mutation（通过 marker class 标记）。

### 4.3 MutationObserver 自反馈防护

包裹操作本身会触发 MutationObserver。防止死循环：

- 在 wrap 前后设置 `isProcessing = true` 标记，observer 回调里检查该标记直接 return。
- 备用：在 observer 回调里跳过 `target.classList.contains('leximark-hl')` 或父节点带 `data-leximark-processed` 的节点。

---

## 5. 数据来源与转换脚本

### 5.1 CEFR-J Wordlist

- 来源：CEFR-J 官网 / GitHub 公开版本（`CEFR-J Wordlist Version 1.6` 或最新版）。下载 Excel 格式。
- 协议：CC BY-SA 4.0。需在 README 与 about 页保留署名与协议链接。

转换脚本 `scripts/build-cefrj-levels.ts`：

```txt
读取 CEFR-J Excel
↓
每条记录可能含多个 POS + 不同等级，按 (headword, level) 聚合
↓
同一 headword 出现多个等级时，取最低等级（A1 优先于 A2）
↓
小写化 + 去重
↓
按等级拆分为 a1.json / a2.json / b1.json / b2.json
↓
JSON 格式：{ "words": ["abandon", "ability", ...] }
```

特殊处理：

- headword 含空格的短语（`a lot of`）：MVP 不处理，丢弃。
- 同一 headword 不同 POS 不同等级：取最低等级。
- 大小写：全部小写化，依赖 §1 的 normalize。

### 5.2 ECDICT

- 来源：`https://github.com/skywind3000/ECDICT` 的 `ecdict.csv` 或 sqlite 包。
- 协议：MIT。

转换脚本 `scripts/build-ecdict-subset.ts`：

```txt
读取完整 ECDICT
↓
过滤条件：bnc <= 50000 OR (bnc == 0 AND frq <= 50000)
↓
保留字段：word, phonetic, translation, definition, pos, exchange, bnc, frq
↓
输出 ecdict.subset.csv
↓
扩展首次启动时读取 CSV 并写入 IndexedDB
```

`exchange` 字段格式（来自 ECDICT 文档）：

```txt
p:past/d:past_participle/i:present_participle/3:third_person_singular/r:comparative/t:superlative/s:plural/0:lemma/1:lemma_type
```

构建 lemmaMap 时，遍历每条记录，对每个 inflected 形式建立 `inflected → word` 映射，并以"原词优先"为前提（见 §6）。

---

## 6. 词形还原 lemmaMap 构建

```ts
function buildLemmaMap(entries: DictEntry[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of entries) {
    if (!e.exchange) continue
    const parts = e.exchange.split('/')
    for (const part of parts) {
      const [type, form] = part.split(':')
      if (!form || !type) continue
      if (!['p', 'd', 'i', '3', 'r', 't', 's'].includes(type)) continue
      const inflected = form.toLowerCase().trim()
      if (!inflected || inflected === e.word) continue
      // 原词优先：若 inflected 本身是另一个 entry 的 lemma，跳过
      if (entryWordSet.has(inflected)) continue
      // 冲突时不覆盖（保留先到的）；可考虑取 bnc 排名更靠前的为准
      if (!map.has(inflected)) {
        map.set(inflected, e.word)
      }
    }
  }
  return map
}
```

注意：

- `entryWordSet` 是所有 ECDICT 子集词条原型的 Set，提前构建一次。
- "冲突时不覆盖"是当前策略，能满足绝大多数场景。如发现误归严重，再切换到"按 bnc 排名取更常见词的 lemma"。

---

## 7. 存储 Schema

### 7.1 chrome.storage.local

| Key | Value 类型 | 说明 |
|---|---|---|
| `settings` | `Settings`（PRD §15 定义） | 全部设置一个 key |
| `customWords` | `string[]`（小写词列表） | 自定义强制高亮词，预计上限 几百 个 |
| `excludedWords` | `string[]` | 排除词，预计上限 几千 个 |
| `dictMeta` | `{ version: string, importedAt: number }` | 词典版本与导入时间，用于判断是否需要重导 |

`customWords` / `excludedWords` 不拆分为多 key，写时整组覆盖。预期规模下性能足够；若未来超过 5000 条再考虑分片。

### 7.2 IndexedDB（Dexie）

```ts
class LexiMarkDB extends Dexie {
  entries!: Dexie.Table<DictEntry, string>
  constructor() {
    super('leximark')
    this.version(1).stores({
      entries: 'word, bnc, frq', // word 主键 + bnc/frq 索引
    })
  }
}
```

只用一张表，主键是 `word`（小写）。索引 `bnc` / `frq` 备用（理论上构建 `advancedWordSet` 时可走索引扫描，不必加载全部）。

### 7.3 内存索引（content script 持有）

由 worker 构建后通过 message 一次性下发：

```ts
type IndexSnapshot = {
  version: number                      // 用于 content 判断是否需要刷新
  levelWords: Record<UserLevel, string[]>
  advancedWords: string[]              // BNC ≤ 20000 且不在 levelWords 中
  lemmaPairs: [string, string][]       // inflected → lemma
  customWords: string[]
  excludedWords: string[]
  settings: Settings
}
```

content script 收到后用 `new Map()` / `new Set()` 重建为运行时结构。

---

## 8. 消息协议（worker ↔ content）

所有消息走 `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`，类型字段统一 `type: 'LM_*'` 前缀。

### 8.1 content → worker

| type | payload | 响应 |
|---|---|---|
| `LM_REQUEST_SNAPSHOT` | `{ knownVersion?: number }` | `{ snapshot: IndexSnapshot } \| { upToDate: true }` |
| `LM_QUERY_ENTRY` | `{ word: string }` | `{ entry: DictEntry \| null }` |
| `LM_ADD_EXCLUDED` | `{ word: string }` | `{ ok: true }` |

### 8.2 worker → content（广播）

| type | payload | 触发时机 |
|---|---|---|
| `LM_SNAPSHOT_UPDATED` | `{ version: number }` | 设置变更 / 词库重建后 |

content script 收到后再发 `LM_REQUEST_SNAPSHOT` 拉新快照（避免广播携带大 payload）。

### 8.3 广播实现

```ts
async function broadcastUpdate(version: number) {
  const tabs = await chrome.tabs.query({})
  for (const tab of tabs) {
    if (!tab.id) continue
    chrome.tabs.sendMessage(tab.id, { type: 'LM_SNAPSHOT_UPDATED', version })
      .catch(() => {}) // 没注入 content 的页面会失败，忽略
  }
}
```

---

## 9. 错误兜底

### 9.1 词典首次导入失败

- 写入 IndexedDB 报错 / CSV 解析报错 → 在 popup 显示"词典初始化失败，点击重试"。
- 重试逻辑：删除 IndexedDB 数据库重建。
- 在失败状态下，content script 仍可加载，但 `shouldHighlight` 始终返回 false，等同插件未启用。

### 9.2 content script 拉快照失败

- worker 还在初始化中 → content 重试 3 次，间隔 500ms / 1s / 2s。
- 仍失败 → 静默放弃当前页面（不报错弹窗，避免打扰）。下次页面加载会重试。

### 9.3 service worker 在 content 启动前已休眠

- chrome 会在收到 message 时自动唤醒 worker，所以 `sendMessage` 本身会触发唤醒。
- 唤醒后 worker 需要从 IndexedDB 重建内存索引（首次启动外）。预计耗时 200-500ms。

### 9.4 storage 写入失败

- `chrome.storage.local` 配额是 10MB，正常使用不会超。若超：
  - 在 options 页显示警告。
  - 不强行清理，由用户手动管理 customWords / excludedWords。

### 9.5 内存压力（大页面）

- token 数超过 50000 时（PRD §24），扫描器只处理 viewport ± 2 屏内的文本节点。
- 滚动到新区域时，由 IntersectionObserver 触发增量扫描。
- 该行为对用户透明，无设置项。

---

## 10. 决策记录

记录已敲定的边界决策，避免后续重复讨论。

- **全大写词（`NASA` / `API` / `URL`）**：全跳过，不参与高亮判定。已在 §2 第 1 条体现。
- **存储介质**：全部使用 `chrome.storage.local`，不引入 `chrome.storage.sync`。换设备不继承自定义词/排除词与设置；隐私上保持"所有用户数据保存在本地浏览器"的承诺一致。已在 §7.1 体现。

---

## 附：术语表

- **lemma**：单词原型（`deploy`、`go`、`child`）。
- **inflected form**：变形形式（`deployed`、`went`、`children`）。
- **CEFR**：欧洲共同语言参考标准，等级 A1-C2。
- **BNC**：British National Corpus，英国国家语料库，词频排名。
- **COCA**：Corpus of Contemporary American English，美国当代英语语料库，词频排名。
- **ECDICT**：开源英汉词典数据集。
- **CEFR-J**：日本团队基于 CEFR 整理的词表，开放协议。
