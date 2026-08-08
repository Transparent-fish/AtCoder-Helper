import { fetchText, fetchTextPost, CfError, LoginRequiredError, ProxyError } from "./fetch";

export interface ContestPage {
    contest: string;
    title: string;
    url: string;
    signed: boolean;
    csrfToken: string;
    Rated: boolean;
}

export async function fetchContest(contest: string): Promise<ContestPage> {
    const url = `https://atcoder.jp/contests/${contest}`;
    const html = await fetchText(url);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled";
    const formRegex = new RegExp(
        `<form[^>]*action="[^"]*${contest}\/register"[^>]*>([\\s\\S]*?)<\\/form>`,
        "i"
    );
    const from = html.match(formRegex)?.[1];
    let csrfToken = "", signed = false, Rated = false;
    if (from) {
        const csrfMatch = from.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
        csrfToken = csrfMatch ? (csrfMatch[1] ?? "") : "";
        signed = /<button[^>]*>Unregister<\/button>/i.test(from);
        Rated = /rated_register/i.test(html);
    }
    return { contest, title, url, signed, csrfToken, Rated };
}

function decodeAnnouncementEntities(text: string): string {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

export async function fetchContestAnnouncement(contest: string): Promise<string> {
    const url = `https://atcoder.jp/posts/${contest}_en`;
    try {
        let html = await fetchText(url);
        html = html.replace(/<img[^>]*>/g, '');
        const match = html.match(/class="panel-body blog-post"[^>]*>([\s\S]*?)<\/div>/i);
        if (!match) return "";
        return decodeAnnouncementEntities(match[1]).trim();
    } catch {
        return "";
    }
}

export interface RegistrationResult {
    success: boolean;
    message: string;
}

interface FormField {
    name: string;
    value: string;
}

function extractFormHtml(html: string, contest: string): string {
    const formRegex = new RegExp(
        `<form[^>]*action="[^"]*${contest}\\/register"[^>]*>([\\s\\S]*?)<\\/form>`,
        "i"
    );
    return html.match(formRegex)?.[1] ?? "";
}

function extractFormFields(formHtml: string): FormField[] {
    const fields: FormField[] = [];
    const input = /<input[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = input.exec(formHtml)) !== null) {
        const tag = match[0];
        const nameMatch = tag.match(/name\s*=\s*"([^"]*)"/i);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const typeMatch = tag.match(/type\s*=\s*"([^"]*)"/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : "text";
        const valueMatch = tag.match(/value\s*=\s*"([^"]*)"/i);
        const value = valueMatch ? valueMatch[1] : "";
        if (type === "radio" || type === "checkbox") {
            if (/\schecked\b/i.test(tag)) {
                fields.push({ name, value: value || (type === "checkbox" ? "on" : "") });
            }
        } else {
            fields.push({ name, value });
        }
    }
    const selectRegex = /<select[^>]*name\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/select>/gi;
    let selectMatch: RegExpExecArray | null;
    while ((selectMatch = selectRegex.exec(formHtml)) !== null) {
        const name = selectMatch[1];
        if (!name) continue;
        const optionsHtml = selectMatch[2];
        const selected = optionsHtml.match(/<option[^>]*\bselected\b[^>]*value\s*=\s*"([^"]*)"/i);
        const first = optionsHtml.match(/<option[^>]*value\s*=\s*"([^"]*)"/i);
        fields.push({ name, value: selected ? selected[1] : first ? first[1] : "" });
    }
    return fields;
}

function buildFormBody(fields: FormField[]): string {
    return fields
        .map((f) => `${encodeURIComponent(f.name)}=${encodeURIComponent(f.value)}`)
        .join("&");
}

function parseRegistrationResult(html: string): RegistrationResult {
    const isSigned = /Unregister|registered/i.test(html);
    if (isSigned) return { success: true, message: "报名成功！" };
    const successMatch = html.match(
        /<div[^>]*class="[^"]*alert-success[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (successMatch) {
        const msg = successMatch[1].replace(/<[^>]+>/g, "").trim();
        return { success: true, message: msg || "报名成功！" };
    }
    const errMatch = html.match(
        /<div[^>]*class="[^"]*(?:alert-danger|alert-error)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    );
    if (errMatch) {
        const msg = errMatch[1].replace(/<[^>]+>/g, "").trim();
        return { success: false, message: msg || "报名失败" };
    }
    return { success: false, message: "" };
}

function decodeEntities(text: string): string {
    return text
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

async function completeRatedRegistration(
    contest: string,
    stepHtml: string,
    rated: boolean | undefined,
): Promise<RegistrationResult> {
    const now = new RegExp(
        `<form[^>]*action="[^"]*${contest}\\/rated_register"[^>]*>([\\s\\S]*?)<\\/form>`,
        "i"
    );
    const fallback: RegistrationResult = { success: false, message: "报名失败，请检查 Cookie 是否有效" };
    const step2Form = stepHtml.match(now)?.[1];
    if (!step2Form) {
        const result = parseRegistrationResult(stepHtml);
        return result.message ? result : fallback;
    }
    const csrfMatch = step2Form.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
    const step2Csrf = csrfMatch ? decodeEntities(csrfMatch[1]) : "";
    const step2Body = `csrf_token=${encodeURIComponent(step2Csrf)}&rated=${rated === false ? "false" : "true"}`;
    const step2Html = await fetchTextPost(
        `https://atcoder.jp/contests/${contest}/rated_register`,
        step2Body
    );
    const result = parseRegistrationResult(step2Html);
    return result.message ? result : fallback;
}

async function registerStandard(contest: string, csrfToken: string, rated: boolean | undefined): Promise<RegistrationResult> {
    const step1Url = `https://atcoder.jp/contests/${contest}/register`;
    const step1Body = `csrf_token=${encodeURIComponent(csrfToken)}&terms=on`;
    const step1Html = await fetchTextPost(step1Url, step1Body);
    return await completeRatedRegistration(contest, step1Html, rated);
}

async function registerFormBased(contest: string, formHtml: string, rated: boolean | undefined): Promise<RegistrationResult> {
    const registerUrl = `https://atcoder.jp/contests/${contest}/register`;
    const body = buildFormBody(extractFormFields(formHtml));
    const responseHtml = await fetchTextPost(registerUrl, body);
    const stillOnRegisterPage = /<h2[^>]*>\s*Register\s*<\/h2>/i.test(responseHtml);
    if (stillOnRegisterPage) {
        const result = parseRegistrationResult(responseHtml);
        if (result.message) return result;
        return {
            success: false,
            message: "报名未成功：注册页返回校验结果，请确认表单必填信息（如姓名、邮箱、居住地等）填写完整",
        };
    }
    return await completeRatedRegistration(contest, responseHtml, rated);
}

export async function signedUpContest(contest: string, csrfToken: string, rated?: boolean): Promise<RegistrationResult> {
    const registerUrl = `https://atcoder.jp/contests/${contest}/register`;
    try {
        const registerHtml = await fetchText(registerUrl);
        if (/Unregister|already registered/i.test(registerHtml)) {
            return { success: true, message: "已报名" };
        }
        const formHtml = extractFormHtml(registerHtml, contest);
        if (!formHtml) {
            return { success: false, message: "报名已截止或无法获取报名信息" };
        }
        const freshCsrfMatch = formHtml.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
        const freshCsrf = freshCsrfMatch ? freshCsrfMatch[1] : csrfToken;
        if (/name="terms"/i.test(formHtml)) {
            return await registerStandard(contest, freshCsrf, rated);
        }
        return await registerFormBased(contest, formHtml, rated);
    } catch (error) {
        if (error instanceof CfError || error instanceof LoginRequiredError || error instanceof ProxyError) {
            throw error;
        }
        return { success: false, message: error instanceof Error ? error.message : "报名请求失败" };
    }
}