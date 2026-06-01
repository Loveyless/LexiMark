import { defineConfig } from 'wxt'

// WXT 配置：Manifest V3 / Chrome 主目标 / React 模块
// 入口位于项目根的 entrypoints/，公共数据位于 public/（WXT 默认目录）
//
// 关于 web_accessible_resources：
//   词典 CSV 与分级 JSON 由 service worker 直接 fetch（chrome.runtime.getURL + fetch），
//   service worker 跑在扩展自身的 origin，无需在 web_accessible_resources 中声明。
//   如果未来改成 content script 直接 fetch 这些文件，再加回声明。
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  outDir: '.output',
  manifestVersion: 3,
  manifest: {
    name: 'LexiMark',
    short_name: 'LexiMark',
    description: '本地优先的 Chrome 英语生词高亮扩展：按你的英语水平自动高亮可能不熟的词。',
    version: '0.2.1',
    permissions: ['storage', 'activeTab'],
    action: {
      default_title: 'LexiMark',
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '128': 'icon/128.png',
      },
    },
  },
})
