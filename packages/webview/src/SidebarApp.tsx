import React from "react";
import { Button, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import type { HomepageContest, SubmissionRecord, WebviewMessage } from "./types";

const CATEGORY_GROUPS: Array<{ key: HomepageContest["category"] }> = [
    { key: "active" },
    { key: "upcoming" },
    { key: "recent" },
    { key: "daily" },
];

const statusColor = (status: string): string => {
    switch (status) {
        case "AC":
            return "text-green-500 bg-green-500/10";
        case "WA":
            return "text-red-500 bg-red-500/10";
        case "TLE":
            return "text-cyan-500 bg-cyan-500/10";
        case "MLE":
            return "text-yellow-500 bg-yellow-500/10";
        case "RE":
            return "text-purple-500 bg-purple-500/10";
        case "CE":
            return "text-gray-400 bg-gray-400/10";
        default:
            return "text-gray-400 bg-gray-400/10";
    }
};

const formatStart = (start: string): string => (start.length >= 16 ? start.slice(5, 16) : start);

const formatSubmitTime = (time: string): string => {
    const m = time.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/);
    return m ? `${m[1]}-${m[2]} ${m[3]}` : time;
};

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
    }, []);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as WebviewMessage;
            if (message.type === "contestList") {
                setContests(message.contests ?? []);
                setLoadingList(false);
                setStatus(t("status.homepageLoaded", { count: (message.contests ?? []).length }));
            }
            if (message.type === "submissionHistory") {
                setSubmissions(message.submissions ?? []);
                setLoadingHistory(false);
                setStatus(t("status.historyLoaded", { count: (message.submissions ?? []).length }));
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? "");
            }
            if (message.type === "cookieChanged") {
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
            }
            if (message.type === "cookieStatus") {
                const next = message.hasCookie ?? false;
                setHasCookie(next);
                if (next) {
                    setShowLogin(false);
                    setCookieInput("");
                }
                if (message.statusMessage) setStatus(message.statusMessage);
            }
            if (message.type === "loginRequired") {
                setShowLogin(true);
                setStatus(t("cookie.loginRequired"));
            }
            if (message.type === "error") {
                setStatus(message.text ?? t("err.operationFailed"));
                setLoadingList(false);
                setLoadingHistory(false);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

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
                    ) : loadingHistory && submissions.length === 0 ? (
                        <div className="p-3 flex items-center gap-2 text-[12px] opacity-70">
                            <Spinner size="sm" />
                            <span>{t("ui.loadingHistory")}</span>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="p-3 text-[12px] opacity-60">{t("ui.noHistory")}</div>
                    ) : (
                        <div className="space-y-1 p-1">
                            {submissions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2 px-2 py-1 text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]"
                                >
                                    <span className="flex-1 truncate font-medium" title={`${s.task} · ${s.taskScreenName}`}>{s.task}</span>
                                    <span className="text-[10px] opacity-50 flex-shrink-0">{formatSubmitTime(s.time)}</span>
                                    <span className={`text-[10px] px-1 rounded font-bold ${statusColor(s.status)}`}>
                                        {s.status}
                                    </span>
                                    <span className="text-[11px] opacity-60 w-[40px] text-right">{s.score}</span>
                                    <button
                                        onClick={() => vscode.postMessage({ command: "openSubmission", contest: currentContest, id: s.id })}
                                        className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                    >
                                        {t("ui.details")}
                                    </button>
                                    <a
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            vscode.postMessage({
                                                command: "openBrowser",
                                                url: `https://atcoder.jp/contests/${currentContest}/submissions/${s.id}`,
                                            });
                                        }}
                                        className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                    >
                                        {t("ui.view")}
                                    </a>
                                </div>
                            ))}
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
