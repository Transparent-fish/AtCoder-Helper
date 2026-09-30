import React from "react";
import { Button } from "@template/ui";
import { useI18n } from "../i18n";

interface AiSettingsPanelProps {
    baseUrl: string;
    model: string;
    hasAiKey: boolean;
    apiKeyInput: string;
    onBaseUrlChange: (value: string) => void;
    onModelChange: (value: string) => void;
    onApiKeyChange: (value: string) => void;
    onSave: () => void;
}

const inputClass =
    "w-full h-[26px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]";

const AiSettingsPanel: React.FC<AiSettingsPanelProps> = ({
    baseUrl,
    model,
    hasAiKey,
    apiKeyInput,
    onBaseUrlChange,
    onModelChange,
    onApiKeyChange,
    onSave,
}) => {
    const { t } = useI18n();

    return (
        <div className="p-2 space-y-2 border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)]">
            <div className="text-[12px] font-semibold">{t("ai.title")}</div>
            <div className="text-[11px] opacity-70 leading-relaxed">{t("ai.description")}</div>
            <label className="block space-y-1">
                <span className="text-[11px] opacity-70">{t("ai.baseUrl")}</span>
                <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => onBaseUrlChange(e.target.value)}
                    placeholder={t("ai.baseUrlPlaceholder")}
                    className={inputClass}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-[11px] opacity-70">{t("ai.model")}</span>
                <input
                    type="text"
                    value={model}
                    onChange={(e) => onModelChange(e.target.value)}
                    placeholder={t("ai.modelPlaceholder")}
                    className={inputClass}
                />
            </label>
            <label className="block space-y-1">
                <span className="text-[11px] opacity-70">{t("ai.apiKey")}</span>
                <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    placeholder={hasAiKey ? t("ai.apiKeyPlaceholderHas") : t("ai.apiKeyPlaceholderEmpty")}
                    className={inputClass}
                />
            </label>
            <div className="flex items-center gap-2">
                <Button onClick={onSave} size="sm" className="h-[26px] text-[11px]">
                    {t("ui.save")}
                </Button>
            </div>
        </div>
    );
};

export { AiSettingsPanel };
