# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A VS Code extension called "AtCoder Helper neo" for browsing AtCoder competitive programming contest problems, with LaTeX rendering, DeepL translation, code submission, and contest registration. Chinese-language UI and documentation.

## Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages (turbo)
pnpm dev                  # Dev watch mode (extension + webview)
pnpm lint                 # ESLint all packages
pnpm format               # Prettier format
pnpm test                 # Run all tests

# Run unit tests directly
cd apps/vscode-extension && pnpm test

# Package extension
cd apps/vscode-extension && pnpm package
# Output: release/extension.vsix
```

Debug: press F5 in VS Code to launch Extension Host (preLaunchTask runs `pnpm dev`).

## Architecture

Monorepo with pnpm workspaces + Turborepo. Webpack dual-config builds both the Node extension and the React webview into `apps/vscode-extension/dist/`.

**Dependency flow:** `apps/vscode-extension` → `packages/webview` → `packages/ui` + `packages/core`

Webpack resolves `@template/ui` and `@template/core` via path aliases directly to source — no need to pre-build packages during development.

### Extension host (Node, CommonJS)

Entry: `apps/vscode-extension/src/extension.ts` — registers commands, creates WebView panel, routes messages.

Communication protocol: WebView sends `{ command: "..." }`, Extension responds with `{ type: "..." }`. Message types defined in `packages/webview/src/types.ts` (`WebviewMessage` union). Adding a new message requires updating both `types.ts` and the `switch` in `extension.ts`.

Network layer (`tools/fetch.ts`): custom HTTP client using Node https/http/zlib, no external deps. Three error classes: `CfError` (Cloudflare), `ProxyError`, `LoginRequiredError` — handled uniformly by `handleErrorWithCfAndLogin()`.

### WebView frontend (React, browser target)

Entry: `packages/webview/src/index.tsx` → `WebviewApp.tsx`. Uses Tailwind CSS with `var(--vscode-*)` variables for theme adaptation. KaTeX math is pre-rendered server-side in the extension host.

### Shared packages

- `packages/core` — `MessageBus` (pub/sub) and `StateManager<T>`
- `packages/ui` — Button, Card, Input, Spinner components styled with VS Code CSS variables

## Code Conventions

- 4-space indent, no `export default`, prefer `interface` over `type`
- No `any` — use `unknown` instead
- Functions max 120 lines (CI enforces 130 hard limit)
- Import order: external deps → `@template/*` packages → relative paths
- Component files: PascalCase. Tool/utility files: camelCase
- Error handling: use `CfError`/`ProxyError`/`LoginRequiredError`, never bare `throw new Error()`
- Git branches: `feat/xxx`, `fix/xxx`, `refactor/xxx`, `docs/xxx`
- Main branch: `main`, development branch: `dev`

## CI

PR to `main` triggers: lint → build → test → function length check (>130 lines fails). Results posted as PR comment.

## Git Branch Rules (Claude MUST follow)

- **NEVER** commit, push, or merge to `main` branch directly
- **NEVER** run `git checkout main` or `git push origin main`
- **ALWAYS** work on `dev` branch or feature branches (`feat/*`, `fix/*`, `refactor/*`, `docs/*`)
- Before any Git operation, confirm current branch with `git branch --show-current`
- If user asks to modify `main`, remind them to use `dev` instead