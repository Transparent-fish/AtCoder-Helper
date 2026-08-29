import React from "react";
import { useVSCode } from "../VSCodeProvider";
import { useI18n } from "../i18n";
import type { ContestProblem, WebviewMessage } from "../types";

interface UseTranslationReturn {
    translatedCache: Record<string, Record<string, string>>;
    translated: Record<string, string> | null;
    translating: boolean;
    translationMode: "api" | "free";
    setTranslationMode: React.Dispatch<React.SetStateAction<"api" | "free">>;
    setTranslating: React.Dispatch<React.SetStateAction<boolean>>;
    translate: (problem: ContestProblem | null) => void;
    applyTranslation: (message: WebviewMessage) => void;
    setTranslatedForTask: (task: string) => void;
}

export function useTranslation(
    taskKeyRef: React.MutableRefObject<string>,
    setStatus: (text: string) => void,
): UseTranslationReturn {
    const vscode = useVSCode();
    const { t } = useI18n();
    const [translatedCache, setTranslatedCache] = React.useState<Record<string, Record<string, string>>>({});
    const [translated, setTranslated] = React.useState<Record<string, string> | null>(null);
    const [translating, setTranslating] = React.useState(false);
    const [translationMode, setTranslationMode] = React.useState<"api" | "free">("free");

    const translate = (problem: ContestProblem | null) => {
        if (!problem) return;
        setTranslating(true);
        setStatus(t("status.translating"));
        const texts: Record<string, string> = {};
        if (problem.statement) texts[t("text.problemStatement")] = problem.statement;
        if (problem.constraints) texts[t("text.constraints")] = problem.constraints;
        if (problem.inputFormat) texts[t("text.inputFormat")] = problem.inputFormat;
        if (problem.outputFormat) texts[t("text.outputFormat")] = problem.outputFormat;
        vscode.postMessage({ command: "translate", payload: texts, targetLang: "ZH", translationMode });
    };

    const applyTranslation = (message: WebviewMessage) => {
        const key = taskKeyRef.current;
        setTranslatedCache((prev) => ({ ...prev, [key]: message.translated ?? {} }));
        setTranslated(message.translated ?? null);
        setTranslating(false);
        setStatus(t("status.translationDone"));
    };

    const setTranslatedForTask = (task: string) => {
        setTranslated(translatedCache[task] ?? null);
    };

    return {
        translatedCache,
        translated,
        translating,
        translationMode,
        setTranslationMode,
        setTranslating,
        translate,
        applyTranslation,
        setTranslatedForTask,
    };
}
