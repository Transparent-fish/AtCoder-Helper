import { fetchText } from "./fetch";

export type HomepageContestCategory = "active" | "upcoming" | "recent" | "daily";

export interface HomepageContest {
    id: string;
    title: string;
    start: string;
    category: HomepageContestCategory;
}

const CATEGORY_ORDER: HomepageContestCategory[] = ["active", "upcoming", "recent", "daily"];

export function parseHomepageContests(html: string): HomepageContest[] {
    const contests: HomepageContest[] = [];
    for (const category of CATEGORY_ORDER) {
        const marker = `id="contest-table-${category}"`;
        const sectionStart = html.indexOf(marker);
        if (sectionStart === -1) continue;
        const tableEnd = html.indexOf("</table>", sectionStart);
        const sectionEnd = tableEnd === -1 ? html.length : tableEnd;
        const section = html.slice(sectionStart, sectionEnd);
        for (const row of section.split("<tr>")) {
            const idMatch = row.match(/href="\/contests\/([a-zA-Z0-9_-]+)"/);
            if (!idMatch) continue;
            const titleMatch = row.match(/<a href="\/contests\/[^"]+">([^<]+)<\/a>/);
            const timeMatch = row.match(/<time class='fixtime fixtime-short'>([^<]+)<\/time>/);
            contests.push({
                id: idMatch[1],
                title: titleMatch?.[1]?.trim() || idMatch[1],
                start: timeMatch?.[1] ?? "",
                category,
            });
        }
    }
    return contests;
}

export async function fetchHomepageContests(): Promise<HomepageContest[]> {
    const html = await fetchText("https://atcoder.jp/");
    return parseHomepageContests(html);
}
