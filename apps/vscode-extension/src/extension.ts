import * as vscode from "vscode";
import * as path from "path";
import { fetchAtCoderProblem, fetchAtCoderTasks } from "./atcoder";
import { CfError, ProxyError, LoginRequiredError, setSessionCookie } from "./tools/fetch";
import { fetchContest, signedUpContest } from "./SignUpContest";
import { translateTextRaw } from "./tools/deepl";

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

function handleErrorWithCfAndLogin(error: unknown, send: (payload: any) => void): boolean {
  if (error instanceof CfError) {
    const open = "在浏览器中打开并验证";
    const setCookie = "验证后设置 Cookie";
    vscode.window.showErrorMessage(error.message, open, setCookie).then((choice) => {
      if (choice === open) vscode.env.openExternal(vscode.Uri.parse(error.url));
      if (choice === setCookie) vscode.commands.executeCommand("extension.setAtCoderCookie");
    });
    send({ type: "cf_challenge", url: error.url });
    return true;
  }
  if (error instanceof ProxyError) {
    const fixNoProxy = "设置 NO_PROXY";
    const fixWsl = "查看 WSL 代理说明";
    vscode.window.showErrorMessage("代理连接失败，无法访问 AtCoder", fixNoProxy, fixWsl).then((choice) => {
      if (choice === fixNoProxy) vscode.env.openExternal(vscode.Uri.parse("https://github.com/anomalyco/opencode/issues"));
      if (choice === fixWsl) vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/zh-cn/windows/wsl/networking"));
    });
    send({ type: "error", text: error.message });
    return true;
  }
  if (error instanceof LoginRequiredError) {
    const openLogin = "打开 AtCoder 登录";
    const setCookie = "设置 Cookie";
    vscode.window.showErrorMessage(error.message, openLogin, setCookie).then((choice) => {
      if (choice === openLogin) vscode.env.openExternal(vscode.Uri.parse("https://atcoder.jp/login"));
      if (choice === setCookie) vscode.commands.executeCommand("extension.setAtCoderCookie");
    });
    send({ type: "loginRequired" });
    return true;
  }
  return false;
}

async function handleContestLoad(contest: string, send: (payload: any) => void) {
  send({ type: "loading", text: `正在抓取 ${contest} 的题目列表...` });
  try {
    const tasks = await fetchAtCoderTasks(contest);
    send({ type: "tasks", tasks });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "error", text: error instanceof Error ? error.message : "抓取题目失败" });
    }
  }
}

async function handleProblemLoad(contest: string, task: string, send: (payload: any) => void) {
  send({ type: "loading", text: `正在抓取 ${contest}/${task} 的题面...` });
  try {
    const problem = await fetchAtCoderProblem(contest, task);
    send({ type: "problem", problem });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "error", text: error instanceof Error ? error.message : "抓取题面失败" });
    }
  }
}

async function handleTranslate(
  payload: Record<string, string> | undefined,
  targetLang: string | undefined,
  context: vscode.ExtensionContext,
  send: (payload: any) => void,
) {
  const lang = targetLang ?? "ZH";
  const texts = payload ?? {};
  const translated: Record<string, string> = {};
  try {
    const apiKey = await context.secrets.get("deeplApiKey");
    if (!apiKey) {
      const set = "设置 API Key";
      const choice = await vscode.window.showErrorMessage("请先设置 DeepL API Key", set);
      if (choice === set) vscode.commands.executeCommand("extension.setDeeplApiKey");
      send({ type: "error", text: "未设置 DeepL API Key" });
      return;
    }
    for (const [key, value] of Object.entries(texts)) {
      if (typeof value === "string" && value.trim()) {
        send({ type: "loading", text: `正在翻译 ${key}...` });
        translated[key] = await translateTextRaw(value, lang, apiKey);
      }
    }
    send({ type: "translation", translated });
  } catch (error) {
    send({ type: "error", text: error instanceof Error ? error.message : "翻译失败" });
  }
}

async function handleGetCookie(context: vscode.ExtensionContext, send: (payload: any) => void) {
  const storedCookie = await context.secrets.get("atcoderCookie");
  const masked = storedCookie ? storedCookie.substring(0, 20) + "..." : "";
  send({
    type: "cookieStatus",
    hasCookie: !!storedCookie,
    masked,
    statusMessage: storedCookie ? "✅ Cookie 已加载，可访问需要登录的题目" : "未设置 Cookie",
  });
}

async function handleSetCookie(
  cookie: string | undefined,
  context: vscode.ExtensionContext,
  send: (payload: any) => void,
) {
  if (cookie) {
    if (!cookie.startsWith("REVEL_SESSION=")) {
      send({ type: "cookieStatus", hasCookie: false, statusMessage: "❌ Cookie 格式错误，请以 REVEL_SESSION= 开头" });
      return;
    }
    if (cookie.length < 20) {
      send({ type: "cookieStatus", hasCookie: false, statusMessage: "❌ Cookie 值过短，请确认已完整复制 REVEL_SESSION 的值" });
      return;
    }
    await context.secrets.store("atcoderCookie", cookie);
    setSessionCookie(cookie);
    vscode.window.showInformationMessage("AtCoder Cookie 已保存");
    send({ type: "cookieStatus", hasCookie: true, statusMessage: "✅ Cookie 保存成功" });
  } else {
    await context.secrets.delete("atcoderCookie");
    setSessionCookie("");
    send({ type: "cookieStatus", hasCookie: false, statusMessage: "Cookie 已清除" });
  }
}

async function handleRegistration(contest: string, rated: boolean | undefined, send: (payload: any) => void) {
  send({ type: "loading", text: `正在报名 ${contest} ...` });
  try {
    const page = await fetchContest(contest);
    if (page.signed) {
      send({ type: "registrationStatus", signed: true, registrationMessage: "已报名，无需重复操作" });
      return;
    }
    if (!page.csrfToken) {
      send({ type: "registrationStatus", signed: false, registrationMessage: "报名已截止或无法获取报名信息" });
      return;
    }
    const result = await signedUpContest(contest, page.csrfToken, rated);
    send({ type: "registrationStatus", signed: result.success, registrationMessage: result.message });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "registrationStatus", signed: false, registrationMessage: error instanceof Error ? error.message : "报名失败" });
    }
  }
}

function registerSetDeeplApiKey(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("extension.setDeeplApiKey", async () => {
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
  });
}

function registerSetAtCoderCookie(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("extension.setAtCoderCookie", async () => {
    const cookie = await vscode.window.showInputBox({
      prompt: "粘贴 AtCoder 的 Cookie（仅需 REVEL_SESSION）",
      password: true,
      placeHolder: "REVEL_SESSION=abcdef1234567890abcdef1234567890",
      ignoreFocusOut: true,
    });
    if (!cookie?.trim()) return;
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
  });
}

function createShowWebview(context: vscode.ExtensionContext) {
  return () => {
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

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "loadContest":
            await handleContestLoad(message.contest, sendToWebview);
            return;
          case "loadProblem":
            await handleProblemLoad(message.contest, message.task, sendToWebview);
            return;
          case "openBrowser":
            if (message.url) vscode.env.openExternal(vscode.Uri.parse(message.url));
            return;
          case "translate":
            await handleTranslate(message.payload, message.targetLang, context, sendToWebview);
            return;
          case "setApiKey":
            if (message.text?.trim()) {
              await context.secrets.store("deeplApiKey", message.text.trim());
              vscode.window.showInformationMessage("DeepL API Key 已保存");
            }
            return;
          case "getCookie":
            await handleGetCookie(context, sendToWebview);
            return;
          case "setCookie":
            await handleSetCookie(message.text, context, sendToWebview);
            return;
          case "registerContest":
            await handleRegistration(message.contest, message.rated, sendToWebview);
            return;
          case "alert":
            vscode.window.showInformationMessage(message.text);
            sendToWebview({ type: "update", text: `Extension received: ${message.text}` });
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  };
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

    context.subscriptions.push(registerSetDeeplApiKey(context));
    context.subscriptions.push(registerSetAtCoderCookie(context));
    context.subscriptions.push(
      vscode.commands.registerCommand("extension.showWebview", createShowWebview(context))
    );
  } catch (error) {
    log.error("Failed to activate extension:", error);
  }
}

export function deactivate() {
  log.info("Extension is deactivating...");
}
