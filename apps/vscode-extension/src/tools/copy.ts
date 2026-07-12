import { AtCoderProblem } from "../atcoder";

function htmlToText(html: string): string {
    let text = html
        .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
        .replace(/\s*<li[^>]*>/gi, "\n- ")
        .replace(/<\/li>/gi, "")
        .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
        .replace(/<var>([\s\S]*?)<\/var>/gi, "$1")
        .replace(/<\/?[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    return text;
}

export function copyMarkdown(problem: AtCoderProblem): string {
    const parts: string[] = [];

    parts.push(`## ${problem.title}`);
    parts.push(problem.url);
    parts.push("");

    if (problem.statement) {
        parts.push("### 题目描述");
        parts.push(htmlToText(problem.statement));
        parts.push("");
    }

    if (problem.constraints) {
        parts.push("### 约束");
        parts.push(htmlToText(problem.constraints));
        parts.push("");
    }

    if (problem.inputFormat) {
        parts.push("### 输入格式");
        parts.push(htmlToText(problem.inputFormat));
        parts.push("");
    }

    if (problem.outputFormat) {
        parts.push("### 输出格式");
        parts.push(htmlToText(problem.outputFormat));
        parts.push("");
    }

    if (problem.samples && problem.samples.length > 0) {
        for (const sample of problem.samples) {
            parts.push(`### 样例 ${sample.index}`);
            parts.push("输入");
            parts.push("```\n" + sample.input + "\n```");
            parts.push("");
            parts.push("输出");
            parts.push("```\n" + sample.output + "\n```");
            parts.push("");
        }
    }

    return parts.join("\n");
}
