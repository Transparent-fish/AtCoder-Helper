import React from "react";
import { Button, Card } from "@template/ui";
import { useI18n } from "../i18n";
import { useVSCode } from "../VSCodeProvider";
import { HtmlContent, TranslatedBlock } from "./HtmlContent";
import { SampleBox } from "./SampleBox";
import type { ContestProblem } from "../types";

interface ProblemViewProps {
    problem: ContestProblem;
    translated: Record<string, string> | null;
    translating: boolean;
    translationMode: "api" | "free";
    onTranslate: () => void;
    onTranslationModeChange: (mode: "api" | "free") => void;
    onCopyMarkdown: () => void;
    onExportCph: () => void;
}

const ProblemView: React.FC<ProblemViewProps> = ({
    problem,
    translated,
    translating,
    translationMode,
    onTranslate,
    onTranslationModeChange,
    onCopyMarkdown,
    onExportCph,
}) => {
    const { t } = useI18n();
    const vscode = useVSCode();

    const renderSection = (labelKey: string, html: string, transKey: string) => (
        <div className="space-y-1">
            <div className="text-[12px] font-semibold">{t(labelKey)}</div>
            <HtmlContent html={html} />
            {translated?.[t(transKey)] && (
                <TranslatedBlock original={html} translation={translated[t(transKey)]} />
            )}
        </div>
    );

    return (
        <Card className="p-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                    <div className="text-[13px] font-semibold">{problem.title}</div>
                    <div className="text-[12px] opacity-60">{problem.url}</div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Button onClick={onTranslate} disabled={translating} size="sm" className="h-[26px] text-[11px]">
                        {translating ? t("ui.translating") : t("ui.translate")}
                    </Button>
                    <select
                        value={translationMode}
                        onChange={(e) => onTranslationModeChange(e.target.value as "api" | "free")}
                        className="h-[26px] text-[11px] px-1 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none"
                        title={t("ui.translationMode")}
                    >
                        <option value="free">{t("ui.free")}</option>
                        <option value="api">{t("ui.api")}</option>
                    </select>
                    <Button onClick={onCopyMarkdown} size="sm" variant="secondary" className="h-[26px] text-[11px]">
                        {t("ui.copyMarkdown")}
                    </Button>
                    <Button
                        onClick={onExportCph}
                        size="sm"
                        variant="secondary"
                        className="h-[26px] text-[11px]"
                        title={t("ui.exportCphTitle")}
                    >
                        {t("ui.exportCph")}
                    </Button>
                </div>
            </div>

            {problem.statement && renderSection("ui.statement", problem.statement, "text.problemStatement")}
            {problem.constraints && renderSection("text.constraints", problem.constraints, "text.constraints")}
            {problem.inputFormat && renderSection("text.inputFormat", problem.inputFormat, "text.inputFormat")}
            {problem.outputFormat && renderSection("text.outputFormat", problem.outputFormat, "text.outputFormat")}

            {problem.samples && problem.samples.length > 0 ? (
                problem.samples.map((sample) => <SampleBox key={sample.index} sample={sample} />)
            ) : problem.sampleUrl ? (
                <div className="flex flex-col items-start gap-2">
                    <div className="text-[12px] opacity-60">{t("ui.sampleExternal")}</div>
                    <Button
                        onClick={() => vscode.postMessage({ command: "openBrowser", url: problem.sampleUrl! })}
                        size="sm"
                        className="h-[26px] text-[11px]"
                    >
                        {t("ui.viewSamples")}
                    </Button>
                </div>
            ) : (
                <div className="text-[12px] opacity-60">{t("ui.noSamples")}</div>
            )}
        </Card>
    );
};

export { ProblemView };
