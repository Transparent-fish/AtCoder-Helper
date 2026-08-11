import React from "react";
import { useI18n } from "../i18n";
import type { SampleCase } from "../types";

const CopyIcon: React.FC = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--vscode-editor-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

const CheckIcon: React.FC = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--vscode-editor-foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface SampleBoxProps {
    sample: SampleCase;
}

const SampleBox: React.FC<SampleBoxProps> = ({ sample }) => {
    const { t } = useI18n();
    const [copied, setCopied] = React.useState<"in" | "out" | null>(null);

    const copy = (type: "in" | "out", text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 1500);
    };

    const renderBlock = (type: "in" | "out", label: string, content: string) => (
        <div className="rounded bg-[var(--vscode-input-background)] p-2 relative group">
            <div className="text-[11px] opacity-60 mb-1">{label}</div>
            <pre className="text-[12px] whitespace-pre-wrap break-words">{content}</pre>
            <button
                onClick={() => copy(type, content)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
                title={type === "in" ? t("ui.copyInput") : t("ui.copyOutput")}
            >
                {copied === type ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>
    );

    return (
        <div className="space-y-2">
            <div className="text-[12px] font-semibold">{t("ui.sampleLabel", { index: sample.index })}</div>
            {renderBlock("in", "Input", sample.input)}
            {renderBlock("out", "Output", sample.output)}
        </div>
    );
};

export { SampleBox };
