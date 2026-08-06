import * as vscode from "vscode";
import { AtCoderProblem, fetchAtCoderProblem, fetchAtCoderTasks } from "../atcoder";
import { CfError, ProxyError, LoginRequiredError, setSessionCookie, fetchSubStatus, fetchSubmitHistory } from "./fetch";
import { fetchContest, signedUpContest, fetchContestAnnouncement } from "./SignUpContest";
import { translateTextRaw, translateTextFree } from "./deepl";
import { fetchSubmitPage, submitCodeWithRedirect } from "./submit";
import { buildCphProblem, sendToCph } from "./cph";
import { fetchStandings } from "./standings";
import { fetchHomepageContests } from "./homepage";
import { fetchSubmissionDetail } from "./submission";
import { pullSubmitStatu } from "../extension";

export function handleErrorWithCfAndLogin(error: unknown, send: (payload: Record<string, unknown>) => void): boolean {
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
        const announcement = await fetchContestAnnouncement(contest);
        send({ type: "contestInfo", Rated: contestInfo.Rated, announcement, title: contestInfo.title });
    } catch (e) {
        //不处理
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
        if (error instanceof CfError) {
            send({ type: "submitPageError", message: "该比赛提交需要 Cloudflare 验证，插件无法自动完成。请在浏览器中打开提交页完成验证后提交。", url: error.url });
            return;
        }
        if (error instanceof LoginRequiredError) {
            send({ type: "submitPageError", message: "提交需要登录，请先设置 AtCoder Cookie 后再试。", url: `https://atcoder.jp/contests/${contest}/submit` });
            return;
        }
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
        if (error instanceof CfError) {
            send({ type: "submitResult", submitResult: { success: false, message: "该比赛提交需要 Cloudflare 验证，插件无法自动完成。请在浏览器中打开提交页完成验证后提交。" } });
            return;
        }
        if (error instanceof LoginRequiredError) {
            send({ type: "submitResult", submitResult: { success: false, message: "提交需要登录，请先设置 AtCoder Cookie 后再试。" } });
            return;
        }
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

export async function handleFetchSubmissionDetail(contest: string, id: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: `正在获取提交 ${id} 的详细信息...` });
    try {
        const detail = await fetchSubmissionDetail(contest, id);
        send({ type: "submissionDetail", submissionDetail: detail });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : "获取提交详情失败" });
        }
    }
}

export async function handleFetchStandings(contest: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: `正在获取 ${contest} 排行榜...` });
    try {
        const standings = await fetchStandings(contest);
        send({ type: "standings", contest, standings });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : "获取排行榜失败" });
        }
    }
}

export async function handleGetContests(send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: "正在抓取 AtCoder 首页比赛列表..." });
    try {
        const contests = await fetchHomepageContests();
        send({ type: "contestList", contests });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : "获取比赛列表失败" });
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