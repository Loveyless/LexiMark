<p align="center">
  <img src="public/icon/128.png" width="96" height="96" alt="LexiMark logo">
</p>

<h1 align="center">LexiMark</h1>

<p align="center">
  本地优先的 Chrome 英语生词高亮扩展。按照你的英语水平自动标出网页里可能不熟的英文词，hover 查看释义并支持美音朗读。
</p>

## 特点

- 本地词典：基于 ECDICT 的裁剪子集，安装后即可离线查词。
- 分级高亮：使用 CEFR-J Wordlist 做 A1 / A2 / B1 / B2 分级判定。
- B2+ 提示：本地词典里、不在分级词表中、且 BNC 频率较高的高级词也会被高亮。
- 词形还原：利用 ECDICT `exchange` 字段处理 `deployed`、`deploying`、`went`、`children` 等变形。
- 隐私优先：网页内容、词库、设置和自定义单词都保存在本地浏览器，不上传服务器。
- 可调体验：支持当前网站开关、自动发音、释义语言、高亮颜色、自定义词和排除词。

## 技术栈

- WXT + Chrome Manifest V3
- React + TypeScript
- Tailwind CSS
- Dexie / IndexedDB
- `chrome.storage.local`

## 快速开始

```bash
pnpm install
pnpm dev
```

`pnpm dev` 会生成 `.output/chrome-mv3-dev/`，并启动开发调试。

常用命令：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm zip
```

`pnpm zip` 会生成 Chrome 扩展发布包：`.output/leximark-<version>-chrome.zip`。

## 目录结构

```txt
.
├── entrypoints/
│   ├── background.ts          # Service worker：构建索引、查词、广播更新
│   ├── content.ts             # Content script：扫描文本、高亮、tooltip、发音
│   ├── popup/                 # 扩展弹窗
│   └── options/               # 设置页
├── public/
│   ├── icon/                  # 扩展图标
│   └── data/                  # 运行期词典和分级词表
├── scripts/                   # 词库构建脚本
├── src/
│   ├── background/
│   ├── content/
│   ├── dictionary/
│   ├── speech/
│   ├── storage/
│   ├── ui/
│   └── wordbook/
├── wxt.config.ts
└── package.json
```

## 词典数据

仓库自带一份可运行的词库产物，位于 `public/data/`：

- `public/data/levels/*.json`：CEFR-J A1-B2 分级词表。
- `public/data/dict/ecdict.subset.csv`：ECDICT 裁剪子集。

如需重新生成词库，请先把原始数据放到本地 `data/raw/`，然后运行：

```bash
pnpm data:cefrj <cefrj.csv>
pnpm data:ecdict <ecdict.csv>
```

完整 ECDICT 原始文件体积较大，不提交进仓库。

## 安装扩展

本地开发安装：

1. 运行 `pnpm build`。
2. 打开 Chrome `chrome://extensions/`。
3. 开启 Developer mode。
4. 点击 Load unpacked，选择 `.output/chrome-mv3/`。

发布包：

```bash
pnpm zip
```

然后使用 `.output/leximark-<version>-chrome.zip`。

## 文档

- [产品需求文档](./LexiMark_PRD_v0.2.md)
- [设计说明](./DESIGN.md)

## 隐私

LexiMark 完全在浏览器本地运行。扩展需要读取网页文本，是为了在当前页面内判断和高亮英文单词；这些内容不会被上传，也不会发送到外部服务。

## 许可

项目代码使用 MIT License，见 [LICENSE](./LICENSE)。

第三方词表和词典数据请同时遵守：

- [CEFR-J License](./LICENSE-CEFRJ.txt)
- [ECDICT License](./LICENSE-ECDICT.txt)
