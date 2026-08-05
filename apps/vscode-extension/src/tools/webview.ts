import * as vscode from "vscode";

export type WebviewMode = "editor" | "sidebar" | "contest";

export function getWebviewContent(
    webviewJsSrc: vscode.Uri,
    mode?: WebviewMode,
    initContest?: string,
): string {
    const globals: string[] = [];
    if (mode) {
        globals.push(`window.__ATCODER_MODE__ = ${JSON.stringify(mode)};`);
    }
    if (initContest) {
        globals.push(`window.__ATCODER_INIT_CONTEST__ = ${JSON.stringify(initContest)};`);
    }
    const initScript = globals.length > 0 ? `<script>${globals.join("")}</script>` : "";
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:; style-src vscode-resource: 'unsafe-inline';">
      <title>VSCode Boilerplate</title>
    </head>
    <body>
      <div id="root"></div>
      ${initScript}
      <script src="${webviewJsSrc}"></script>
    </body>
  </html>`;
}
