import React from "react";
import { Button } from "@template/ui";
import { useI18n } from "../i18n";
import { useVSCode } from "../VSCodeProvider";
import type { SubmitResult } from "../types";

interface SubmitTaskOption {
    value: string;
    label: string;
}

interface SubmitLanguageOption {
    id: string;
    label: string;
}

interface SubmitPanelProps {
    contest: string;
    submitTasks: SubmitTaskOption[];
    submitLanguages: SubmitLanguageOption[];
    selectedTask: string;
    selectedLanguage: string;
    sourceCode: string;
    isLoading: boolean;
    submitResult: SubmitResult | null;
    error?: { message: string; url?: string } | null;
    onTaskChange: (value: string) => void;
    onLanguageChange: (value: string) => void;
    onSourceCodeChange: (value: string) => void;
    onSubmit: () => void;
    onFetchPage: () => void;
}

const selectClass =
    "w-full h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]";

const SubmitPanel: React.FC<SubmitPanelProps> = ({
    contest,
    submitTasks,
    submitLanguages,
    selectedTask,
    selectedLanguage,
    sourceCode,
    isLoading,
    submitResult,
    error,
    onTaskChange,
    onLanguageChange,
    onSourceCodeChange,
    onSubmit,
    onFetchPage,
}) => {
    const { t } = useI18n();
    const vscode = useVSCode();

    if (error) {
        return (
            <div className="space-y-2">
                <div className="text-[12px] p-2 rounded bg-red-500/10 text-red-500">{error.message}</div>
                <Button
                    onClick={() => vscode.postMessage({ command: "openBrowser", url: error.url ?? `https://atcoder.jp/contests/${contest}/submit` })}
                    size="sm"
                    className="h-[26px] text-[11px]"
                >
                    {t("ui.openSubmitPage")}
                </Button>
            </div>
        );
    }

    if (submitTasks.length === 0 && submitLanguages.length === 0) {
        return (
            <div className="space-y-3">
                <div className="text-[12px] opacity-60">{t("ui.clickToStart")}</div>
                <Button onClick={onFetchPage} disabled={isLoading} size="sm" className="h-[28px] text-[12px]">
                    {isLoading ? t("ui.fetching") : t("ui.fetchSubmitPage")}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1">
                <div className="text-[11px] font-semibold">{t("ui.task")}</div>
                <select value={selectedTask} onChange={(e) => onTaskChange(e.target.value)} className={selectClass}>
                    {submitTasks.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <div className="text-[11px] font-semibold">{t("ui.language")}</div>
                <select value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)} className={selectClass}>
                    {submitLanguages.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-1">
                <div className="text-[11px] font-semibold">{t("ui.sourceCode")}</div>
                <textarea
                    value={sourceCode}
                    onChange={(e) => onSourceCodeChange(e.target.value)}
                    placeholder={t("ui.codePlaceholder")}
                    rows={10}
                    className="w-full text-[12px] p-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] resize-vertical font-mono"
                />
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={onSubmit}
                    disabled={isLoading || !selectedTask || !selectedLanguage || !sourceCode.trim()}
                    size="sm"
                    className="h-[28px] text-[12px]"
                >
                    {isLoading ? t("ui.submitting") : t("ui.submit")}
                </Button>
                <Button onClick={onFetchPage} disabled={isLoading} size="sm" variant="secondary" className="h-[28px] text-[12px]">
                    {t("ui.refresh")}
                </Button>
            </div>

            {submitResult && (
                <div className={`text-[12px] p-2 rounded ${submitResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    <div className="font-semibold mb-1">{submitResult.success ? t("ui.submitSuccessTitle") : t("ui.submitFailedTitle")}</div>
                    <div>{submitResult.message}</div>
                    {submitResult.url && (
                        <div className="mt-1">
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: submitResult.url }); }}
                                className="underline"
                            >
                                {t("ui.viewSubmissionHistory")}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export { SubmitPanel };
