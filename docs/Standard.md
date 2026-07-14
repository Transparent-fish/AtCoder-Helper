# 项目规范

## 项目结构

```
vscode-boilerplate/
├── apps/vscode-extension/     # VS Code 插件主程序
├── packages/core/             # 核心业务逻辑 (@template/core)
├── packages/ui/               # UI 组件库 (@template/ui)
├── packages/webview/          # WebView 前端应用 (@template/webview)
├── docs/                      # 文档
├── assets/                    # 静态资源
├── release/                   # 打包输出
└── tools/                     # 工具函数 (apps/vscode-extension/src/tools/)
```

## 文件名规范

- 文件名应**清晰反映功能**
- React 组件文件使用 **PascalCase**（如 `WebviewApp.tsx`、`HtmlContent.tsx`）
- 工具/逻辑文件使用 **camelCase**（如 `fetch.ts`、`deepl.ts`）
- 类型定义文件使用 **camelCase**（如 `types.ts`）
- 测试文件与源文件同名 + `.test.ts`（如 `atcoder.test.ts`）

## 代码规范

### TypeScript

- 使用 **4 空格** 缩进
- 使用 **camelCase** 命名变量和函数
- 使用 **PascalCase** 命名类、接口、类型、React 组件
- 类型定义优先使用 `interface`，尽量不使用 `type`
- 使用 `export function` / `export async function` 导出，避免 `export default`
- 禁止使用 `any`，使用 `unknown` 替代（无法避免时需加注释说明）

### 函数

- **一个函数最多 120 行**，超过需拆分（可适当超出 10-20 行）
- 每个函数只做一件事
- 超过 40 行时应考虑是否需要拆分

### 导入规范

导入顺序：
1. 外部依赖（`vscode`、`react`、`https` 等）
2. 项目内部包（`@template/core`、`@template/ui` 等）
3. 相对路径导入（`./tools/fetch`、`./atcoder` 等）

禁止循环依赖。

### 错误处理

- 网络请求错误使用 `CfError`、`ProxyError`、`LoginRequiredError`（定义在 `tools/fetch.ts`）
- 使用 `handleErrorWithCfAndLogin()` 统一处理三类错误并通知 WebView
- 禁止裸 `throw new Error()` 替代专用错误类型

### WebView 通信

- 消息类型定义在 `packages/webview/src/types.ts` 的 `WebviewMessage` 接口
- WebView → Extension: `postMessage({ command: "...", ... })`
- Extension → WebView: `postMessage({ type: "...", ... })`
- 新增消息类型需同步更新 `types.ts` 和 `extension.ts` 中的 `switch`

### CSS / 样式

- 使用 **Tailwind CSS** 工具类
- WebView 内使用 `var(--vscode-*)` CSS 变量适配 VS Code 主题
- HTML 渲染内容使用 `.html-content` 容器类命名空间
- KaTeX 公式使用 `.katex` / `.katex-display` 类

### Git

- 分支命名：`feat/xxx`、`fix/xxx`、`refactor/xxx`、`docs/xxx`
- 主分支：`main`，开发分支：`dev`
- 提交信息使用英文，简洁描述改动

## 工具目录规范 (`apps/vscode-extension/src/tools/`)

| 文件 | 职责 |
|------|------|
| `fetch.ts` | HTTP 请求工具（`fetchText`、`fetchTextPost`）、网络错误类、Cookie 管理 |
| `deepl.ts` | DeepL 翻译 API 调用 |

每个工具文件应职责单一，避免在一个文件中混合不同领域的工具函数。

## 审查清单

PR 合并到 `main` 前需满足：

- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 无新引入的 `any` 类型
- [ ] 所有函数 ≤ 120 行
- [ ] 文件名符合命名规范
- [ ] 新增消息类型已同步更新 `types.ts` 和 `extension.ts`
