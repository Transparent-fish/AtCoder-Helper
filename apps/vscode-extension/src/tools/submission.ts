import { fetchText } from "./fetch";

export interface SubmissionDetail {
    id: string;
    contest: string;
    task: string;
    taskScreenName: string;
    time: string;
    status: string;
    score: string;
    language: string;
    code: string;
    codeLength?: string;
    execTime?: string;
    memory?: string;
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

function cleanText(value: string): string {
    return decodeEntities(
        value
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
    );
}

export function parseSubmissionDetail(html: string, contest: string, id: string): SubmissionDetail {
    const detail: SubmissionDetail = {
        id,
        contest,
        task: "",
        taskScreenName: "",
        time: "",
        status: "",
        score: "",
        language: "",
        code: "",
    };

    const codeMatch = html.match(/<pre[^>]*id="submission-code"[^>]*>([\s\S]*?)<\/pre>/i);
    if (codeMatch) detail.code = decodeEntities(codeMatch[1]).trim();

    const rowRegex = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    for (; (rowMatch = rowRegex.exec(html)) !== null;) {
        const label = cleanText(rowMatch[1]);
        const td = rowMatch[2];
        if (/^submission time$/i.test(label) && !detail.time) {
            const t = td.match(/<time[^>]*>([^<]+)<\/time>/i);
            detail.time = t ? t[1].trim() : cleanText(td);
        } else if (/^task$/i.test(label) && !detail.task) {
            const t = td.match(/href="\/contests\/[^/]+\/tasks\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>/i);
            if (t) {
                detail.taskScreenName = t[1];
                detail.task = cleanText(t[2]);
            } else {
                detail.task = cleanText(td);
            }
        } else if (/^language$/i.test(label) && !detail.language) {
            detail.language = cleanText(td);
        } else if (/^score$/i.test(label) && !detail.score) {
            detail.score = cleanText(td);
        } else if (/^code size$/i.test(label) && !detail.codeLength) {
            detail.codeLength = cleanText(td);
        } else if (/^status$/i.test(label) && !detail.status) {
            const s = td.match(/<span[^>]*class=(['"])[^'"]*label[^'"]*\1[^>]*>\s*([^<]+?)\s*<\/span>/i);
            detail.status = s ? s[2].trim() : cleanText(td);
        } else if (/^exec time$/i.test(label) && !detail.execTime) {
            detail.execTime = cleanText(td);
        } else if (/^memory$/i.test(label) && !detail.memory) {
            detail.memory = cleanText(td);
        }
    }

    return detail;
}

export async function fetchSubmissionDetail(contest: string, id: string): Promise<SubmissionDetail> {
    const url = `https://atcoder.jp/contests/${contest}/submissions/${id}`;
    const html = await fetchText(url);
    return parseSubmissionDetail(html, contest, id);
}
