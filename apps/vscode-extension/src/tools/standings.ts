import { fetchText } from "./fetch";

export interface Standing {
    rank: number;
    user: string;
    score: string;
}

interface Standings {
    StandingsData?: Array<{
        Rank?: number;
        UserName?: string;
        TotalResult?: { Score?: number };
    }>;
}

export async function fetchStandings(contest: string, limit = 100): Promise<Standing[]> {
    const url = `https://atcoder.jp/contests/${contest}/standings/json`;
    const text = await fetchText(url);
    let data: Standings;
    try {
        data = JSON.parse(text) as Standings;
    } catch (error) {
        const reason = error instanceof Error ? error.message : "invalid json";
        throw new Error(`排行榜数据解析失败: ${reason}`);
    }
    const rows = data.StandingsData ?? [];
    return rows.slice(0, limit).map((item) => ({
        rank: item.Rank ?? 0,
        user: item.UserName ?? "unknown",
        score: String(item.TotalResult?.Score ?? 0),
    }));
}
