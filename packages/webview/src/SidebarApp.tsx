import React from "react";
import { Button, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import { SubmissionList } from "./components/SubmissionHistory";
import { AiSettingsPanel } from "./components/AiSettingsPanel";
import { useWebviewMessage } from "./hooks/useWebviewMessage";
import { formatStart } from "./utils/format";
import type { HomepageContest, SubmissionRecord } from "./types";

const CATEGORY_GROUPS: Array<{ key: HomepageContest["category"] }> = [
    { key: "active" },
    { key: "upcoming" },
    { key: "recent" },
    { key: "daily" },
];

const SidebarApp: React.FC = () => {
    const vscode = useVSCode();
    const { t, nodes } = useI18n();
    const [contests, setContests] = React.useState<HomepageContest[]>([]);
    const [currentContest, setCurrentContest] = React.useState<string | null>(null);
    const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
    const [loadingList, setLoadingList] = React.useState(false);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const [status, setStatus] = React.useState("");
    const [hasCookie, setHasCookie] = React.useState<boolean | null>(null);
    const [showLogin, setShowLogin] = React.useState(false);
    const [cookieInput, setCookieInput] = React.useState("");
    const [showAiSettings, setShowAiSettings] = React.useState(false);
    const [aiBaseUrl, setAiBaseUrl] = React.useState("");
    const [aiModel, setAiModel] = React.useState("");
    const [aiKeyInput, setAiKeyInput] = React.useState("");
    const [hasAiKey, setHasAiKey] = React.useState(false);
    const currentContestRef = React.useRef<string | null>(null);
    currentContestRef.current = currentContest;

    const fetchContests = () => {
        setLoadingList(true);
        setStatus(t("status.fetchingHomepage"));
        vscode.postMessage({ command: "getContests" });
    };

    const handleCookieSave = () => {
        const val = cookieInput.trim();
        if (!val) {
            setStatus(t("cookie.pasteFirst"));
            return;
        }
        const finalVal = val.startsWith("REVEL_SESSION=") ? val : `REVEL_SESSION=${val}`;
        setCookieInput("");
        setStatus(t("cookie.saved"));
        vscode.postMessage({ command: "setCookie", text: finalVal });
    };

    const handleCookieClear = () => {
        vscode.postMessage({ command: "setCookie", text: "" });
        setStatus(t("cookie.cleared"));
    };

    const handleAiSave = () => {
        setStatus(t("ai.saved"));
        vscode.postMessage({
            command: "setAiConfig",
            aiBaseUrl: aiBaseUrl.trim(),
            aiModel: aiModel.trim(),
            aiApiKey: aiKeyInput.trim(),
        });
        setAiKeyInput("");
    };

    const fetchHistory = (contest: string) => {
        setLoadingHistory(true);
        setStatus(t("status.fetchingHistory", { contest }));
        vscode.postMessage({ command: "fetchSubmissionHistory", contest });
    };

    const handleOpen = (contest: string) => {
        setCurrentContest(contest);
        vscode.postMessage({ command: "openContest", contest });
        fetchHistory(contest);
    };

    React.useEffect(() => {
        fetchContests();
        vscode.postMessage({ command: "getCookie" });
        vscode.postMessage({ command: "getAiConfig" });
    }, []);

    useWebviewMessage({
        contestList: (message) => {
            setContests(message.contests ?? []);
            setLoadingList(false);
            setStatus(t("status.homepageLoaded", { count: (message.contests ?? []).length }));
        },
        submissionHistory: (message) => {
            setSubmissions(message.submissions ?? []);
            setLoadingHistory(false);
            setStatus(t("status.historyLoaded", { count: (message.submissions ?? []).length }));
        },
        loading: (message) => setStatus(message.text ?? ""),
        update: (message) => setStatus(message.text ?? ""),
        cookieChanged: (message) => {
            if (typeof message.hasCookie === "boolean") {
                setHasCookie(message.hasCookie);
                if (message.hasCookie) {
                    setShowLogin(false);
                    setCookieInput("");
                }
            }
            setStatus(t("cookie.updated"));
            fetchContests();
            if (currentContestRef.current) {
                fetchHistory(currentContestRef.current);
            }
        },
        cookieStatus: (message) => {
            const next = message.hasCookie ?? false;
            setHasCookie(next);
            if (next) {
                setShowLogin(false);
                setCookieInput("");
            }
            if (message.statusMessage) setStatus(message.statusMessage);
        },
        loginRequired: () => {
            setShowLogin(true);
            setStatus(t("cookie.loginRequired"));
        },
        aiConfig: (message) => {
            if (typeof message.aiBaseUrl === "string") setAiBaseUrl(message.aiBaseUrl);
            if (typeof message.aiModel === "string") setAiModel(message.aiModel);
            if (typeof message.hasAiKey === "boolean") setHasAiKey(message.hasAiKey);
        },
        error: (message) => {
            setStatus(message.text ?? t("err.operationFailed"));
            setLoadingList(false);
            setLoadingHistory(false);
        },
    });

    const renderContestRow = (contest: HomepageContest) => (
        <div
            key={`${contest.category}-${contest.id}`}
            className={`flex items-center gap-1 px-2 py-1.5 text-[12px] cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] ${currentContest === contest.id ? "bg-[var(--vscode-list-activeSelectionBackground)]" : ""}`}
            onClick={() => handleOpen(contest.id)}
            title={contest.title}
        >
            <span className="flex-1 truncate">{contest.title}</span>
            {contest.start && (
                <span className="text-[10px] opacity-50 flex-shrink-0">{formatStart(contest.start)}</span>
            )}
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)]">
            {(showLogin || hasCookie === false) && (
                <div className="p-2 space-y-2 border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)]">
                    <div className="text-[12px] font-semibold">{t("cookie.loginTitle")}</div>
                    <div className="text-[11px] opacity-70 leading-relaxed">
                        {nodes(t("cookie.loginDesc"), {
                            code: <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>,
                        })}
                    </div>
                    <div className="flex gap-1">
                        <input
                            type="password"
                            value={cookieInput}
                            onChange={(e) => setCookieInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCookieSave()}
                            placeholder={hasCookie ? t("cookie.placeholderHas") : t("cookie.placeholderEmpty")}
                            className="flex-1 h-[26px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                        />
                        <Button onClick={handleCookieSave} size="sm" disabled={!cookieInput.trim()} className="h-[26px] text-[11px] flex-shrink-0">
                            {t("ui.save")}
                        </Button>
                    </div>
                    {hasCookie && (
                        <Button onClick={handleCookieClear} size="sm" variant="secondary" className="h-[24px] text-[11px]">
                            {t("cookie.clearLabel")}
                        </Button>
                    )}
                </div>
            )}
            <div className="p-2 border-b border-[var(--vscode-panel-border)]">
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAiSettings((v) => !v)}
                    className="h-[24px] text-[11px] w-full"
                >
                    {showAiSettings ? t("ui.collapse") : t("ai.title")}
                </Button>
            </div>
            {showAiSettings && (
                <AiSettingsPanel
                    baseUrl={aiBaseUrl}
                    model={aiModel}
                    hasAiKey={hasAiKey}
                    apiKeyInput={aiKeyInput}
                    onBaseUrlChange={setAiBaseUrl}
                    onModelChange={setAiModel}
                    onApiKeyChange={setAiKeyInput}
                    onSave={handleAiSave}
                />
            )}
            <div className="flex-1 flex flex-col min-h-0 border-b border-[var(--vscode-panel-border)]">
                <div className="p-2 flex items-center justify-between border-b border-[var(--vscode-panel-border)]">
                    <div className="text-[12px] font-semibold">{t("ui.contestsTitle")}</div>
                    <Button
                        size="sm"
                        onClick={fetchContests}
                        disabled={loadingList}
                        className="h-[24px] text-[11px] flex-shrink-0"
                    >
                        {loadingList ? t("ui.refreshing") : t("ui.refresh")}
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingList && contests.length === 0 ? (
                        <div className="p-3 flex items-center gap-2 text-[12px] opacity-70">
                            <Spinner size="sm" />
                            <span>{t("ui.fetchingContests")}</span>
                        </div>
                    ) : contests.length === 0 ? (
                        <div className="p-3 text-[12px] opacity-60">{t("ui.noContests")}</div>
                    ) : (
                        CATEGORY_GROUPS.map((group) => {
                            const rows = contests.filter((c) => c.category === group.key);
                            if (rows.length === 0) return null;
                            return (
                                <div key={group.key}>
                                    <div className="px-2 py-1 text-[10px] font-semibold opacity-60 bg-[var(--vscode-sideBarSectionHeader-background)]">
                                        {t(`cat.${group.key}`)}
                                    </div>
                                    {rows.map(renderContestRow)}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="p-2 flex items-center justify-between border-b border-[var(--vscode-panel-border)]">
                    <div className="text-[12px] font-semibold truncate">
                        {t("ui.submitHistoryTitle")}{currentContest ? ` - ${currentContest}` : ""}
                    </div>
                    <Button
                        size="sm"
                        onClick={() => currentContest && fetchHistory(currentContest)}
                        disabled={!currentContest || loadingHistory}
                        className="h-[24px] text-[11px] flex-shrink-0"
                    >
                        {loadingHistory ? t("ui.refreshing") : t("ui.refresh")}
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {!currentContest ? (
                        <div className="p-3 text-[12px] opacity-60">{t("ui.clickContestForHistory")}</div>
                    ) : (
                        <div className="p-1">
                            <SubmissionList contest={currentContest} records={submissions} loading={loadingHistory} />
                        </div>
                    )}
                </div>
            </div>

            {status && (
                <div className="text-[11px] opacity-60 px-2 py-1 border-t border-[var(--vscode-panel-border)]">
                    {status}
                </div>
            )}
        </div>
    );
};

export { SidebarApp };
