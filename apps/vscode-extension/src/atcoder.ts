import * as https from "https";
import * as http from "http";
import * as zlib from "zlib";
import * as net from "net";
import * as tls from "tls";
import katex from "katex";

export class CfError extends Error {
  url: string;
  constructor(url: string) {
    super(`AtCoder 需要 Cloudflare 验证，请在浏览器中打开 ${url} 完成验证后重试`);
    this.name = "CfError";
    this.url = url;
  }
}

export class ProxyError extends Error {
  constructor() {
    super(
      `网络代理连接失败，无法访问 AtCoder。\n` +
      `可能原因：在 WSL 2 中，代理地址 127.0.0.1 指向 WSL 而非 Windows 宿主机。\n` +
      `解决方案：\n` +
      `  1. 在 WSL 中执行: export NO_PROXY=.atcoder.jp\n` +
      `  2. 或设置正确的宿主机 IP: export HTTPS_PROXY=http://$(hostname).local:7897\n` +
      `  3. 或连接 Windows 宿主机的 WSL 网关 IP（查看 /etc/resolv.conf）`
    );
    this.name = "ProxyError";
  }
}

export class LoginRequiredError extends Error {
  url: string;
  constructor(url: string) {
    super(
      `访问需要登录，请设置 AtCoder Cookie。\n` +
      `获取方法：\n` +
      `  1. 在浏览器中登录 https://atcoder.jp\n` +
      `  2. 按 F12 打开开发者工具 → Application → Cookies\n` +
      `  3. 找到 atcoder.jp 下的 REVEL_SESSION，复制其 Value\n` +
      `  4. 在插件设置中输入: REVEL_SESSION=复制的值`
    );
    this.name = "LoginRequiredError";
    this.url = url;
  }
}


export interface SampleCase {
    index: number;
    input: string;
    output: string;
}

export interface AtCoderProblem {
    contest: string;
    title: string;
    url: string;
    statement: string;
    constraints: string;
    inputFormat: string;
    outputFormat: string;
    samples: SampleCase[];
}



const cfPatterns = [
  "Just a moment",
  "Checking your browser",
  "cf-challenge",
  "challenge-form",
  "Cloudflare",
  "cf-browser-verification",
  "attention required",
  "checking-browser",
  "challenge-platform",
  "cf-im-under-attack",
];

function isCfChallenge(body: string): boolean {
  const lower = body.toLowerCase();
  const matched = cfPatterns.find((p) => lower.includes(p));
  if (matched) {
    console.log(`[isCfChallenge] 匹配到 CF 特征: "${matched}"`);
  }
  return !!matched;
}

function isLoginPage(body: string): boolean {
  if (body.length < 500) {
    console.log(`[isLoginPage] body 过短 (${body.length}), 跳过`);
    return false;
  }
  const lower = body.toLowerCase();
  if (lower.includes("sign in") && lower.includes("password")) {
    console.log(`[isLoginPage] 匹配: sign in + password`);
    return true;
  }
  const loginForm = /<form[^>]*action\s*=\s*"\/login[^"]*"/i.test(body);
  const loginHref = /<a[^>]*href\s*=\s*"\/login[^"]*"/i.test(body);
  const hasLoginFields = /<input[^>]*(name\s*=\s*"(username|password|csrf_token)")/i.test(body);
  if (loginForm && (loginHref || hasLoginFields)) {
    console.log(`[isLoginPage] 匹配: login 表单 + 链接/输入框`);
    return true;
  }
  console.log(`[isLoginPage] 未匹配, body.preview=${body.substring(0, 200).replace(/\n/g, " ")}`);
  return false;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

let sessionCookie = "";

export function setSessionCookie(cookie: string): void {
  console.log(`[setSessionCookie] 设置 Cookie: ${cookie ? cookie.substring(0, 40) + "..." : "清空"}`);
  sessionCookie = cookie;
}

export function getSessionCookie(): string {
  return sessionCookie;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...BROWSER_HEADERS };
  if (sessionCookie) {
    headers["Cookie"] = sessionCookie;
    console.log(`[getHeaders] 已注入 Cookie: ${sessionCookie.substring(0, 40)}...`);
  } else {
    console.log(`[getHeaders] 未设置 Cookie`);
  }
  return headers;
}

function isProxyError(err: Error): boolean {
    const msg = err.message.toLowerCase();
    return msg.includes("proxy") || msg.includes("connect") || msg.includes("econnrefused") || msg.includes("econnreset");
}

function getAgent(url: string): http.Agent | https.Agent {
    const isHttps = url.startsWith("https");
    const baseAgent = isHttps ? https : http;
    return new (baseAgent as any).Agent({
        keepAlive: true,
        keepAliveMsecs: 1000,
        createConnection: (options: any, callback: any) => {
            const hostname = options.hostname || options.host || "localhost";
            const port = options.port || (isHttps ? 443 : 80);
            const socket = net.connect(port, hostname, () => {
                if (isHttps) {
                    callback(null, tls.connect({
                        socket,
                        host: hostname,
                        servername: hostname,
                    }));
                } else {
                    callback(null, socket);
                }
            });
            socket.on("error", callback);
        },
    });
}

const directAgents = new Map<string, http.Agent | https.Agent>();

function getDirectAgent(url: string): http.Agent | https.Agent {
    const key = url.startsWith("https") ? "https" : "http";
    if (!directAgents.has(key)) {
        directAgents.set(key, getAgent(url));
    }
    return directAgents.get(key)!;
}

function fetchText(url: string): Promise<string> {
    const logPrefix = `[fetchText]`;

    const savedProxy = {
        HTTP_PROXY: process.env.HTTP_PROXY,
        HTTPS_PROXY: process.env.HTTPS_PROXY,
        NO_PROXY: process.env.NO_PROXY,
        http_proxy: process.env.http_proxy,
        https_proxy: process.env.https_proxy,
        no_proxy: process.env.no_proxy,
    };
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    process.env.NO_PROXY = "*";
    process.env.no_proxy = "*";

    function restoreProxy() {
        for (const [k, v] of Object.entries(savedProxy)) {
            if (v === undefined) delete process.env[k];
            else process.env[k] = v;
        }
    }

    console.log(`${logPrefix} 开始请求`, url, `Cookie: ${sessionCookie ? sessionCookie.substring(0, 25) + "..." : "无"}`);
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(
            url,
            {
                headers: getHeaders(),
                agent: getDirectAgent(url),
            },
            (res) => {
                console.log(`${logPrefix} 收到响应:`, url, `status=${res.statusCode}`, `headers=${JSON.stringify(res.headers)}`);

                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    console.log(`${logPrefix} 重定向:`, res.statusCode, `->`, res.headers.location);
                    restoreProxy();
                    if (res.headers.location.includes("/login")) {
                        console.log(`${logPrefix} 检测到登录重定向`);
                        reject(new LoginRequiredError(url));
                        return;
                    }
                    resolve(fetchText(res.headers.location));
                    return;
                }

                const encoding = res.headers["content-encoding"] || "";
                let stream: any = res;
                if (encoding.includes("br")) {
                    stream = res.pipe(zlib.createBrotliDecompress());
                } else if (encoding.includes("gzip")) {
                    stream = res.pipe(zlib.createGunzip());
                } else if (encoding.includes("deflate")) {
                    stream = res.pipe(zlib.createInflate());
                }

                const chunks: Buffer[] = [];
                stream.on("data", (chunk: Buffer) => {
                    chunks.push(chunk);
                });
                stream.on("end", () => {
                    const body = Buffer.concat(chunks).toString("utf8");
                    console.log(`${logPrefix} 响应体:`, url, `status=${res.statusCode}`, `body.length=${body.length}`, `body.preview=${body.substring(0, 300)}`);

                    restoreProxy();

                    if (res.statusCode === 403 || isCfChallenge(body)) {
                        console.log(`${logPrefix} 检测到 Cloudflare 挑战`);
                        reject(new CfError(url));
                        return;
                    }
                    if (isLoginPage(body)) {
                        console.log(`${logPrefix} 检测到登录页面`);
                        reject(new LoginRequiredError(url));
                        return;
                    }
                    if (res.statusCode !== 200) {
                        if (res.statusCode === 404) {
                            if (sessionCookie) {
                                console.log(`${logPrefix} 404 但有 Cookie，可能 Cookie 无效`);
                                reject(new Error(`访问失败 (404)。Cookie 可能无效或已过期，请重新登录 AtCoder 获取新的 REVEL_SESSION`));
                                return;
                            }
                            console.log(`${logPrefix} 404 且无 Cookie，需要登录`);
                            reject(new Error(`访问失败 (404)。题目不存在或需要登录，请先设置 AtCoder Cookie。`));
                            return;
                        }
                        console.log(`${logPrefix} 非 200 状态码:`, res.statusCode);
                        reject(new Error(`Request failed with status ${res.statusCode}`));
                        return;
                    }

                    console.log(`${logPrefix} 请求成功:`, url, `body.length=${body.length}`);
                    resolve(body);
                });
                stream.on("error", (err: Error) => {
                    restoreProxy();
                    reject(err);
                });
            }
        );
        req.on("error", (err: Error) => {
            restoreProxy();
            console.log(`${logPrefix} 请求错误:`, url, err.message);
            if (isProxyError(err)) {
                reject(new ProxyError());
                return;
            }
            reject(new Error(`网络错误: ${err.message}`));
        });
    });
}

function decodeEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

function cleanText(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\r/g, "")
        .trim();
}

const ALLOWED_TAGS = new Set([
    "p", "br", "ul", "ol", "li", "strong", "em", "b", "i",
    "code", "pre", "sub", "sup", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "blockquote", "span", "div", "table", "thead", "tbody", "tr", "th", "td",
]);

function cleanHtmlTags(html: string): string {
    let result = html.replace(/<br\s*\/?>/gi, "\n");

    result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
        const lower = tagName.toLowerCase();
        if (match.startsWith("</")) {
            return ALLOWED_TAGS.has(lower) ? `</${lower}>` : "";
        }
        if (lower === "a") {
            const hrefMatch = match.match(/href\s*=\s*"([^"]*)"/i);
            const href = hrefMatch ? hrefMatch[1] : "";
            return href ? `<a href="${href}">` : "<a>";
        }
        return ALLOWED_TAGS.has(lower) ? `<${lower}>` : "";
    });

    result = result.replace(/&nbsp;/gi, " ");
    return result;
}

function renderMath(html: string): string {
    const protectedMath: { content: string; isDisplay: boolean }[] = [];

    let processed = html
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, expr) => {
            protectedMath.push({ content: decodeEntities(expr), isDisplay: true });
            return `@@MATH_${protectedMath.length - 1}@@`;
        })
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, expr) => {
            protectedMath.push({ content: decodeEntities(expr), isDisplay: false });
            return `@@MATH_${protectedMath.length - 1}@@`;
        })
        .replace(/<var\b[^>]*>([\s\S]*?)<\/var>/gi, (_, content) => {
            protectedMath.push({ content: decodeEntities(content), isDisplay: false });
            return `@@MATH_${protectedMath.length - 1}@@`;
        });

    processed = cleanHtmlTags(processed)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    processed = processed.replace(/@@MATH_(\d+)@@/g, (_, idx) => {
        const math = protectedMath[parseInt(idx)];
        if (!math) return "";
        try {
            return katex.renderToString(math.content, {
                displayMode: math.isDisplay,
                throwOnError: false,
                output: "html",
            });
        } catch {
            const escaped = math.content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return math.isDisplay
                ? `<div class="math-fallback">\\[${escaped}\\]</div>`
                : `<span class="math-fallback">\\(${escaped}\\)</span>`;
        }
    });

    return processed;
}

function extractSection(html: string, headings: string[]): string {
    for (const h of headings) {
        const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(
            `<h3[^>]*>\\s*${escaped}\\s*<\\/h3>([\\s\\S]*?)(?=<h3[^>]*>|$)`,
            "i"
        );
        const match = html.match(regex);
        if (match) return renderMath(match[1]);
    }
    return "";
}

function getLangContent(html: string, lang: "en" | "ja"): string {
    const pattern = `<span[^>]*\\sclass="[^"]*\\blang-${lang}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/span>`;
    const match = html.match(new RegExp(pattern, "i"));
    return match ? match[1] : html;
}

export function parseProblemPage(html: string, url: string): AtCoderProblem {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? cleanText(titleMatch[1]) : "Untitled";

    const contestMatch = url.match(/\/contests\/([^/]+)/i);
    const contest = contestMatch ? contestMatch[1] : "unknown";

    const langEn = getLangContent(html, "en");
    const contentSrc = langEn.length > 100 ? langEn : html;

    const statement = extractSection(contentSrc, ["Problem Statement", "問題文"]);
    const constraints = extractSection(contentSrc, ["Constraints", "制約"]);
    const inputFormat = extractSection(contentSrc, ["Input", "入力"]);
    const outputFormat = extractSection(contentSrc, ["Output", "出力"]);

    const samples: SampleCase[] = [];
    const sampleBlocks = Array.from(html.matchAll(/<h3[^>]*>\s*Sample\s*(Input|Output)\s*(\d+)\s*<\/h3>/gi));

    for (const match of sampleBlocks) {
        const type = match[1].toLowerCase();
        const index = Number(match[2]);
        const block = html.slice(match.index ?? 0, html.length);
        const sectionStart = (match.index ?? 0) + match[0].length;
        const nextSection = html.slice(sectionStart).match(/<h3[^>]*>/i);
        const sectionEnd = nextSection ? sectionStart + nextSection.index! : html.length;
        const sectionHtml = html.slice(sectionStart, sectionEnd);
        const pre = sectionHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        if (pre) {
            const content = cleanText(pre[1]);
            if (type === "input") {
                const existing = samples.find((item) => item.index === index);
                if (existing) {
                    existing.input = content;
                } else {
                    samples.push({ index, input: content, output: "" });
                }
            } else {
                const existing = samples.find((item) => item.index === index);
                if (existing) {
                    existing.output = content;
                } else {
                    samples.push({ index, input: "", output: content });
                }
            }
        }
    }

    return {
        contest,
        title,
        url,
        statement,
        constraints,
        inputFormat,
        outputFormat,
        samples,
    };
}

export async function fetchAtCoderProblem(contest: string, task: string): Promise<AtCoderProblem> {
    const url = `https://atcoder.jp/contests/${contest}/tasks/${task}`;
    const html = await fetchText(url);
    return parseProblemPage(html, url);
}

export async function fetchAtCoderTasks(contest: string): Promise<Array<{ label: string; value: string; url: string }>> {
    const url = `https://atcoder.jp/contests/${contest}/tasks`;
    const html = await fetchText(url);
    const contestPattern = contest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const taskRegex = new RegExp(
        `<a\\s+href="\\/contests\\/${contestPattern}\\/tasks\\/([^"#]+)"[^>]*>([^<]+)<\\/a>`,
        "gi"
    );
    const tasks = Array.from(html.matchAll(taskRegex));
    return tasks
        .filter(([, task]) => task && task !== "tasks_print")
        .map(([, task, label]) => ({
            label: cleanText(label),
            value: task,
            url: `https://atcoder.jp/contests/${contest}/tasks/${task}`,
        }));
}
