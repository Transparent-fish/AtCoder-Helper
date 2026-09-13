import React, { createContext, useContext, useMemo, useState } from "react";
import { zh } from "./zh";
import { en } from "./en";
import { ja } from "./ja";

type Dict = Record<string, string>;

const dicts: Record<string, Dict> = { zh, en, ja };
const fallback: Dict = en;

function detectLocale(): string {
    const lang = (window.__ATCODER_LOCALE__ || navigator.language || "en").toLowerCase();
    return lang.startsWith("zh") ? "zh" : lang.startsWith("ja") ? "ja" : "en";
}

export interface I18nValue {
    locale: string;
    t: (key: string, params?: Record<string, string | number>) => string;
    nodes: (template: string, nodeMap: Record<string, React.ReactNode>) => React.ReactNode[];
}

const I18nContext = createContext<I18nValue>({
    locale: "en",
    t: (key: string) => key,
    nodes: (template: string) => [template],
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale] = useState<string>(detectLocale());

    const value = useMemo<I18nValue>(() => {
        const dict = dicts[locale] ?? fallback;
        const t = (key: string, params?: Record<string, string | number>): string => {
            let text = dict[key] ?? fallback[key] ?? key;
            if (params) {
                for (const [k, v] of Object.entries(params)) {
                    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
                }
            }
            return text;
        };
        const nodes = (template: string, nodeMap: Record<string, React.ReactNode>): React.ReactNode[] => {
            const parts: React.ReactNode[] = [];
            const regex = /\{(\w+)\}/g;
            let last = 0;
            let m: RegExpExecArray | null;
            let i = 0;
            while ((m = regex.exec(template)) !== null) {
                if (m.index > last) parts.push(template.slice(last, m.index));
                parts.push(<React.Fragment key={i++}>{nodeMap[m[1]] ?? m[0]}</React.Fragment>);
                last = regex.lastIndex;
            }
            if (last < template.length) parts.push(template.slice(last));
            return parts;
        };
        return { locale, t, nodes };
    }, [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => useContext(I18nContext);
