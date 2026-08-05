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

function extractSelectInner(html: string, attrName: string, attrValue: string): string | null {
    const patterns = [
        `${attrName}="${attrValue}"`,
        `${attrName}='${attrValue}'`,
    ];
    for (const p of patterns) {
        const regex = new RegExp(`<select[^>]*${p}[^>]*>([\\s\\S]*?)<\\/select>`, 'i');
        const m = html.match(regex);
        if (m) return m[1];
    }
    return null;
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function parseOptions(html: string): Array<{ value: string; label: string }> {
    const results: Array<{ value: string; label: string }> = [];
    const optionRegex = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/gi;
    let m: RegExpExecArray | null;
    for (; (m = optionRegex.exec(html)) !== null;) {
        const value = m[1];
        if (value) results.push({ value, label: decodeHtmlEntities(m[2].trim()) });
    }
    return results;
}

function extractSelectOptions(html: string, name?: string, id?: string): Array<{ value: string; label: string }> {
    let inner: string | null = null;
    if (name) inner = extractSelectInner(html, "name", name);
    if (!inner && id) inner = extractSelectInner(html, "id", id);
    if (inner) return parseOptions(inner);
    return [];
}

export async function fetchSubmitPage(contest: string): Promise<SubmitPage> {
    const url = `https://atcoder.jp/contests/${contest}/submit`;
    const html = await fetchText(url);

    const csrfMatch = html.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    let tasks = extractSelectOptions(html, "data.TaskScreenName", "select-task");
    if (tasks.length === 0) {
        tasks = parseOptions(html).filter(o => o.value && !/^\d+$/.test(o.value));
    }

    let langOptions = extractSelectOptions(html, "data.LanguageId", "select-lang");
    if (langOptions.length === 0) {
        const allOptions = parseOptions(html);
        langOptions = allOptions.filter(o => /^\d+$/.test(o.value));
    }

    const seen = new Set<string>();
    const languages: LanguageOption[] = [];
    for (const opt of langOptions) {
        if (!seen.has(opt.value)) {
            seen.add(opt.value);
            languages.push({ id: opt.value, label: opt.label });
        }
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
