import { fetchText, fetchTextPost } from "./fetch";

export interface LanguageOption {
    id: string;
    label: string;
}

export interface SubmitPage {
    contest: string;
    csrfToken: string;
    tasks: Array<{ value: string; label: string }>;
    languages: LanguageOption[];
}

export interface SubmitStatus {
    success: boolean;
    message: string;
    url?: string;
}

export async function fetchSubmitPage(contest: string): Promise<SubmitPage> {
    const url = `https://atcoder.jp/contests/${contest}/submit`;
    const html = await fetchText(url);

    const csrfMatch = html.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    const tasks: Array<{ value: string; label: string }> = [];
    const taskRegex = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
    let taskMatch: RegExpExecArray | null;
    for (;(taskMatch = taskRegex.exec(html)) !== null;) {
        const value = taskMatch[1];
        if (value) tasks.push({ value, label: taskMatch[2].trim() });
    }

    const languages: LanguageOption[] = [];
    const langRegex = /<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/gi;
    let langMatch: RegExpExecArray | null;
    for (;(langMatch = langRegex.exec(html)) !== null;) {
        const value = langMatch[1];
        if (value) languages.push({ id: value, label: langMatch[2].trim() });
    }

    return { contest, csrfToken, tasks, languages };
}

export async function submitCode(contest: string, taskScreenName: string, languageId: string, sourceCode: string, csrfToken: string): Promise<SubmitStatus> {
    const url = `https://atcoder.jp/contests/${contest}/submit`;
    const body =
        `csrf_token=${encodeURIComponent(csrfToken)}` +
        `&data.TaskScreenName=${encodeURIComponent(taskScreenName)}` +
        `&data.LanguageId=${encodeURIComponent(languageId)}` +
        `&sourceCode=${encodeURIComponent(sourceCode)}`;

    const responseHtml = await fetchTextPost(url, body);

    const errMatch = responseHtml.match(
        /<div[^>]*class="[^"]*(?:alert-danger|alert-warning|alert-error)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (errMatch) {
        const errMsg = errMatch[1].replace(/<[^>]+>/g, "").trim();
        return { success: false, message: errMsg };
    }

    const successed = responseHtml.match(
        /<div[^>]*class="[^"]*alert-success[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (successed) {
        const msg = successed[1].replace(/<[^>]+>/g, "").trim();
        return { success: true, message: msg, url: `https://atcoder.jp/contests/${contest}/submissions/me` };
    }

    if (responseHtml.includes("/submissions/me") || responseHtml.includes("Submission")) {
        return {
            success: true,
            message: "代码提交成功",
            url: `https://atcoder.jp/contests/${contest}/submissions/me`,
        };
    }

    return { success: false, message: "提交失败，请检查 Cookie 是否有效" };
}

export async function submitCodeWithRedirect(contest: string, taskScreenName: string, languageId: string, sourceCode: string): Promise<SubmitStatus> {
    const pageData = await fetchSubmitPage(contest);
    if (!pageData.csrfToken) {
        return { success: false, message: "无法获取 CSRF Token，请检查 Cookie 是否有效" };
    }
    return await submitCode(contest, taskScreenName, languageId, sourceCode, pageData.csrfToken);
}
