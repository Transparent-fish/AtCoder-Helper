import * as vscode from "vscode";
import * as path from "path";
import * as https from "https";
import { fetchAtCoderProblem, fetchAtCoderTasks, CfError, ProxyError, LoginRequiredError, setSessionCookie } from "./atcoder";

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
    context.secrets.get("atcoderCookie").then((cookie) => {
      if (cookie) {
        setSessionCookie(cookie);
        log.info("已加载 AtCoder 登录 Cookie");
      }
    });

    context.subscriptions.push(
      vscode.commands.registerCommand("extension.setDeeplApiKey", async () => {
        const key = await vscode.window.showInputBox({
          prompt: "请输入 DeepL API Key",
          password: true,
          placeHolder: "例如 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
          ignoreFocusOut: true,
        });
        if (key?.trim()) {
          await context.secrets.store("deeplApiKey", key.trim());
          vscode.window.showInformationMessage("DeepL API Key 已保存");
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("extension.setAtCoderCookie", async () => {
        const cookie = await vscode.window.showInputBox({
          prompt: "粘贴 AtCoder 的 Cookie（仅需 REVEL_SESSION）",
          password: true,
          placeHolder: "REVEL_SESSION=abcdef1234567890abcdef1234567890",
          ignoreFocusOut: true,
        });
        if (cookie?.trim()) {
          const trimmed = cookie.trim();
          if (!trimmed.startsWith("REVEL_SESSION=")) {
            const fix = `REVEL_SESSION=${trimmed}`;
            const choice = await vscode.window.showWarningMessage(
              `Cookie 格式似乎不正确，是否添加 REVEL_SESSION= 前缀？`,
              { modal: false },
              "自动修复",
              "取消"
            );
            if (choice === "自动修复") {
              await context.secrets.store("atcoderCookie", fix);
              setSessionCookie(fix);
              vscode.window.showInformationMessage("AtCoder Cookie 已保存并自动修复格式");
            }
            return;
          }
          await context.secrets.store("atcoderCookie", trimmed);
          setSessionCookie(trimmed);
          vscode.window.showInformationMessage("AtCoder Cookie 已保存");
        }
      })
    );

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
            const open = "在浏览器中打开并验证";
            const setCookie = "验证后设置 Cookie";
            vscode.window.showErrorMessage(err.message, open, setCookie).then((choice) => {
              if (choice === open) {
                vscode.env.openExternal(vscode.Uri.parse(err.url));
              }
              if (choice === setCookie) {
                vscode.commands.executeCommand("extension.setAtCoderCookie");
              }
            });
          };

          const handleLoginRequired = (err: LoginRequiredError) => {
            const openLogin = "打开 AtCoder 登录";
            const setCookie = "设置 Cookie";
            vscode.window.showErrorMessage(err.message, openLogin, setCookie).then((choice) => {
              if (choice === openLogin) {
                vscode.env.openExternal(vscode.Uri.parse("https://atcoder.jp/login"));
              }
              if (choice === setCookie) {
                vscode.commands.executeCommand("extension.setAtCoderCookie");
              }
            });
          };

          const handleProxyError = (err: ProxyError) => {
            const fixNoProxy = "设置 NO_PROXY";
            const fixWsl = "查看 WSL 代理说明";
            vscode.window.showErrorMessage("代理连接失败，无法访问 AtCoder", fixNoProxy, fixWsl).then((choice) => {
              if (choice === fixNoProxy) {
                vscode.env.openExternal(vscode.Uri.parse("https://github.com/anomalyco/opencode/issues"));
              }
              if (choice === fixWsl) {
                vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/zh-cn/windows/wsl/networking"));
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
              if (error instanceof ProxyError) {
                handleProxyError(error);
                sendToWebview({ type: "error", text: error.message });
                return;
              }
              if (error instanceof LoginRequiredError) {
                handleLoginRequired(error);
                sendToWebview({ type: "loginRequired" });
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
              if (error instanceof ProxyError) {
                handleProxyError(error);
                sendToWebview({ type: "error", text: error.message });
                return;
              }
              if (error instanceof LoginRequiredError) {
                handleLoginRequired(error);
                sendToWebview({ type: "loginRequired" });
                return;
              }
              sendToWebview({ type: "error", text: error instanceof Error ? error.message : "抓取题面失败" });
            }
          };

          const translateText = async (text: string, targetLang: string): Promise<string> => {
            const apiKey = await context.secrets.get("deeplApiKey");
            if (!apiKey) {
              const set = "设置 API Key";
              const choice = await vscode.window.showErrorMessage("请先设置 DeepL API Key", set);
              if (choice === set) {
                vscode.commands.executeCommand("extension.setDeeplApiKey");
              }
              throw new Error("未设置 DeepL API Key");
            }

            return new Promise((resolve, reject) => {
              const params = new URLSearchParams({ text, target_lang: targetLang });
              const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
              const req = https.request(
                {
                  hostname: host,
                  path: "/v2/translate",
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `DeepL-Auth-Key ${apiKey}`,
                  },
                },
                (res) => {
                  let data = "";
                  res.on("data", (chunk) => (data += chunk));
                  res.on("end", () => {
                    try {
                      const json = JSON.parse(data);
                      if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(json.message || `翻译接口错误 (${res.statusCode})`));
                        return;
                      }
                      resolve(json.translations?.[0]?.text ?? text);
                    } catch {
                      reject(new Error("翻译接口返回异常"));
                    }
                  });
                }
              );
              req.on("error", () => reject(new Error("翻译请求失败")));
              req.write(params.toString());
              req.end();
            });
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
                case "translate": {
                  try {
                    const targetLang = message.targetLang ?? "ZH";
                    const texts: Record<string, string> = message.payload ?? {};
                    const translated: Record<string, string> = {};
                    for (const [key, value] of Object.entries(texts)) {
                      if (typeof value === "string" && value.trim()) {
                        sendToWebview({ type: "loading", text: `正在翻译 ${key}...` });
                        translated[key] = await translateText(value, targetLang);
                      }
                    }
                    sendToWebview({ type: "translation", translated });
                  } catch (error) {
                    sendToWebview({
                      type: "error",
                      text: error instanceof Error ? error.message : "翻译失败",
                    });
                  }
                  return;
                }
                case "setApiKey": {
                  const key = message.text?.trim();
                  if (key) {
                    await context.secrets.store("deeplApiKey", key);
                    vscode.window.showInformationMessage("DeepL API Key 已保存");
                  }
                  return;
                }
                case "getCookie": {
                  const storedCookie = await context.secrets.get("atcoderCookie");
                  const masked = storedCookie ? storedCookie.substring(0, 20) + "..." : "";
                  sendToWebview({
                    type: "cookieStatus",
                    hasCookie: !!storedCookie,
                    masked,
                    statusMessage: storedCookie ? "✅ Cookie 已加载，可访问需要登录的题目" : "未设置 Cookie",
                  });
                  return;
                }
                case "setCookie": {
                  const cookie = message.text?.trim();
                  if (cookie) {
                    if (!cookie.startsWith("REVEL_SESSION=")) {
                      sendToWebview({
                        type: "cookieStatus",
                        hasCookie: false,
                        statusMessage: "❌ Cookie 格式错误，请以 REVEL_SESSION= 开头",
                      });
                      return;
                    }
                    if (cookie.length < 20) {
                      sendToWebview({
                        type: "cookieStatus",
                        hasCookie: false,
                        statusMessage: "❌ Cookie 值过短，请确认已完整复制 REVEL_SESSION 的值",
                      });
                      return;
                    }
                    await context.secrets.store("atcoderCookie", cookie);
                    setSessionCookie(cookie);
                    vscode.window.showInformationMessage("AtCoder Cookie 已保存");
                    sendToWebview({
                      type: "cookieStatus",
                      hasCookie: true,
                      statusMessage: "✅ Cookie 保存成功",
                    });
                  } else {
                    await context.secrets.delete("atcoderCookie");
                    setSessionCookie("");
                    sendToWebview({
                      type: "cookieStatus",
                      hasCookie: false,
                      statusMessage: "Cookie 已清除",
                    });
                  }
                  return;
                }
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
