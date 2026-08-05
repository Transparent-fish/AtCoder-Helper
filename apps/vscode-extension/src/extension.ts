import * as vscode from "vscode";
import * as path from "path";
import { AtCoderProblem, fetchAtCoderProblem, fetchAtCoderTasks } from "./atcoder";
import { CfError, ProxyError, LoginRequiredError, setSessionCookie, fetchSubStatus, fetchSubmitHistory } from "./tools/fetch";
import { fetchContest, signedUpContest } from "./tools/SignUpContest";
import { translateTextRaw, translateTextFree } from "./tools/deepl";
import { runCommand } from "./tools/command";
import { fetchSubmitPage, submitCodeWithRedirect } from "./tools/submit";
import { buildCphProblem, sendToCph } from "./tools/cph"
import { IncomingMessage } from "./tools/types";
import { getWebviewContent } from "./tools/webview";
import { AtCoderViewProvider } from "./viewProvider";

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

function handleErrorWithCfAndLogin(error: unknown, send: (payload: Record<string, unknown>) => void): boolean {
  if (error instanceof CfError) {
    vscode.window.showErrorMessage(error.message, "在浏览器中打开").then((choice) => {
      if (choice === "在浏览器中打开") vscode.env.openExternal(vscode.Uri.parse(error.url));
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

export async function handleContestLoad(contest: string, send: (payload: Record<string, unknown>) => void) {
  send({ type: "loading", text: `正在抓取 ${contest} 的题目列表...` });
  try {
    const tasks = await fetchAtCoderTasks(contest);
    try {
      const statusMap = await fetchSubStatus(contest);
      const enriched = tasks.map(t => ({ ...t, status: statusMap.get(t.value) }));
      send({ type: "tasks", tasks: enriched });
    } catch {
      send({ type: "tasks", tasks });
    }
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "error", text: error instanceof Error ? error.message : "抓取题目失败" });
    }
    return;
  }

  try {
    const contestInfo = await fetchContest(contest);
    send({ type: "contestInfo", Rated: contestInfo.Rated });
  } catch (e) {
    //不处理
  }
}

export async function handleProblemLoad(contest: string, task: string, send: (payload: Record<string, unknown>) => void) {
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

export async function handleTranslate(
  payload: Record<string, string> | undefined,
  targetLang: string | undefined,
  context: vscode.ExtensionContext,
  send: (payload: Record<string, unknown>) => void,
  translationMode?: "api" | "free",
) {
  const lang = targetLang ?? "ZH";
  const texts = payload ?? {};
  const translated: Record<string, string> = {};
  try {
    if (translationMode === "free") {
      for (const [key, value] of Object.entries(texts)) {
        if (typeof value === "string" && value.trim()) {
          send({ type: "loading", text: `正在翻译 ${key}...` });
          translated[key] = await translateTextFree(value, lang);
        }
      }
    } else {
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
    }
    send({ type: "translation", translated });
  } catch (error) {
    send({ type: "error", text: error instanceof Error ? error.message : "翻译失败" });
  }
}

export async function handleGetCookie(context: vscode.ExtensionContext, send: (payload: Record<string, unknown>) => void) {
  const storedCookie = await context.secrets.get("atcoderCookie");
  const masked = storedCookie ? storedCookie.substring(0, 20) + "..." : "";
  send({
    type: "cookieStatus",
    hasCookie: !!storedCookie,
    masked,
    statusMessage: storedCookie ? "✅ Cookie 已加载，可访问需要登录的题目" : "未设置 Cookie",
  });
}

export async function handleSetCookie(
  cookie: string | undefined,
  context: vscode.ExtensionContext,
  send: (payload: Record<string, unknown>) => void,
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

export async function handleRegistration(contest: string, rated: boolean | undefined, send: (payload: Record<string, unknown>) => void) {
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

export async function handleFetchSubmitPage(contest: string, send: (payload: Record<string, unknown>) => void) {
  send({ type: "loading", text: `正在获取 ${contest} 提交页面信息...` });
  try {
    const pageData = await fetchSubmitPage(contest);
    send({ type: "submitPage", submitTasks: pageData.tasks, languages: pageData.languages, csrfToken: pageData.csrfToken });
    send({ type: "update", text: "已获取提交页面信息" });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "error", text: error instanceof Error ? error.message : "获取提交页面失败" });
    }
  }
}

export async function handleSubmitCode(
  contest: string,
  taskScreenName: string | undefined,
  languageId: string | undefined,
  sourceCode: string | undefined,
  send: (payload: Record<string, unknown>) => void,
) {
  if (!taskScreenName || !languageId || !sourceCode) {
    send({ type: "submitResult", submitResult: { success: false, message: "提交参数不完整" } });
    return;
  }
  send({ type: "loading", text: "正在提交代码..." });
  try {
    const result = await submitCodeWithRedirect(contest, taskScreenName, languageId, sourceCode);
    send({ type: "submitResult", submitResult: result });
    if (result.success) {
      send({ type: "update", text: "代码提交成功，正在获取评测结果..." });
      try {
        await pullSubmitStatu(contest, taskScreenName!, send);
      } catch {
        try {
          const statusMap = await fetchSubStatus(contest);
          send({ type: "statusUpdate", statuses: Object.fromEntries(statusMap) });
        } catch {
          // 失败不阻断
        }
      }
    } else send({ type: "error", text: result.message });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "submitResult", submitResult: { success: false, message: error instanceof Error ? error.message : "提交失败" } });
    }
  }
}

export async function handleFetchSubHistory(contest: string, send: (payload: Record<string, unknown>) => void) {
  send({ type: "loading", text: `正在获取 ${contest} 提交记录...` });
  try {
    const submissions = await fetchSubmitHistory(contest);
    send({ type: "submissionHistory", submissions });
  } catch (error) {
    if (!handleErrorWithCfAndLogin(error, send)) {
      send({ type: "error", text: error instanceof Error ? error.message : "获取提交记录失败" });
    }
  }
}

export async function handleExportToCph(problem: AtCoderProblem, send: (payload: Record<string, unknown>) => void) {
  try {
    const payload = buildCphProblem(problem);
    await sendToCph(payload);
    send({ type: "cphExportResult", success: true, message: "success send to cph" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fail to send cph";
    send({ type: "cphExportResult", success: false, message: message });
  }
}

async function pullSubmitStatu(contest: string, taskName: string, send: (payload: Record<string, unknown>) => void,): Promise<void> {
  const maxSetp = 15;
  const judgeStatus = new Set(["AC", "WA", "TLE", "MLE", "RE", "CE", "OLE"]);
  for (let i = 1; i <= maxSetp; i++) {
    await sleep(2000);
    try {
      const statusMap = await fetchSubStatus(contest);
      send({ type: "statusUpdate", statuses: Object.fromEntries(statusMap) });
      const status = statusMap.get(taskName);
      if (status && judgeStatus.has(status)) {
        send({ type: "update", text: `评测结果: ${status}` });
        return;
      }
    } catch {
      //单次轮询失败,直接下一次
    }
  }
  send({ type: "update", text: "评测超时，请稍后手动刷新查看结果" });
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

export async function activate(context: vscode.ExtensionContext) {
  log.info("Extension is now active!");

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
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        AtCoderViewProvider.viewType,
        new AtCoderViewProvider(context)
      )
    );
  } catch (error) {
    log.error("Failed to activate extension:", error);
  }
}

export function deactivate() {
  log.info("Extension is deactivating...");
}