import * as vscode from "vscode";
import { AtCoderProblem, fetchAtCoderProblem, fetchAtCoderTasks } from "../atcoder";
import { CfError, ProxyError, LoginRequiredError, setSessionCookie, fetchSubStatus, fetchSubmitHistory, getSessionCookie } from "./fetch";
import { fetchContest, signedUpContest, fetchContestAnnouncement } from "./SignUpContest";
import { translateTextRaw, translateTextFree } from "./deepl";
import { translateTextAI, AiTranslateConfig } from "./ai";
import { fetchSubmitPage, submitCodeWithRedirect } from "./submit";
import { buildCphProblem, sendToCph } from "./cph";
import { fetchStandings } from "./standings";
import { fetchHomepageContests } from "./homepage";
import { fetchSubmissionDetail } from "./submission";
import { pullSubmitStatu, notifyCookieChanged } from "../extension";
import { t } from "./i18n";

export function handleErrorWithCfAndLogin(error: unknown, send: (payload: Record<string, unknown>) => void): boolean {
    if (error instanceof CfError) {
        vscode.window.showErrorMessage(error.message, t("err.openInBrowser")).then((choice) => {
            if (choice === t("err.openInBrowser")) vscode.env.openExternal(vscode.Uri.parse(error.url));
        });
        send({ type: "cf_challenge", url: error.url });
        return true;
    }
    if (error instanceof ProxyError) {
        const fixNoProxy = t("err.setNoProxy");
        const fixWsl = t("err.viewWslDoc");
        vscode.window.showErrorMessage(t("err.proxyFailedTitle"), fixNoProxy, fixWsl).then((choice) => {
            if (choice === fixNoProxy) vscode.env.openExternal(vscode.Uri.parse("https://github.com/anomalyco/opencode/issues"));
            if (choice === fixWsl) vscode.env.openExternal(vscode.Uri.parse("https://learn.microsoft.com/zh-cn/windows/wsl/networking"));
        });
        send({ type: "error", text: error.message });
        return true;
    }
    if (error instanceof LoginRequiredError) {
        send({ type: "loginRequired" });
        return true;
    }
    return false;
}

export async function handleContestLoad(contest: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.contestTasks", { contest }) });
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
            send({ type: "error", text: error instanceof Error ? error.message : t("err.contestTasks") });
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
    translationMode?: "api" | "free" | "ai",
) {
    const lang = targetLang ?? "ZH";
    const texts = payload ?? {};
    try {
        const translateOne = await resolveTranslator(context, send, lang, translationMode);
        if (!translateOne) return;
        const translated = await translateAll(texts, send, translateOne);
        send({ type: "translation", translated });
    } catch (error) {
        send({ type: "error", text: error instanceof Error ? error.message : t("err.translate") });
    }
}

async function resolveTranslator(
    context: vscode.ExtensionContext,
    send: (payload: Record<string, unknown>) => void,
    lang: string,
    translationMode: "api" | "free" | "ai" | undefined,
): Promise<((value: string) => Promise<string>) | null> {
    if (translationMode === "free") {
        return (value) => translateTextFree(value, lang);
    }
    if (translationMode === "ai") {
        return createAiTranslator(context, send, lang);
    }
    const apiKey = await context.secrets.get("deeplApiKey");
    if (!apiKey) {
        const set = t("deepl.setKey");
        const choice = await vscode.window.showErrorMessage(t("deepl.setKeyFirst"), set);
        if (choice === set) vscode.commands.executeCommand("extension.setDeeplApiKey");
        send({ type: "error", text: t("deepl.noKey") });
        return null;
    }
    return (value) => translateTextRaw(value, lang, apiKey);
}

async function createAiTranslator(
    context: vscode.ExtensionContext,
    send: (payload: Record<string, unknown>) => void,
    lang: string,
): Promise<((value: string) => Promise<string>) | null> {
    const apiKey = await context.secrets.get("aiApiKey");
    if (!apiKey) {
        const set = t("ai.setKey");
        const choice = await vscode.window.showErrorMessage(t("ai.setKeyFirst"), set);
        if (choice === set) vscode.commands.executeCommand("extension.setAiApiKey");
        send({ type: "error", text: t("ai.noKey") });
        return null;
    }
    const config = readAiConfig(context);
    return (value) => translateTextAI(value, lang, config, apiKey);
}

async function translateAll(
    texts: Record<string, string>,
    send: (payload: Record<string, unknown>) => void,
    translateOne: (value: string) => Promise<string>,
): Promise<Record<string, string>> {
    const translated: Record<string, string> = {};
    for (const [key, value] of Object.entries(texts)) {
        if (typeof value === "string" && value.trim()) {
            send({ type: "loading", text: t("load.translateItem", { name: key }) });
            translated[key] = await translateOne(value);
        }
    }
    return translated;
}

const DEFAULT_AI_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_AI_MODEL = "deepseek-chat";

function readAiConfig(context: vscode.ExtensionContext): AiTranslateConfig {
    const baseUrl = context.globalState.get<string>("aiBaseUrl") || DEFAULT_AI_BASE_URL;
    const model = context.globalState.get<string>("aiModel") || DEFAULT_AI_MODEL;
    return { baseUrl, model };
}

export async function handleGetAiConfig(
    context: vscode.ExtensionContext,
    send: (payload: Record<string, unknown>) => void,
) {
    const config = readAiConfig(context);
    const hasAiKey = !!(await context.secrets.get("aiApiKey"));
    send({ type: "aiConfig", aiBaseUrl: config.baseUrl, aiModel: config.model, hasAiKey });
}

export async function handleSetAiConfig(
    message: { aiBaseUrl?: string; aiModel?: string; aiApiKey?: string },
    context: vscode.ExtensionContext,
    send: (payload: Record<string, unknown>) => void,
) {
    if (message.aiBaseUrl?.trim()) await context.globalState.update("aiBaseUrl", message.aiBaseUrl.trim());
    if (message.aiModel?.trim()) await context.globalState.update("aiModel", message.aiModel.trim());
    if (message.aiApiKey?.trim()) await context.secrets.store("aiApiKey", message.aiApiKey.trim());
    await handleGetAiConfig(context, send);
}

export async function handleProblemLoad(contest: string, task: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.problem", { contest, task }) });
    try {
        const problem = await fetchAtCoderProblem(contest, task);
        send({ type: "problem", problem });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : t("err.problem") });
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
        statusMessage: storedCookie ? t("cookie.loaded") : t("cookie.notSet"),
    });
}

export async function handleSetCookie(
    cookie: string | undefined,
    context: vscode.ExtensionContext,
    send: (payload: Record<string, unknown>) => void,
) {
    if (cookie) {
        if (!cookie.startsWith("REVEL_SESSION=")) {
            send({ type: "cookieStatus", hasCookie: false, statusMessage: t("cookie.formatError") });
            return;
        }
        if (cookie.length < 20) {
            send({ type: "cookieStatus", hasCookie: false, statusMessage: t("cookie.tooShort") });
            return;
        }
        await context.secrets.store("atcoderCookie", cookie);
        setSessionCookie(cookie);
        vscode.window.showInformationMessage(t("cookie.saved"));
        send({ type: "cookieStatus", hasCookie: true, statusMessage: t("cookie.saveSuccess") });
        notifyCookieChanged(true);
    } else {
        await context.secrets.delete("atcoderCookie");
        setSessionCookie("");
        send({ type: "cookieStatus", hasCookie: false, statusMessage: t("cookie.cleared") });
    }
}

export async function handleRegistration(contest: string, rated: boolean | undefined, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.register", { contest }) });
    try {
        const page = await fetchContest(contest);
        if (page.signed) {
            send({ type: "registrationStatus", signed: true, registrationMessage: t("register.already") });
            return;
        }
        const result = await signedUpContest(contest, page.csrfToken, rated);
        send({ type: "registrationStatus", signed: result.success, registrationMessage: result.message });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "registrationStatus", signed: false, registrationMessage: error instanceof Error ? error.message : t("register.failed") });
        }
    }
}

export async function handleFetchSubmitPage(contest: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.submitPage", { contest }) });
    try {
        const pageData = await fetchSubmitPage(contest);
        send({ type: "submitPage", submitTasks: pageData.tasks, languages: pageData.languages, csrfToken: pageData.csrfToken });
        send({ type: "update", text: t("submit.pageReady") });
    } catch (error) {
        if (error instanceof CfError) {
            send({ type: "submitPageError", message: t("submit.cfNeedBrowser"), url: error.url });
            return;
        }
        if (error instanceof LoginRequiredError) {
            send({
                type: "submitPageError",
                message: getSessionCookie()
                    ? t("submit.loginRequired")
                    : t("submit.loginRequiredNoCookie"),
                url: `https://atcoder.jp/contests/${contest}/submit`,
            });
            return;
        }
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({
                type: "submitPageError",
                message: error instanceof Error ? error.message : t("err.submitPage"),
                url: `https://atcoder.jp/contests/${contest}/submit`,
            });
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
        send({ type: "submitResult", submitResult: { success: false, message: t("submit.paramsIncomplete") } });
        return;
    }
    send({ type: "loading", text: t("load.submitting") });
    try {
        const result = await submitCodeWithRedirect(contest, taskScreenName, languageId, sourceCode);
        send({ type: "submitResult", submitResult: result });
        if (result.success) {
            send({ type: "update", text: t("submit.successWaiting") });
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
            send({ type: "submitResult", submitResult: { success: false, message: t("submit.cfNeedBrowser") } });
            return;
        }
        if (error instanceof LoginRequiredError) {
            send({
                type: "submitResult",
                submitResult: {
                    success: false,
                    message: getSessionCookie()
                        ? t("submit.loginRequired")
                        : t("submit.loginRequiredNoCookie"),
                },
            });
            return;
        }
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "submitResult", submitResult: { success: false, message: error instanceof Error ? error.message : t("err.submit") } });
        }
    }
}

export async function handleFetchSubHistory(contest: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.subHistory", { contest }) });
    try {
        const submissions = await fetchSubmitHistory(contest);
        send({ type: "submissionHistory", submissions });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : t("err.subHistory") });
        }
    }
}

export async function handleFetchSubmissionDetail(contest: string, id: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.subDetail", { id }) });
    try {
        const detail = await fetchSubmissionDetail(contest, id);
        send({ type: "submissionDetail", submissionDetail: detail });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : t("err.subDetail") });
        }
    }
}

export async function handleFetchStandings(contest: string, send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.standings", { contest }) });
    try {
        const standings = await fetchStandings(contest);
        send({ type: "standings", contest, standings });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : t("err.standings") });
        }
    }
}

export async function handleGetContests(send: (payload: Record<string, unknown>) => void) {
    send({ type: "loading", text: t("load.homepage") });
    try {
        const contests = await fetchHomepageContests();
        send({ type: "contestList", contests });
    } catch (error) {
        if (!handleErrorWithCfAndLogin(error, send)) {
            send({ type: "error", text: error instanceof Error ? error.message : t("err.homepage") });
        }
    }
}

export async function handleExportToCph(problem: AtCoderProblem, send: (payload: Record<string, unknown>) => void) {
    try {
        const payload = buildCphProblem(problem);
        await sendToCph(payload);
        send({ type: "cphExportResult", success: true, message: t("cph.exportSuccess") });
    } catch (error) {
        const message = error instanceof Error ? error.message : t("cph.exportFailed");
        send({ type: "cphExportResult", success: false, message: message });
    }
}