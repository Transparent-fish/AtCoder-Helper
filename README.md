<p align="center">
  <a href="https://git.io/typing-svg">
    <img
      src="https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&width=435&lines=AtCoder+Helper+++++--++++%E4%BD%A0%E7%9A%84+AtCoder+%E5%8A%A9%E6%89%8B"
      alt="Typing SVG"
    />
  </a>
</p>

<p align="center">
  <strong>VS Code 插件 — AtCoder 题目浏览 & 报名</strong><br>
  <sub>Turborepo · TypeScript · React WebView · Tailwind CSS · KaTeX</sub>
</p>

<!-- toc -->

[特性](#特性) • [项目结构](#项目结构) • [快速开始](#快速开始) • [开发指南](#开发指南) • [发布](#发布) • [常见问题](#常见问题) • [许可证](#许可证)

<!-- tocstop -->

VS Code 插件，支持浏览 AtCoder 竞赛题目、LaTeX 数学公式渲染、DeepL 翻译、提交代码与判题跟踪、评级/非评级报名、榜单与提交详情查看。

## 特性

- 📋 **题目浏览** — 输入比赛代号，一键加载所有题目列表与题面
- 📐 **LaTeX 渲染** — 服务端 KaTeX 预渲染，WebView 直接展示
- 🌐 **DeepL 翻译** — 题面段落自动翻译为中文（免费接口 / 官方 API 双模式）
- 📝 **报名比赛** — 支持评级（Rated）/ 非评级报名，自动处理 CSRF 与多步骤表单
- 📤 **提交代码** — 内置提交面板，提交后自动轮询判题状态
- 🧾 **提交历史 & 详情** — 查看个人提交列表、代码、逐测试点判定（Judge Result）
- 🏆 **实时榜单** — 读取 Standings JSON，查看排名与得分
- 🏠 **首页比赛列表** — 侧边栏展示进行中 / 即将开始 / 最近 / 每日比赛
- 🔗 **CPH 导出** — 一键导入 Competitive Programming Helper
- 🔑 **Cookie 登录** — 安全存储 REVEL_SESSION，自动注入请求
- 🎨 **主题适配** — WebView 自动跟随 VS Code 主题

## 项目结构

```
.
├── apps/
│   └── vscode-extension/         # 插件主程序（webpack 打包）
│       ├── src/
│       │   ├── extension.ts            # 插件入口，激活 & 面板创建
│       │   ├── viewProvider.ts         # 侧边栏 WebviewView Provider
│       │   ├── atcoder.ts              # AtCoder 爬虫 & 题面解析
│       │   ├── atcoder.test.ts         # 单元测试（mocha）
│       │   └── tools/
│       │       ├── command.ts          # 消息分发路由
│       │       ├── handle.ts           # 各命令 handler
│       │       ├── fetch.ts            # HTTP 客户端（代理绕过 / CF 挑战 / 登录检测）
│       │       ├── webview.ts          # WebView HTML 模板与全局变量注入
│       │       ├── submit.ts           # 提交代码（fetchSubmitPage / submitCode）
│       │       ├── submission.ts       # 提交详情 & Judge Result 解析
│       │       ├── SignUpContest.ts    # 报名逻辑（Rated / 非 Rated）
│       │       ├── standings.ts        # 榜单 JSON 拉取
│       │       ├── homepage.ts         # 首页比赛列表解析
│       │       ├── deepl.ts            # DeepL 翻译（免费 / API）
│       │       ├── cph.ts              # CPH 问题构建与导出
│       │       ├── copy.ts             # Markdown 复制
│       │       ├── types.ts            # IncomingMessage / 提交记录类型
│       │       └── i18n/               # zh / en 文案
│       ├── webpack.config.js           # 构建 extension.js 与 webview.js
│       ├── package.json                # 扩展清单（atc-helper v1.1.2）
│       └── img.png                     # 扩展图标
│
├── packages/
│   ├── core/                   # @template/core — MessageBus / StateManager
│   ├── ui/                     # @template/ui — React 组件库（Button/Card/Input/Spinner）
│   └── webview/                # @template/webview — WebView 前端（React + Tailwind + KaTeX）
│       └── src/
│           ├── index.tsx               # 入口，按 mode 分发四种应用
│           ├── WebviewApp.tsx          # 编辑器主视图
│           ├── SidebarApp.tsx          # 侧边栏（比赛列表 / 提交历史 / 登录）
│           ├── ContestApp.tsx          # 单场比赛面板（Info/Task/Submit/Rating）
│           ├── SubmissionDetailApp.tsx # 提交详情页
│           ├── VSCodeProvider.tsx      # VS Code API 上下文
│           ├── types.ts                # WebviewMessage / SubmissionDetail
│           ├── hooks/                  # useWebviewMessage / useTranslation
│           ├── components/             # ProblemView / HtmlContent / SubmitPanel 等
│           ├── utils/                  # format / status 工具
│           ├── i18n/                   # zh / en
│           └── styles.css              # Tailwind + KaTeX
│
├── docs/
│   └── Standard.md              # 编码规范
│
├── scripts/
│   └── check-functions.mjs      # 行数检查（ts 函数 ≤80 行 / tsx 文件 ≤600 行）
│
├── .github/workflows/
│   └── pr-review.yml            # PR CI：lint + build + test + 行数检查
│
├── release/
│   └── extension.vsix           # 打包输出
│
├── pnpm-workspace.yaml          # 工作区配置
└── turbo.json                   # Turborepo 配置
```

### 目录说明

| 目录 | 职责 |
|------|------|
| `apps/vscode-extension` | 插件入口、消息路由、AtCoder 爬虫、HTTP 工具、提交与报名 |
| `packages/core` | 核心业务逻辑（MessageBus, StateManager） |
| `packages/ui` | React 组件库（Button, Card, Input, Spinner） |
| `packages/webview` | WebView 前端应用（React + Tailwind + KaTeX） |
| `docs/Standard.md` | 编码规范 |

## 快速开始

### 安装

```bash
pnpm install
```

### 开发

```bash
# 启动监听模式（自动编译扩展与 WebView）
pnpm dev
```

### 调试

1. VS Code 中按 `F5`（已预配置 launch.json）
2. 侧边栏点击 AtCoder Helper 图标打开比赛列表，或 `Ctrl+Shift+P` → `AtCoder Helper (Editor)`
3. 输入比赛代号（如 `abc345`）→ 加载题目 → 浏览 / 翻译 / 报名 / 提交

### 设置 Cookie（用于报名 & 登录后题目）

1. 浏览器登录 https://atcoder.jp
2. F12 → Application → Cookies → 复制 `REVEL_SESSION` 的 Value
3. VS Code 中 `Ctrl+Shift+P` → `Set AtCoder Login Cookie`（或在侧边栏底部登录区域粘贴保存）

### 设置 DeepL API Key（用于官方 API 翻译模式）

`Ctrl+Shift+P` → `Set DeepL API Key`（免费模式无需配置）

## 开发指南

### 脚本

```bash
pnpm build          # 编译所有包（turbo build）
pnpm dev            # 开发监听模式（turbo dev）
pnpm lint           # ESLint 检查（turbo lint）
pnpm format         # Prettier 格式化
pnpm test           # 运行单元测试（turbo test，apps/vscode-extension）
pnpm clean          # 清理构建产物
```

### 编码规范

详见 [docs/Standard.md](docs/Standard.md)，包括：

- 文件名：组件 PascalCase，工具 camelCase
- TypeScript：优先 `interface`，避免 `any`
- ts 函数不超过 **80 行**；tsx 文件不超过 **600 行**（CI 用 `scripts/check-functions.mjs` 检查）
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
- 检查 `dist/extension.js` 与 `dist/webview.js` 是否存在

**报名 / 提交失败？**
- 确认已设置 AtCoder Cookie
- Cookie 可能过期，重新登录获取

**LaTeX 不渲染？**
- KaTeX 在扩展端预渲染，WebView 只需 CSS
- 检查控制台是否有字体加载错误

**Cloudflare 挑战？**
- 扩展会提示在浏览器中打开对应页面完成人机验证后重试

## 许可证

MIT
