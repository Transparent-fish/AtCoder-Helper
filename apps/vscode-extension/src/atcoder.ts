import katex from "katex";
import { fetchText, CfError, ProxyError, LoginRequiredError } from "./tools/fetch";
import { SubStatus } from "./tools/types";

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
    sampleUrl?: string;
    timeLimit?: number;
    memoryLimit?: number;
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
    const startMatch = html.match(
        new RegExp(`<span[^>]*\\sclass="[^"]*\\blang-${lang}\\b[^"]*"[^>]*>`, "i")
    );
    if (!startMatch || startMatch.index === undefined) return html;
    const start = startMatch.index + startMatch[0].length;
    const now = /<\/?span\b[^>]*>/gi;
    let dep = 1;
    now.lastIndex = start;
    let m: RegExpExecArray | null;
    for (; (m = now.exec(html)) !== null;) {
        if (m[0].startsWith("</")) {
            dep--;
            if (dep === 0) return html.slice(start, m.index);
        } else dep++;
    }
    return html.slice(start);
}

function extractHeaderValue(html: string, labels: string[]): string | undefined {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    for (; (rowMatch = rowRegex.exec(html)) !== null;) {
        const row = rowMatch[1];
        if (!labels.some((label) => row.includes(label))) continue;
        const tds = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
        if (tds.length === 0) continue;
        const value = cleanText(tds[tds.length - 1][1]);
        return value || undefined;
    }
    return undefined;
}

function extractTimeLimit(html: string): number | undefined {
    const value = extractHeaderValue(html, ["Time Limit", "時間制限"]);
    const match = value && value.match(/(\d+(?:\.\d+)?)/);
    if (!match) return undefined;
    const ms = value!.toLowerCase().includes("sec")
        ? parseFloat(match[1]) * 1000
        : parseFloat(match[1]);
    return Math.round(ms);
}

function extractMemoryLimit(html: string): number | undefined {
    const value = extractHeaderValue(html, ["Memory Limit", "メモリ制限"]);
    const match = value && value.match(/(\d+(?:\.\d+)?)/);
    if (!match) return undefined;
    return Math.round(parseFloat(match[1]));
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

    const sampleLinkMatch = contentSrc.match(/href="([^"]*output=sample[^"]*)"/i);
    const sampleUrl = sampleLinkMatch ? sampleLinkMatch[1] : undefined;

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
        sampleUrl,
        timeLimit: extractTimeLimit(html),
        memoryLimit: extractMemoryLimit(html),
    };
}

export async function fetchAtCoderProblem(contest: string, task: string): Promise<AtCoderProblem> {
    const url = `https://atcoder.jp/contests/${contest}/tasks/${task}`;
    const html = await fetchText(url);
    return parseProblemPage(html, url);
}

export async function fetchAtCoderTasks(contest: string): Promise<Array<{ label: string; value: string; url: string; status?: string }>> {
    const url = `https://atcoder.jp/contests/${contest}/tasks`;
    const html = await fetchText(url);
    const contestPattern = contest.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const taskRegex = new RegExp(
        `<a\\s+href="\\/contests\\/${contestPattern}\\/tasks\\/([^"#]+)"[^>]*>([^<]+)<\\/a>`,
        "gi"
    );
    const best = new Map<string, string>();
    Array.from(html.matchAll(taskRegex))
        .filter(([, task]) => task && task !== "tasks_print" && !task.includes("/"))
        .forEach(([, task, label]) => {
            const cleaned = cleanText(label);
            const prev = best.get(task);
            if (!prev || cleaned.length > prev.length) {
                best.set(task, cleaned);
            }
        });
    return Array.from(best.entries()).map(([task, label]) => {
        const suffix = (task.split("_").pop() || "").toUpperCase();
        const title = label.replace(/^[A-Za-z0-9]+\s*[-–—.]\s*/, "").trim();
        return { label: `${suffix} - ${title}`, value: task, url: `https://atcoder.jp/contests/${contest}/tasks/${task}` };
    });
}