import { fetchText, fetchTextPost, CfError, LoginRequiredError, ProxyError } from "./tools/fetch";

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
        Rated = /<input[^>]*name\s*=\s*"rated"/i.test(from)
    }
    return { contest, title, url, signed, csrfToken, Rated };
}

export async function signedUpContest(contest: string, csrfToken: string, rated?: boolean): Promise<{ success: boolean; message: string }> {
    const url = `https://atcoder.jp/contests/${contest}/register`;
    let body = `csrf_token=${encodeURIComponent(csrfToken)}&terms=on`;

    if (rated) body += `&rated=on`;

    try {
        const html = await fetchTextPost(url, body);

        const formRegex = new RegExp(
            `<form[^>]*action="[^"]*${contest}\/register"[^>]*>([\\s\\S]*?)<\\/form>`,
            "i"
        );
        const form = html.match(formRegex)?.[1];
        const isSigned = form ? /<button[^>]*>Unregister<\/button>/i.test(form) : false;

        if (isSigned) {
            return { success: true, message: "报名成功！" };
        }

        const errMatch = html.match(/<div[^>]*class="[^"]*alert[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const errMsg = errMatch ? errMatch[1].replace(/<[^>]+>/g, "").trim() : "报名失败，请检查 Cookie 是否有效";
        return { success: false, message: errMsg };
    } catch (error) {
        if (error instanceof CfError || error instanceof LoginRequiredError || error instanceof ProxyError) {
            throw error;
        }
        return { success: false, message: error instanceof Error ? error.message : "报名请求失败" };
    }
}