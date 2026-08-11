import React from "react";
import { Button } from "@template/ui";
import { useI18n } from "../i18n";
import { useVSCode } from "../VSCodeProvider";

interface CookieSettingsPanelProps {
    hasCookie: boolean;
    cookieInput: string;
    onCookieInputChange: (value: string) => void;
    onSave: (raw: string) => void;
    onClear: () => void;
}

const CookieSettingsPanel: React.FC<CookieSettingsPanelProps> = ({
    hasCookie,
    cookieInput,
    onCookieInputChange,
    onSave,
    onClear,
}) => {
    const { t, nodes } = useI18n();
    const vscode = useVSCode();

    return (
        <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2 bg-[var(--vscode-textBlockQuote-background)]">
            <div className="text-[12px] font-semibold">{t("cookie.title")}</div>
            <div className="space-y-1 text-[11px] opacity-70 leading-relaxed">
                <div>
                    {nodes(t("cookie.onlyNeedRevel"), {
                        code: <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>,
                    })}
                </div>
                <div className="font-medium mt-1">{t("cookie.steps")}</div>
                <ol className="list-decimal pl-4 space-y-0.5">
                    <li>
                        {nodes(t("cookie.step1"), {
                            link: (
                                <span className="underline cursor-pointer" onClick={() => vscode.postMessage({ command: "openBrowser", url: "https://atcoder.jp/login" })}>
                                    https://atcoder.jp/login
                                </span>
                            ),
                        })}
                    </li>
                    <li>
                        {nodes(t("cookie.step2"), {
                            key: <kbd className="px-1 rounded border border-[var(--vscode-input-border,#6e7681)]">F12</kbd>,
                        })}
                    </li>
                    <li>
                        {nodes(t("cookie.step3"), {
                            application: <b>{t("cookie.chromeApp")}</b>,
                            storage: <b>{t("cookie.edgeStorage")}</b>,
                        })}
                    </li>
                    <li>
                        {nodes(t("cookie.step4"), {
                            cookies: <b>Cookies</b>,
                            site: <b>https://atcoder.jp</b>,
                        })}
                    </li>
                    <li>
                        {nodes(t("cookie.step5"), {
                            code: <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>,
                            value: <b>Value</b>,
                        })}
                    </li>
                    <li>{t("cookie.step6")}</li>
                </ol>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="password"
                    value={cookieInput}
                    onChange={(e) => onCookieInputChange(e.target.value)}
                    placeholder={hasCookie ? t("cookie.placeholderHas") : t("cookie.placeholderEmpty")}
                    className="flex-1 h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                />
                <Button
                    onClick={() => onSave(cookieInput)}
                    size="sm"
                    className="h-[28px] text-[11px]"
                    disabled={!cookieInput.trim()}
                >
                    {t("ui.save")}
                </Button>
                {hasCookie && (
                    <Button onClick={onClear} size="sm" variant="secondary" className="h-[28px] text-[11px]">
                        {t("ui.clear")}
                    </Button>
                )}
            </div>
        </div>
    );
};

export { CookieSettingsPanel };
