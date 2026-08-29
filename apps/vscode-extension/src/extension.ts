import * as vscode from "vscode";
import * as path from "path";
import { setSessionCookie, setStaleCookieHandler, fetchSubStatus } from "./tools/fetch";
import { runCommand } from "./tools/command";
import { IncomingMessage } from "./tools/types";
import { getWebviewContent } from "./tools/webview";
import { AtCoderViewProvider } from "./viewProvider";
import { init, t } from "./tools/i18n";

let sidebarViewProvider: AtCoderViewProvider | undefined;

export function notifyCookieChanged(hasCookie: boolean): void {
    sidebarViewProvider?.postMessage({ type: "cookieChanged", hasCookie });
}

const log = {
  info: (...args: unknown[]) => {
    console.log("[Extension]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[Extension]", ...args);
    vscode.window.showErrorMessage(args.join(" "));
  },
};

const sleep = (ms: number): Promise<void> => new Promise<void>(resolve => setTimeout(resolve, ms));

// handleErrorWithCfAndLogin
// 已近迁移至 ./tools/handle.ts

// handleContestLoad 已迁移

export async function pullSubmitStatu(contest: string, taskName: string, send: (payload: Record<string, unknown>) => void,): Promise<void> {
  const maxSetp = 15;
  const judgeStatus = new Set(["AC", "WA", "TLE", "MLE", "RE", "CE", "OLE"]);
  for (let i = 1; i <= maxSetp; i++) {
    await sleep(2000);
    try {
      const statusMap = await fetchSubStatus(contest);
      send({ type: "statusUpdate", statuses: Object.fromEntries(statusMap) });
      const status = statusMap.get(taskName);
      if (status && judgeStatus.has(status)) {
        send({ type: "update", text: t("ext.judgeResult", { status }) });
        return;
      }
    } catch {
      //单次轮询失败,直接下一次
    }
  }
  send({ type: "update", text: t("ext.judgeTimeout") });
}

function registerSetDeeplApiKey(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("extension.setDeeplApiKey", async () => {
    const key = await vscode.window.showInputBox({
      prompt: t("ext.promptDeeplKey"),
      password: true,
      placeHolder: t("ext.placeholderDeeplKey"),
      ignoreFocusOut: true,
    });
    if (key?.trim()) {
      await context.secrets.store("deeplApiKey", key.trim());
      vscode.window.showInformationMessage(t("ext.deeplKeySaved"));
    }
  });
}

function registerSetAtCoderCookie(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("extension.setAtCoderCookie", async () => {
    const cookie = await vscode.window.showInputBox({
      prompt: t("ext.promptCookie"),
      password: true,
      placeHolder: t("ext.placeholderCookie"),
      ignoreFocusOut: true,
    });
    if (!cookie?.trim()) return;
    const trimmed = cookie.trim();
    if (!trimmed.startsWith("REVEL_SESSION=")) {
      const fix = `REVEL_SESSION=${trimmed}`;
      const choice = await vscode.window.showWarningMessage(
        t("ext.cookieFormatWarn"),
        { modal: false },
        t("ext.autoFix"),
        t("ext.cancel")
      );
      if (choice === t("ext.autoFix")) {
        await context.secrets.store("atcoderCookie", fix);
        setSessionCookie(fix);
        notifyCookieChanged(true);
        vscode.window.showInformationMessage(t("ext.cookieSavedFixed"));
      }
      return;
    }
    await context.secrets.store("atcoderCookie", trimmed);
    setSessionCookie(trimmed);
    notifyCookieChanged(true);
    vscode.window.showInformationMessage(t("ext.cookieSaved"));
  });
}

function createShowWebview(context: vscode.ExtensionContext) {
  return () => {
    const panel = vscode.window.createWebviewPanel(
      "templateWebview",
      "AtCoder",
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

    const sendToWebview = (payload: Record<string, unknown>) => {
      panel.webview.postMessage(payload);
    };

    panel.webview.onDidReceiveMessage(
      (message: IncomingMessage) => { runCommand(message, context, sendToWebview); },
      undefined,
      context.subscriptions
    );
  };
}

export function openContestPanel(context: vscode.ExtensionContext, contest: string) {
  const panel = vscode.window.createWebviewPanel(
    "atcoderContest",
    `AtCoder - ${contest}`,
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

  panel.webview.html = getWebviewContent(webviewJsSrc, "contest", contest);

  const sendToWebview = (payload: Record<string, unknown>) => {
    panel.webview.postMessage(payload);
  };

  panel.webview.onDidReceiveMessage(
    (message: IncomingMessage) => { runCommand(message, context, sendToWebview); },
    undefined,
    context.subscriptions
  );

  context.subscriptions.push(panel);
}

export function openSubmissionPanel(context: vscode.ExtensionContext, contest: string, id: string) {
  const panel = vscode.window.createWebviewPanel(
    "atcoderSubmission",
    t("ext.submissionPanelTitle", { id, contest }),
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

  panel.webview.html = getWebviewContent(webviewJsSrc, "submission", contest, id);

  const sendToWebview = (payload: Record<string, unknown>) => {
    panel.webview.postMessage(payload);
  };

  panel.webview.onDidReceiveMessage(
    (message: IncomingMessage) => { runCommand(message, context, sendToWebview); },
    undefined,
    context.subscriptions
  );

  context.subscriptions.push(panel);
}

export async function activate(context: vscode.ExtensionContext) {
  log.info("Extension is now active!");
  init(vscode.env.language);

  setStaleCookieHandler(() => {
    // vscode.window.showWarningMessage(
    //   "检测到 AtCoder Cookie 可能已过期：已临时使用无 Cookie 访问公开页面。如需提交/报名等登录功能，请重新登录并更新 Cookie。"
    // );
  });

  try {
    const cookie = await context.secrets.get("atcoderCookie");
    if (cookie) {
      setSessionCookie(cookie);
      log.info("已加载 AtCoder 登录 Cookie");
    }

    context.subscriptions.push(registerSetDeeplApiKey(context));
    context.subscriptions.push(registerSetAtCoderCookie(context));
    context.subscriptions.push(
      vscode.commands.registerCommand("extension.showWebview", createShowWebview(context))
    );
    sidebarViewProvider = new AtCoderViewProvider(context);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        AtCoderViewProvider.viewType,
        sidebarViewProvider
      )
    );
  } catch (error) {
    log.error("Failed to activate extension:", error);
  }
}

export function deactivate() {
  log.info("Extension is deactivating...");
}