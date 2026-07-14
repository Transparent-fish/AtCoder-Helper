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
        Rated = true; // 表单存在即表示可能有评级选项（step 2 的 rated_register 表单决定）
    }
    return { contest, title, url, signed, csrfToken, Rated };
}

export async function signedUpContest(contest: string, csrfToken: string, rated?: boolean): Promise<{ success: boolean; message: string }> {
    const step1Url = `https://atcoder.jp/contests/${contest}/register`;
    const step2Url = `https://atcoder.jp/contests/${contest}/rated_register`;
    const step1Body = `csrf_token=${encodeURIComponent(csrfToken)}&terms=on`;

    try {
        const step1Html = await fetchTextPost(step1Url, step1Body);
        const now = new RegExp(
            `<form[^>]*action="[^"]*${contest}\\/rated_register"[^>]*>([\\s\\S]*?)<\\/form>`,
            "i"
        );
        const step2Form = step1Html.match(now)?.[1];

        if (step2Form) {
            const csrfMatch = step2Form.match(/name="csrf_token"[^>]*value="([^"]*)"/i);
            const step2Csrf = csrfMatch ? csrfMatch[1] : "";
            const step2Body = `csrf_token=${encodeURIComponent(step2Csrf)}&rated=${rated === false ? "false" : "true"}`;
            const step2Html = await fetchTextPost(step2Url, step2Body);

            const isSigned = /Unregister|registered/i.test(step2Html);
            if (isSigned) {
                return { success: true, message: "报名成功！" };
            }

            const errMatch = step2Html.match(/<div[^>]*class="[^"]*(?:alert-danger|alert-warning|alert-error)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            const errMsg = errMatch ? errMatch[1].replace(/<[^>]+>/g, "").trim() : "报名失败，请检查 Cookie 是否有效";
            return { success: false, message: errMsg };
        }

        const isSigned = /Unregister|registered/i.test(step1Html);

        if (isSigned) {
            return { success: true, message: "报名成功！" };
        }

        const errMatch = step1Html.match(/<div[^>]*class="[^"]*(?:alert-danger|alert-warning|alert-error)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const errMsg = errMatch ? errMatch[1].replace(/<[^>]+>/g, "").trim() : "报名失败，请检查 Cookie 是否有效";
        return { success: false, message: errMsg };
    } catch (error) {
        if (error instanceof CfError || error instanceof LoginRequiredError || error instanceof ProxyError) {
            throw error;
        }
        return { success: false, message: error instanceof Error ? error.message : "报名请求失败" };
    }
}