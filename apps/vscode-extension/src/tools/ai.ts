import * as https from "https";
import * as http from "http";
import * as stream from "stream";
import * as zlib from "zlib";
import { t } from "./i18n";

const MAX_ATTEMPTS = 3;
const DEFAULT_TEMPERATURE = 0;
const REQUEST_TIMEOUT = 60000;

export interface AiTranslateConfig {
    baseUrl: string
    model: string
}

interface TranslateMessage {
    role: "system" | "user";
    content: string;
}

interface TranslateBody {
    model: string
    temperature: number
    stream: false
    messages: TranslateMessage[]
}

interface RawResponse {
    statusCode?: number;
    contentType?: string;
    body: string;
}

interface Endpoint {
    hostname: string;
    port?: string;
    path: string;
}

const SYSTEM_PROMPT =
    "You are a professional translator for competitive programming problem statements. " +
    "Translate the user's HTML content into {lang}. " +
    "Preserve ALL HTML tags and attributes exactly, and keep math formulas " +
    "(e.g. $...$, \\(...\\), \\[...\\] and <span class=\"katex\">...</span>) unchanged. " +
    "Do not translate code, identifiers, variables or URLs. " +
    "Output ONLY the translated content, with no explanations and no markdown fences.";

const LANG_NAMES: Record<string, string> = {
    ZH: "Simplified Chinese",
    EN: "English",
    JA: "Japanese",
};

function resolveTargetLang(targetLang: string): string {
    return LANG_NAMES[targetLang.toUpperCase()] ?? targetLang;
}

export function buildTranslateBody(text: string, targetLang: string, model: string): string {
    const body: TranslateBody = {
        model,
        temperature: DEFAULT_TEMPERATURE,
        stream: false,
        messages: [
            { role: "system", content: SYSTEM_PROMPT.replace("{lang}", resolveTargetLang(targetLang)) },
            { role: "user", content: text },
        ],
    };
    return JSON.stringify(body);
}

function parseEndpoint(baseUrl: string): Endpoint {
    const normalized = baseUrl.trim().replace(/\/+$/, "");
    const url = new URL(`${normalized}/chat/completions`);
    return {
        hostname: url.hostname,
        port: url.port || undefined,
        path: url.pathname + url.search,
    };
}

function readResponse(res: http.IncomingMessage): Promise<string> {
    const rawEncoding = res.headers["content-encoding"];
    const encoding = Array.isArray(rawEncoding) ? rawEncoding.join(",") : (rawEncoding ?? "");
    let readable: stream.Readable = res;
    if (encoding.includes("br")) readable = res.pipe(zlib.createBrotliDecompress());
    else if (encoding.includes("gzip")) readable = res.pipe(zlib.createGunzip());
    else if (encoding.includes("deflate")) readable = res.pipe(zlib.createInflate());

    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on("data", (chunk: Buffer) => chunks.push(chunk));
        readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        readable.on("error", reject);
    });
}

function requestAi(options: https.RequestOptions, postData: string): Promise<RawResponse> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

        const req = https.request(options, (res) => {
            readResponse(res).then(
                (body) => settle(() => resolve({ statusCode: res.statusCode, contentType: res.headers["content-type"], body })),
                (err) => settle(() => reject(err)),
            );
        });

        req.setTimeout(REQUEST_TIMEOUT, () => req.destroy(new Error(t("ai.timeout"))));
        req.on("error", (err: Error) => settle(() => reject(err)));
        req.write(postData);
        req.end();
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestWithRetry(options: https.RequestOptions, postData: string): Promise<RawResponse> {
    let last: RawResponse = { statusCode: 429, body: "" };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await requestAi(options, postData);
        last = res;
        if (res.statusCode === 429 && attempt < MAX_ATTEMPTS) {
            const delay = 1000 * 2 ** (attempt - 1);
            console.log(`[ai] 限流 429（第 ${attempt}/${MAX_ATTEMPTS} 次），${delay}ms 后重试`);
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

function parseJson(body: string): Record<string, unknown> | null {
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

export function parseTranslateResponse(body: string): string | null {
    const json = parseJson(body);
    const content = json ? getPath(json, "choices.0.message.content") : undefined;
    return typeof content === "string" ? content : null;
}

function buildTranslateError(statusCode: number | undefined, body: string): Error {
    if (statusCode === 429) return new Error(t("ai.rateLimited"));
    const json = parseJson(body);
    const message = json ? getPath(json, "error.message") : undefined;
    if (typeof message === "string" && message) return new Error(message);
    return new Error(t("ai.httpError", { status: statusCode ?? "?" }));
}

export async function translateTextAI(
    text: string,
    targetLang: string,
    config: AiTranslateConfig,
    apiKey: string,
): Promise<string> {
    const postData = buildTranslateBody(text, targetLang, config.model);
    const endpoint = parseEndpoint(config.baseUrl);

    const res = await requestWithRetry(
        {
            hostname: endpoint.hostname,
            port: endpoint.port,
            path: endpoint.path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
                Authorization: `Bearer ${apiKey}`,
            },
        },
        postData,
    );

    if (res.statusCode && res.statusCode >= 400) {
        throw buildTranslateError(res.statusCode, res.body);
    }
    const translated = parseTranslateResponse(res.body);
    if (translated !== null) {
        return translated;
    }
    throw new Error(t("ai.unexpectedStructure"));
}