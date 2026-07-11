# VS Code Boilerplate — 项目深度概览

## 项目概述

VS Code 扩展 + WebView 面板，用于爬取和浏览 AtCoder 竞赛题目。支持 HTML/LaTeX 渲染和 DeepL 翻译。

## 技术栈

| 层 | 技术 |
|---|---|
| 扩展宿主 | VS Code Extension API (Node.js) |
| 打包 | pnpm workspace + Turbo + Webpack |
| WebView UI | React 18 + TypeScript |
| 样式 | Tailwind CSS + KaTeX |
| 爬取 | Node.js https (stream + zlib) |
| 翻译 | DeepL API |
| 数学渲染 | KaTeX (服务端预渲染) |

## 目录结构

```
vscode-boilerplate/
├── apps/vscode-extension/      # VS Code 扩展入口
│   ├── src/
│   │   ├── extension.ts        # 激活/注销, 注册命令, 创建 WebView, DeepL 翻译
│   │   ├── atcoder.ts          # AtCoder 爬虫 + HTML 清理 + KaTeX 预渲染
│   │   └── atcoder.test.ts     # 爬虫测试
│   ├── webpack.config.js       # 双入口: extension.js (Node) + webview.js (Web)
│   └── package.json            # 扩展清单 (publisher, contributes, scripts)
├── packages/
│   ├── core/                   # @template/core — MessageBus, StateManager
│   ├── ui/                     # @template/ui — Button, Card, Input, Spinner
│   └── webview/                # @template/webview — React WebView App
│       └── src/
│           ├── WebviewApp.tsx  # 主组件: 加载竞赛/题目/翻译/渲染
│           ├── VSCodeProvider.tsx  # VS Code API 上下文提供者
│           ├── HtmlContent.tsx # HTML + KaTeX 渲染组件
│           ├── types.ts        # 消息类型定义
│           ├── styles.css      # Tailwind + KaTeX CSS + HTML 内容样式
│           └── index.tsx       # 入口
├── end/                        # 打包输出目录 (extension.vsix)
└── DEEP.md                     # 本文件 — AI 提示词
```

## 构建与运行

```bash
# 开发 (watch)
pnpm dev

# 构建
pnpm build

# 打包为 .vsix
cd apps/vscode-extension
node ../../node_modules/@vscode/vsce/vsce package --no-dependencies --allow-missing-repository
# 输出到 end/extension.vsix

# 运行测试
npx tsx src/atcoder.test.ts
```

## 数据流

```
用户输入竞赛代号 (abc345)
  → WebView postMessage({ command: "loadContest" })
    → Extension fetchAtCoderTasks() → 爬取 /contests/{contest}/tasks
      → WebView 展示题目列表
        → 用户点击题目
          → postMessage({ command: "loadProblem" })
            → Extension fetchAtCoderProblem() → 爬取 /contests/{contest}/tasks/{task}
              → parseProblemPage() 解析 HTML
                → renderMath() 用 KaTeX 预渲染 LaTeX 数学公式
                  → WebView 用 HtmlContent (dangerouslySetInnerHTML) 渲染
```

## 关键代码约定

### 爬虫 (atcoder.ts)
- `fetchText(url)` — 带浏览器头 + gzip/brotli 解压的通用 HTTP 请求，检测 Cloudflare 挑战
- `cleanHtmlTags()` — 白名单标签过滤，保留 `<p><ul><li><code><pre><strong><em><a>` 等
- `renderMath()` — 优先保护 `\(...\)` / `\[...\]` 和 `<var>`，用 KaTeX `renderToString` 替换，失败时 fallback 显示源码
- `extractSection()` — 按 `<h3>` 标题提取英文/日文题面章节
- `AtCoderProblem` — 返回 `{ statement, constraints, inputFormat, outputFormat, samples }` 均为含 HTML 的字符串

### WebView (WebviewApp.tsx)
- `useVSCode()` — 通过 `postMessage` 与扩展通信
- `HtmlContent` — 封装 `dangerouslySetInnerHTML` 的组件，配合 KaTeX CSS 显示数学公式
- `TranslatedBlock` — 翻译结果带左边框缩进
- 消息类型: `tasks`, `problem`, `loading`, `error`, `cf_challenge`, `translation`

### 通信协议
- WebView → Extension: `postMessage({ command, contest, task, payload, targetLang })`
- Extension → WebView: `postMessage({ type, tasks, problem, text, translated, url })`

### CSS 命名空间
- `.html-content` — 所有 HTML 渲染内容的容器类
- `.katex` / `.katex-display` — KaTeX 数学公式样式
- `.math-fallback` — KaTeX 渲染失败时的备用样式

### 依赖管理
- `katex` 添加在 `apps/vscode-extension` 中（服务端预渲染），同时也在 `packages/webview` 中（仅用于 CSS）
- Webpack `asset/inline` 规则处理 KaTeX 字体文件

## 常见任务指南

### 添加新的爬虫站点
1. 在 `apps/vscode-extension/src/` 下新建 `xxx.ts`
2. 实现 `fetchXxxTasks()` 和 `fetchXxxProblem()` 函数
3. 在 `extension.ts` 中注册新的消息命令处理分支

### 修改 UI 组件
- 组件在 `packages/ui/src/components/` 下
- 使用 Tailwind 类名 + VS Code CSS 变量 (`--vscode-*`)

### 添加新的 WebView 消息
1. 在 `packages/webview/src/types.ts` 的 `WebviewMessage` 中添加字段
2. 在 `extension.ts` 的 `onDidReceiveMessage` 中添加 case
3. 在 `WebviewApp.tsx` 的 `handleMessage` 中添加处理

## 注意事项

- **CSP 限制**: WebView 仅允许 `vscode-resource:` 脚本和 `'unsafe-inline'` 样式，不支持 CDN 加载
- **LaTeX 渲染**: 在扩展端 (Node.js) 用 KaTeX 预渲染 HTML，WebView 只负责展示
- **翻译**: DeepL API Key 通过 `context.secrets` 安全存储，需用户手动设置
- **打包**: 使用 `--no-dependencies` 跳过 pnpm 的严格依赖检查
