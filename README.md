<p align="center">
  <img src="docs/images/cover.png" alt="Cover" width="100%">
</p>

<h1 align="center">
  <img src="assets/logo.svg" width="32" height="32" alt="Logo" align="top">
  AtCoder Helper
</h1>

<p align="center">
  <strong>VS Code 插件 — AtCoder 题目浏览 & 报名</strong><br>
  <sub>Turborepo · TypeScript · React WebView · Tailwind CSS · KaTeX</sub>
</p>

<!-- toc -->

[特性](#特性) • [项目结构](#项目结构) • [快速开始](#快速开始) • [开发指南](#开发指南) • [常见问题](#常见问题) • [许可证](#许可证)

<!-- tocstop -->

VS Code 插件，支持浏览 AtCoder 竞赛题目、LaTeX 数学公式渲染、DeepL 翻译、评级/非评级报名。

## 特性

- 📋 **题目浏览** — 输入比赛代号，一键加载所有题目列表
- 📐 **LaTeX 渲染** — 服务端 KaTeX 预渲染，WebView 直接展示
- 🌐 **DeepL 翻译** — 选中题面段落，自动翻译为中文
- 📝 **报名比赛** — 支持评级（Rated）/ 非评级报名
- 🔑 **Cookie 登录** — 安全存储 REVEL_SESSION，自动注入请求
- 🎨 **主题适配** — WebView 自动跟随 VS Code 主题

## 项目结构

```
.
├── apps/
│   └── vscode-extension/       # VS Code 插件主程序
│       ├── src/
│       │   ├── extension.ts          # 插件入口，消息路由
│       │   ├── atcoder.ts            # AtCoder 爬虫 & 题面解析
│       │   ├── SelectContest.ts      # 报名逻辑（fetchContest / signedUpContest）
│       │   ├── atcoder.test.ts       # 单元测试
│       │   └── tools/
│       │       ├── fetch.ts          # HTTP 请求工具 & 网络错误类
│       │       └── deepl.ts          # DeepL 翻译 API
│       ├── webpack.config.js         # Webpack 构建配置
│       └── package.json              # 扩展清单
│
├── packages/
│   ├── core/                   # @template/core — 核心工具
│   ├── ui/                     # @template/ui — React 组件库
│   └── webview/                # @template/webview — WebView 应用
│
├── docs/
│   ├── images/
│   └── Standard.md             # 编码规范文档
│
├── .github/workflows/
│   └── pr-review.yml           # PR 自动审查流程
│
├── pnpm-workspace.yaml         # 工作区配置
└── turbo.json                  # Turborepo 配置
```

### 目录说明

| 目录 | 职责 |
|------|------|
| `apps/vscode-extension` | 插件入口，消息处理，AtCoder 爬虫，HTTP 工具，报名逻辑 |
| `packages/core` | 核心业务逻辑（MessageBus, StateManager） |
| `packages/ui` | React 组件库（Button, Card, Input, Spinner） |
| `packages/webview` | WebView 前端应用（React + Tailwind + KaTeX） |
| `docs/Standard.md` | 编码规范（命名、行数限制、导入顺序等） |

## 快速开始

### 安装

```bash
pnpm install
```

### 开发

```bash
# 启动监听模式（自动编译）
pnpm dev
```

### 调试

1. VS Code 中按 `F5`（已预配置 launch.json）
2. 新窗口中 `Ctrl+Shift+P` → `Show WebView`
3. 输入比赛代号（如 `abc345`）→ 加载题目 → 浏览/翻译/报名

### 设置 Cookie（用于报名 & 登录后题目）

1. 浏览器登录 https://atcoder.jp
2. F12 → Application → Cookies → 复制 `REVEL_SESSION` 的 Value
3. VS Code 中 `Ctrl+Shift+P` → `Set AtCoder Login Cookie`

### 设置 DeepL API Key（用于翻译）

`Ctrl+Shift+P` → `Set DeepL API Key`

## 开发指南

### 脚本

```bash
pnpm build          # 编译所有包
pnpm dev            # 开发监听模式
pnpm lint           # ESLint 检查
pnpm format         # Prettier 格式化
pnpm test:unit      # 运行单元测试（apps/vscode-extension）
pnpm clean          # 清理构建产物
```

### 编码规范

详见 [docs/Standard.md](docs/Standard.md)，包括：

- 文件名：组件 PascalCase，工具 camelCase
- TypeScript：优先 `interface`，避免 `any`
- 函数不超过 **120 行**（可适当放宽至 130）
- 导入顺序：外部 → 内部包 → 相对路径

## 发布

```bash
cd apps/vscode-extension
pnpm package
# 输出: release/extension.vsix
```

## 常见问题

**WebView 不显示？**
- 确保已运行 `pnpm build`
- 检查 `dist/webview.js` 是否存在

**报名失败？**
- 确认已设置 AtCoder Cookie
- Cookie 可能过期，重新登录获取

**LaTeX 不渲染？**
- KaTeX 在扩展端预渲染，WebView 只需 CSS
- 检查控制台是否有字体加载错误

## 许可证

MIT
