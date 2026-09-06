import * as https from "https";
import * as http from "http";
import * as stream from "stream";
import * as zlib from "zlib";
import { t } from "./i18n";

const MAX_ATTEMPTS = 3;
const RATE_LIMIT_MARKERS = ["slow down please", "page load error", "too many requests"];

let freeDeeplID = 1;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDeepLTimestamp(text: string): number {
    const ts = Date.now(), count = text.split('i').length;
    if (count > 0) return ts - (ts % count) + count;
    return ts;
}

function formatDeeplJson(date: object, id: number): string {
    let json = JSON.stringify(date);
    if ((id + 5) % 29 === 0 || (id + 3) % 13 === 0) json = json.replace('"method":"', '"method" : "');
    else json = json.replace('"method":"', '"method": "');
    return json;
}

interface RawResponse {
    statusCode?: number;
    contentType?: string;
    body: string;
}

function readResponse(res: http.IncomingMessage): Promise<string> {
    const rawEncoding = res.headers["content-encoding"];
    const encoding = Array.isArray(rawEncoding) ? rawEncoding.join(",") : (rawEncoding ?? "");
    let readable: stream.Readable = res;
    if (encoding.includes("br")) {
        readable = res.pipe(zlib.createBrotliDecompress());
    } else if (encoding.includes("gzip")) {
        readable = res.pipe(zlib.createGunzip());
    } else if (encoding.includes("deflate")) {
        readable = res.pipe(zlib.createInflate());
    }

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on("data", (chunk: Buffer) => chunks.push(chunk));
        readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        readable.on("error", reject);
    });
}

function requestDeepL(options: https.RequestOptions, postData: string): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

        const req = https.request(options, (res) => {
            readResponse(res).then(
                (body) => settle(() => resolve({ statusCode: res.statusCode, contentType: res.headers["content-type"], body })),
                (err) => settle(() => reject(err)),
            );
        });

        req.setTimeout(20000, () => req.destroy(new Error(t("deepl.timeout"))));
        req.on("error", (err: Error) => settle(() => reject(err)));
        req.write(postData);
        req.end();
    });
}

async function requestWithRetry(options: https.RequestOptions, postData: string): Promise<RawResponse> {
    let last: RawResponse = { statusCode: 429, body: "" };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await requestDeepL(options, postData);
        last = res;
        if (res.statusCode === 429 && attempt < MAX_ATTEMPTS) {
            const delay = 1000 * 2 ** (attempt - 1);
            console.log(`[deepl] 限流 429（第 ${attempt}/${MAX_ATTEMPTS} 次），${delay}ms 后重试`);
            await sleep(delay);
            continue;
        }
        return res;
    }
    return last;
}

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseTranslateJson(body: string): Record<string, unknown> | null {
    try {
        const json: unknown = JSON.parse(stripBom(body));
        return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function getPath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

function preview(body: string, max = 120): string {
    return body.replace(/\s+/g, " ").substring(0, max);
}

function isRateLimitHtml(body: string): boolean {
    const lower = body.toLowerCase();
    return RATE_LIMIT_MARKERS.some((marker) => lower.includes(marker));
}

function logUnexpectedResponse(prefix: string, res: RawResponse): void {
    console.log(`[deepl] ${prefix} status=${res.statusCode} type=${res.contentType} body=${preview(res.body, 200)}`);
}

function buildTranslateError(statusCode: number | undefined, body: string): Error {
    if (statusCode === 429 || isRateLimitHtml(body)) {
        return new Error(t("deepl.rateLimited"));
    }
    const json = parseTranslateJson(body);
    if (json && typeof json.message === "string") {
        return new Error(json.message);
    }
    return new Error(t("deepl.httpError", { status: statusCode ?? "?" }));
}

export async function translateTextFree(text: string, lang: string): Promise<string> {
    const id = freeDeeplID++;
    const postData = formatDeeplJson({
        jsonrpc: "2.0",
        method: "LMT_handle_texts",
        id,
        params: {
            splitting: "newlines",
            lang: {
                source_lang_user_selected: "auto",
                target_lang: lang === "ZH" ? "ZH" : lang,
            },
            texts: [{ text, requestAlternatives: 3 }],
            timestamp: getDeepLTimestamp(text),
        },
    }, id);

    const res = await requestWithRetry(
        {
            hostname: "www2.deepl.com",
            path: "/jsonrpc",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
                "Host": "www2.deepl.com",
                "Origin": "https://www.deepl.com",
                "Referer": "https://www.deepl.com/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            },
        },
        postData,
    );

    if (res.statusCode && res.statusCode >= 400) {
        logUnexpectedResponse("免费翻译请求失败", res);
        throw buildTranslateError(res.statusCode, res.body);
    }
    const json = parseTranslateJson(res.body);
    const translated = json ? getPath(json, "result.texts.0.text") : undefined;
    if (typeof translated === "string" && translated) {
        return translated;
    }
    logUnexpectedResponse("免费翻译响应结构异常", res);
    throw new Error(t("deepl.unexpectedStructure"));
}

export async function translateTextRaw(text: string, targetLang: string, apiKey: string): Promise<string> {
    const params = new URLSearchParams({ text, target_lang: targetLang });
    const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
    const res = await requestWithRetry(
        {
            hostname: host,
            path: "/v2/translate",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `DeepL-Auth-Key ${apiKey}`,
            },
        },
        params.toString(),
    );

    if (res.statusCode && res.statusCode >= 400) {
        logUnexpectedResponse("API 请求失败", res);
        throw buildTranslateError(res.statusCode, res.body);
    }
    const json = parseTranslateJson(res.body);
    const translated = json ? getPath(json, "translations.0.text") : undefined;
    if (typeof translated === "string") {
        return translated;
    }
    logUnexpectedResponse("API 响应结构异常", res);
    throw new Error(t("deepl.unexpectedStructure"));
}
