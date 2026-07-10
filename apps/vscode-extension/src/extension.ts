import * as vscode from "vscode";
import * as path from "path";
import { fetchAtCoderProblem, fetchAtCoderTasks, CfError } from "./atcoder";

const log = {
  info: (...args: any[]) => {
    console.log("[Extension]", ...args);
  },
  error: (...args: any[]) => {
    console.error("[Extension]", ...args);
    vscode.window.showErrorMessage(args.join(" "));
  },
};

function getWebviewContent(webviewJsSrc: vscode.Uri): string {
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

export function activate(context: vscode.ExtensionContext) {
  log.info("Extension is now active!");

  try {
    let disposable = vscode.commands.registerCommand(
      "extension.showWebview",
      () => {
        try {
          const panel = vscode.window.createWebviewPanel(
            "templateWebview",
            "AtCoder 题目浏览器",
            vscode.ViewColumn.One,
            {
              enableScripts: true,
              retainContextWhenHidden: true,
              localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, "dist")),
              ],
            }
          );

          const webviewJsPath = vscode.Uri.file(
            path.join(context.extensionPath, "dist", "webview.js")
          );
          const webviewJsSrc = panel.webview.asWebviewUri(webviewJsPath);

          panel.webview.html = getWebviewContent(webviewJsSrc);

          const sendToWebview = (payload: unknown) => {
            panel.webview.postMessage(payload);
          };

          const handleCfError = (err: CfError) => {
            const open = "在浏览器中打开";
            vscode.window.showErrorMessage(err.message, open).then((choice) => {
              if (choice === open) {
                vscode.env.openExternal(vscode.Uri.parse(err.url));
              }
            });
          };

          const loadContest = async (contest: string) => {
            sendToWebview({ type: "loading", text: `正在抓取 ${contest} 的题目列表...` });
            try {
              const tasks = await fetchAtCoderTasks(contest);
              sendToWebview({ type: "tasks", tasks });
            } catch (error) {
              if (error instanceof CfError) {
                handleCfError(error);
                sendToWebview({ type: "cf_challenge", url: error.url });
                return;
              }
              sendToWebview({ type: "error", text: error instanceof Error ? error.message : "抓取题目失败" });
            }
          };

          const loadProblem = async (contest: string, task: string) => {
            sendToWebview({ type: "loading", text: `正在抓取 ${contest}/${task} 的题面...` });
            try {
              const problem = await fetchAtCoderProblem(contest, task);
              sendToWebview({ type: "problem", problem });
            } catch (error) {
              if (error instanceof CfError) {
                handleCfError(error);
                sendToWebview({ type: "cf_challenge", url: error.url });
                return;
              }
              sendToWebview({ type: "error", text: error instanceof Error ? error.message : "抓取题面失败" });
            }
          };

          panel.webview.onDidReceiveMessage(
            async (message) => {
              switch (message.command) {
                case "loadContest":
                  await loadContest(message.contest);
                  return;
                case "loadProblem":
                  await loadProblem(message.contest, message.task);
                  return;
                case "openBrowser":
                  if (message.url) {
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                  }
                  return;
                case "alert":
                  vscode.window.showInformationMessage(message.text);
                  sendToWebview({
                    type: "update",
                    text: `Extension received: ${message.text}`,
                  });
                  return;
              }
            },
            undefined,
            context.subscriptions
          );

        } catch (error) {
          log.error("Failed to show webview:", error);
        }
      }
    );

    context.subscriptions.push(disposable);
  } catch (error) {
    log.error("Failed to activate extension:", error);
  }
}

export function deactivate() {
  log.info("Extension is deactivating...");
}
