import * as vscode from "vscode";

export function getWebviewContent(webviewJsSrc: vscode.Uri): string {
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
      <script src="${webviewJsSrc}"></script>
    </body>
  </html>`;
}