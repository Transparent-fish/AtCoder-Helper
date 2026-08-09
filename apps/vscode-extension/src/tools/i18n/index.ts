import { zh } from "./zh";
import { en } from "./en";
import type { ZhDict } from "./zh";

type Dict = Record<string, string>;

const dicts: Record<string, Dict> = { zh, en };
const fallback: Dict = en;

let currentLang = "en";

export function init(language: string): void {
    const lang = (language || "en").toLowerCase();
    currentLang = lang.startsWith("zh") ? "zh" : "en";
}

export type I18nKey = keyof ZhDict;

export function t(key: I18nKey, params?: Record<string, string | number | undefined>): string {
    const dict = dicts[currentLang] ?? fallback;
    let text = dict[key] ?? fallback[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
    }
    return text;
}
