import * as https from "https";
import * as http from "http";
import * as zlib from "zlib";

export class CfError extends Error {
  url: string;
  constructor(url: string) {
    super(`AtCoder 需要 Cloudflare 验证，请在浏览器中打开 ${url} 完成验证后重试`);
    this.name = "CfError";
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

function isCfChallenge(body: string): boolean {
  const cfPatterns = [
    "Just a moment",
    "Checking your browser",
    "cf-challenge",
    "challenge-form",
    "Cloudflare",
    "cf-browser-verification",
    "attention required",
  ];
  return cfPatterns.some((p) => body.toLowerCase().includes(p.toLowerCase()));
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

function fetchText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(
            url,
            { headers: BROWSER_HEADERS },
            (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
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

                    if (res.statusCode === 403 || isCfChallenge(body)) {
                        reject(new CfError(url));
                        return;
                    }
                    if (res.statusCode !== 200) {
                        reject(new Error(`Request failed with status ${res.statusCode}`));
                        return;
                    }

                    resolve(body);
                });
                stream.on("error", reject);
            }
        );
        req.on("error", (err: Error) => {
            reject(new Error(`网络错误: ${err.message}`));
        });
    });
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

function extractSection(html: string, headings: string[]): string {
    for (const h of headings) {
        const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(
            `<h3[^>]*>\\s*${escaped}\\s*<\\/h3>([\\s\\S]*?)(?=<h3[^>]*>|$)`,
            "i"
        );
        const match = html.match(regex);
        if (match) return cleanText(match[1]);
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
