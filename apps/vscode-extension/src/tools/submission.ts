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
    judgeSets?: JudgeSet[];
}

export interface JudgeStatus {
    status: string; //"AC"
    cnt: number; //"4"
}

export interface JudgeSet {
    name: string; //"Simple"
    score: string;  //100
    maxScore: string;//100
    statuses: JudgeStatus[];
    caseName: string[];//文件
    cases?: Array<{ name: string; status: string }>; //逐测试点判定
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

    detail.judgeSets = parseJudgeResult(html);
    return detail;
}
export async function fetchSubmissionDetail(contest: string, id: string): Promise<SubmissionDetail> {
    const url = `https://atcoder.jp/contests/${contest}/submissions/${id}`;
    const html = await fetchText(url);
    return parseSubmissionDetail(html, contest, id);
}

function splitOuterRows(html: string): string[] {
    const rows: string[] = [];
    const tagRegex = /<tr[^>]*>|<\/tr>/gi;
    let depth = 0;
    let start: number | null = null;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(html)) !== null) {
        if (match[0].startsWith("</")) {
            depth--;
            if (depth === 0 && start !== null) {
                rows.push(html.slice(start, match.index));
                start = null;
            }
        } else {
            if (depth === 0) start = match.index + match[0].length;
            depth++;
        }
    }
    return rows;
}

function splitOuterRowCells(rowHtml: string): string[] {
    const cells: string[] = [];
    const tagRegex = /<(td|th)[^>]*>|<\/(td|th)>/gi;
    let depth = 0;
    let start: number | null = null;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(rowHtml)) !== null) {
        if (match[0].startsWith("</")) {
            depth--;
            if (depth === 0 && start !== null) {
                cells.push(rowHtml.slice(start, match.index));
                start = null;
            }
        } else {
            if (depth === 0) start = match.index + match[0].length;
            depth++;
        }
    }
    return cells;
}

function splitOuterTables(html: string): string[] {
    const tables: string[] = [];
    const tagRegex = /<table[^>]*>|<\/table>/gi;
    let depth = 0;
    let start: number | null = null;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(html)) !== null) {
        if (match[0].startsWith("</")) {
            depth--;
            if (depth === 0 && start !== null) {
                tables.push(html.slice(start, match.index));
                start = null;
            }
        } else {
            if (depth === 0) start = match.index + match[0].length;
            depth++;
        }
    }
    return tables;
}

function extractJudgeResultSection(html: string): string | null {
    const h4 = html.match(/<h4[^>]*>\s*Judge Result\s*<\/h4>([\s\S]*?)(?=<h4[^>]*>|$)/i);
    if (h4) return h4[1];
    const h3 = html.match(/<h3[^>]*>\s*Judge Result\s*<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/i);
    return h3 ? h3[1] : null;
}

function parseStatusCell(cellHtml: string): string {
    const labelMatch = cellHtml.match(/<span[^>]*class=(['"])[^'"]*\blabel\b[^'"]*\1[^>]*>\s*([^<]+?)\s*<\/span>/i);
    return labelMatch ? labelMatch[2].trim() : cleanText(cellHtml);
}

function parseStatuses(statusCell: string): JudgeStatus[] {
    const statuses: JudgeStatus[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match: RegExpExecArray | null;
    for (; (match = rowRegex.exec(statusCell)) !== null; ) {
        const row = match[1];
        const status = parseStatusCell(row);
        if (!status) continue;
        const countMatch = row.match(/×\s*(\d+)/i);
        statuses.push({ status, cnt: countMatch ? parseInt(countMatch[1], 10) : 1 });
    }
    return statuses;
}

function parseAggregateTable(tableHtml: string): Array<Pick<JudgeSet, "name" | "score" | "maxScore" | "statuses">> {
    const rows = splitOuterRows(tableHtml);
    let setNames: string[] = [];
    let scores: string[] = [];
    let statusList: JudgeStatus[][] = [];
    for (const row of rows) {
        const cells = splitOuterRowCells(row);
        const label = cleanText(cells[0] ?? "").toLowerCase();
        if (label === "set name") {
            setNames = cells.slice(1).map((c) => cleanText(c));
        } else if (label.includes("score")) {
            scores = cells.slice(1).map((c) => cleanText(c));
        } else if (label === "status") {
            statusList = cells.slice(1).map((c) => parseStatuses(c));
        }
    }
    return setNames.map((name, i) => {
        const scoreParts = (scores[i] ?? "").split("/");
        return {
            name,
            score: (scoreParts[0] ?? "").trim(),
            maxScore: scoreParts.length > 1 ? (scoreParts[1] ?? "").trim() : "",
            statuses: statusList[i] ?? [],
        };
    });
}

function parseCaseNameTable(tableHtml: string): Map<string, string[]> {
    const result = new Map<string, string[]>();
    const rows = splitOuterRows(tableHtml);
    for (const row of rows) {
        const cells = splitOuterRowCells(row);
        if (cells.length < 2) continue;
        const setName = cleanText(cells[0]);
        if (!setName || setName.toLowerCase() === "set name") continue;
        const caseNames = cells[1].split(",").map((s) => cleanText(s)).filter(Boolean);
        if (caseNames.length === 0) continue;
        const list = result.get(setName) ?? [];
        for (const name of caseNames) {
            if (!list.includes(name)) list.push(name);
        }
        result.set(setName, list);
    }
    return result;
}

function parsePerCaseTable(tableHtml: string): Map<string, string> {
    const result = new Map<string, string>();
    const rows = splitOuterRows(tableHtml);
    for (const row of rows) {
        const cells = splitOuterRowCells(row);
        if (cells.length < 2) continue;
        const name = cleanText(cells[0]);
        if (!name || name.toLowerCase() === "case name") continue;
        const status = parseStatusCell(cells[1]);
        if (status) result.set(name, status);
    }
    return result;
}

function parseJudgeResult(html: string): JudgeSet[] {
    const section = extractJudgeResultSection(html);
    if (!section) return [];
    let aggTable = "";
    let testCaseTable = "";
    let perCaseTable = "";
    for (const table of splitOuterTables(section)) {
        const text = cleanText(table).toLowerCase();
        if (text.includes("score / max score")) {
            aggTable = table;
        } else if (text.includes("test cases")) {
            testCaseTable = table;
        } else if (text.includes("case name")) {
            perCaseTable = table;
        }
    }
    if (!aggTable) return [];
    const aggregates = parseAggregateTable(aggTable);
    const caseNameMap = testCaseTable ? parseCaseNameTable(testCaseTable) : new Map<string, string[]>();
    const perCaseMap = perCaseTable ? parsePerCaseTable(perCaseTable) : new Map<string, string>();
    return aggregates.map((agg) => {
        const caseNames = caseNameMap.get(agg.name) ?? [];
        const cases = caseNames
            .map((name) => ({ name, status: perCaseMap.get(name) ?? "" }))
            .filter((c) => c.status !== "");
        return {
            ...agg,
            caseName: cases.length > 0 ? cases.map((c) => c.name) : caseNames,
            cases,
        };
    });
}
