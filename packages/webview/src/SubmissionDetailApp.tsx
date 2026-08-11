import React from "react";
import { Button, Card, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import { StatusBadge } from "./components/StatusBadge";
import { statusColor } from "./utils/status";
import { useWebviewMessage } from "./hooks/useWebviewMessage";
import type { SubmissionDetail } from "./types";

interface SubmissionDetailAppProps {
    initContest?: string;
    initSubmissionId?: string;
}

const SubmissionDetailApp: React.FC<SubmissionDetailAppProps> = ({ initContest = "", initSubmissionId = "" }) => {
    const vscode = useVSCode();
    const { t } = useI18n();
    const [detail, setDetail] = React.useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const [showJudgeSets, setShowJudgeSets] = React.useState(false);
    const [status, setStatus] = React.useState("");

    const fetchDetail = () => {
        if (!initContest || !initSubmissionId) {
            setStatus(t("ui.missingContestOrId"));
            return;
        }
        setIsLoading(true);
        setStatus(t("ui.fetchingDetail"));
        vscode.postMessage({ command: "fetchSubmissionDetail", contest: initContest, id: initSubmissionId });
    };

    const copyCode = () => {
        if (!detail) return;
        navigator.clipboard.writeText(detail.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    React.useEffect(() => {
        fetchDetail();
    }, []);

    useWebviewMessage({
        submissionDetail: (message) => {
            setDetail(message.submissionDetail ?? null);
            setIsLoading(false);
            setStatus(t("status.detailLoaded", { id: message.submissionDetail?.id ?? "" }));
        },
        loading: (message) => setStatus(message.text ?? ""),
        update: (message) => setStatus(message.text ?? ""),
        error: (message) => {
            setStatus(message.text ?? t("err.detail"));
            setIsLoading(false);
        },
        cf_challenge: () => {
            setStatus(t("status.cfOpenBrowser"));
            setIsLoading(false);
        },
        loginRequired: () => {
            setStatus(t("status.loginRequiredSidebar"));
            setIsLoading(false);
        },
    });

    const renderMeta = (label: string, value: string | undefined): React.ReactNode => (
        <div className="flex items-center gap-2 text-[12px]">
            <span className="opacity-60 w-[70px] flex-shrink-0">{label}</span>
            <span className="truncate">{value || "-"}</span>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
            <div className="h-[35px] flex items-center px-3 bg-[var(--vscode-titleBar-activeBackground)] text-[var(--vscode-titleBar-activeForeground)]">
                <span className="text-[13px] select-none truncate">{t("ui.submissionTitle", { id: initSubmissionId, contest: initContest })}</span>
                <div className="ml-auto flex items-center gap-1">
                    <Button
                        onClick={fetchDetail}
                        disabled={isLoading}
                        size="sm"
                        className="h-[24px] text-[11px]"
                    >
                        {isLoading ? t("ui.refreshing") : t("ui.refresh")}
                    </Button>
                    <Button
                        onClick={() => vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${initContest}/submissions/${initSubmissionId}` })}
                        size="sm"
                        variant="secondary"
                        className="h-[24px] text-[11px]"
                    >
                        {t("ui.browserOpen")}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoading && !detail ? (
                    <div className="flex items-center gap-2 text-[12px] opacity-70">
                        <Spinner size="sm" />
                        <span>{t("ui.fetchingDetail")}</span>
                    </div>
                ) : !detail ? (
                    <div className="text-[12px] opacity-60">{status || t("ui.noDetail")}</div>
                ) : (
                    <>
                        <Card className="p-3 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <div className="text-[13px] font-semibold">{detail.task}</div>
                                <StatusBadge status={detail.status} className="text-[11px] px-2 py-0.5" />
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {renderMeta(t("ui.submitTime"), detail.time)}
                                {renderMeta(t("ui.score"), detail.score)}
                                {renderMeta(t("ui.language"), detail.language)}
                                {renderMeta(t("ui.codeLength"), detail.codeLength)}
                                {renderMeta(t("ui.execTime"), detail.execTime)}
                                {renderMeta(t("ui.memory"), detail.memory)}
                            </div>
                        </Card>

                        {detail.judgeSets && detail.judgeSets.length > 0 && (
                            <Card className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-[12px] font-semibold">{t("ui.testPoints")}</div>
                                    <Button
                                        onClick={() => setShowJudgeSets((v) => !v)}
                                        size="sm"
                                        variant="secondary"
                                        className="h-[24px] text-[11px]"
                                    >
                                        {showJudgeSets ? t("ui.collapse") : t("ui.expand")}
                                    </Button>
                                </div>
                                {showJudgeSets && (
                                    <div className="space-y-3">
                                        {detail.judgeSets.map((set) => (
                                            <div key={set.name} className="space-y-1">
                                                <div className="flex items-center gap-2 text-[12px]">
                                                    <span className="font-semibold">{set.name}</span>
                                                    <span className="opacity-60">
                                                        {set.score}
                                                        {set.maxScore ? ` / ${set.maxScore}` : ""}
                                                    </span>
                                                </div>
                                                {set.statuses.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {set.statuses.map((s, i) => (
                                                            <span
                                                                key={`${s.status}-${i}`}
                                                                className={`text-[10px] px-1 rounded font-bold ${statusColor(s.status)}`}
                                                            >
                                                                {s.status}
                                                                {s.cnt > 1 ? ` ×${s.cnt}` : ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {set.cases && set.cases.length > 0 ? (
                                                    <div className="space-y-0.5">
                                                        {set.cases.map((c, i) => (
                                                            <div key={`${c.name}-${i}`} className="flex items-center gap-2 text-[11px]">
                                                                <span className={`w-[46px] flex-shrink-0 text-center text-[10px] px-1 rounded font-bold ${statusColor(c.status)}`}>
                                                                    {c.status}
                                                                </span>
                                                                <span className="opacity-70 break-all">{c.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : set.caseName.length > 0 ? (
                                                    <div className="text-[10px] opacity-60 break-all leading-relaxed">
                                                        {set.caseName.join(", ")}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        )}

                        <Card className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-[12px] font-semibold">{t("ui.sourceCode")}</div>
                                <Button onClick={copyCode} size="sm" variant="secondary" className="h-[24px] text-[11px]">
                                    {copied ? t("ui.copied") : t("ui.copy")}
                                </Button>
                            </div>
                            <pre className="text-[12px] leading-relaxed whitespace-pre-wrap break-words font-mono bg-[var(--vscode-input-background)] p-2 rounded">
                                {detail.code}
                            </pre>
                        </Card>
                    </>
                )}
            </div>

            {status && (
                <div className="text-[11px] opacity-60 px-2 py-1 border-t border-[var(--vscode-panel-border)]">
                    {status}
                </div>
            )}
        </div>
    );
};

export { SubmissionDetailApp };
