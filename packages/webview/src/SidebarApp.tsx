import React from "react";
import { Button, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import type { HomepageContest, SubmissionRecord, WebviewMessage } from "./types";

const CATEGORY_GROUPS: Array<{ key: HomepageContest["category"]; label: string }> = [
    { key: "active", label: "进行中" },
    { key: "upcoming", label: "即将开始" },
    { key: "recent", label: "最近" },
    { key: "daily", label: "每日" },
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

const SidebarApp: React.FC = () => {
    const vscode = useVSCode();
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
    const pendingFirstCookieSet = React.useRef(false);

    const fetchContests = () => {
        setLoadingList(true);
        setStatus("正在抓取 AtCoder 首页比赛列表...");
        vscode.postMessage({ command: "getContests" });
    };

    const handleCookieSave = () => {
        const val = cookieInput.trim();
        if (!val) {
            setStatus("请先复制 REVEL_SESSION 的值再保存");
            return;
        }
        const finalVal = val.startsWith("REVEL_SESSION=") ? val : `REVEL_SESSION=${val}`;
        if (hasCookie !== true) {
            pendingFirstCookieSet.current = true;
        }
        setCookieInput("");
        setStatus("Cookie 已保存");
        vscode.postMessage({ command: "setCookie", text: finalVal });
    };

    const handleCookieClear = () => {
        vscode.postMessage({ command: "setCookie", text: "" });
        setStatus("Cookie 已清除");
    };

    const fetchHistory = (contest: string) => {
        setLoadingHistory(true);
        setStatus(`正在获取 ${contest} 的提交记录...`);
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
                setStatus(`已获取 ${(message.contests ?? []).length} 场比赛`);
            }
            if (message.type === "submissionHistory") {
                setSubmissions(message.submissions ?? []);
                setLoadingHistory(false);
                setStatus(`已获取 ${(message.submissions ?? []).length} 条提交记录`);
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? "");
            }
            if (message.type === "cookieStatus") {
                const next = message.hasCookie ?? false;
                if (pendingFirstCookieSet.current && next) {
                    pendingFirstCookieSet.current = false;
                    setStatus("Cookie 已保存，正在刷新...");
                    fetchContests();
                    if (currentContestRef.current) {
                        fetchHistory(currentContestRef.current);
                    }
                }
                setHasCookie(next);
                if (next) {
                    setShowLogin(false);
                    setCookieInput("");
                }
                if (message.statusMessage) setStatus(message.statusMessage);
            }
            if (message.type === "loginRequired") {
                setShowLogin(true);
                setStatus("需要登录 AtCoder 账号才能使用该功能");
            }
            if (message.type === "error") {
                setStatus(message.text ?? "操作失败");
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
                    <div className="text-[12px] font-semibold">需要登录 AtCoder 账号</div>
                    <div className="text-[11px] opacity-70 leading-relaxed">
                        提交记录、排行榜等需要登录。请在浏览器登录 AtCoder，按 F12 → Application → Cookies 复制{" "}
                        <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>{" "}
                        的 Value 粘贴到下方。
                    </div>
                    <div className="flex gap-1">
                        <input
                            type="password"
                            value={cookieInput}
                            onChange={(e) => setCookieInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCookieSave()}
                            placeholder={hasCookie ? "已保存 Cookie，输入新值可覆盖" : "粘贴 REVEL_SESSION 的 Value"}
                            className="flex-1 h-[26px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                        />
                        <Button onClick={handleCookieSave} size="sm" disabled={!cookieInput.trim()} className="h-[26px] text-[11px] flex-shrink-0">
                            保存
                        </Button>
                    </div>
                    {hasCookie && (
                        <Button onClick={handleCookieClear} size="sm" variant="secondary" className="h-[24px] text-[11px]">
                            清除 Cookie
                        </Button>
                    )}
                </div>
            )}
            <div className="flex-1 flex flex-col min-h-0 border-b border-[var(--vscode-panel-border)]">
                <div className="p-2 flex items-center justify-between border-b border-[var(--vscode-panel-border)]">
                    <div className="text-[12px] font-semibold">比赛列表</div>
                    <Button
                        size="sm"
                        onClick={fetchContests}
                        disabled={loadingList}
                        className="h-[24px] text-[11px] flex-shrink-0"
                    >
                        {loadingList ? "刷新中..." : "刷新"}
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingList && contests.length === 0 ? (
                        <div className="p-3 flex items-center gap-2 text-[12px] opacity-70">
                            <Spinner size="sm" />
                            <span>正在抓取比赛列表...</span>
                        </div>
                    ) : contests.length === 0 ? (
                        <div className="p-3 text-[12px] opacity-60">暂无比赛，点击刷新</div>
                    ) : (
                        CATEGORY_GROUPS.map((group) => {
                            const rows = contests.filter((c) => c.category === group.key);
                            if (rows.length === 0) return null;
                            return (
                                <div key={group.key}>
                                    <div className="px-2 py-1 text-[10px] font-semibold opacity-60 bg-[var(--vscode-sideBarSectionHeader-background)]">
                                        {group.label}
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
                        提交记录{currentContest ? ` - ${currentContest}` : ""}
                    </div>
                    <Button
                        size="sm"
                        onClick={() => currentContest && fetchHistory(currentContest)}
                        disabled={!currentContest || loadingHistory}
                        className="h-[24px] text-[11px] flex-shrink-0"
                    >
                        {loadingHistory ? "刷新中..." : "刷新"}
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {!currentContest ? (
                        <div className="p-3 text-[12px] opacity-60">点击比赛查看提交记录</div>
                    ) : loadingHistory && submissions.length === 0 ? (
                        <div className="p-3 flex items-center gap-2 text-[12px] opacity-70">
                            <Spinner size="sm" />
                            <span>正在获取提交记录...</span>
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="p-3 text-[12px] opacity-60">暂无提交记录</div>
                    ) : (
                        <div className="space-y-1 p-1">
                            {submissions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2 px-2 py-1 text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]"
                                >
                                    <span className="text-[11px] opacity-60 w-[110px] flex-shrink-0">{s.time}</span>
                                    <span className="flex-1 truncate">{s.task}</span>
                                    <span className={`text-[10px] px-1 rounded font-bold ${statusColor(s.status)}`}>
                                        {s.status}
                                    </span>
                                    <span className="text-[11px] opacity-60 w-[40px] text-right">{s.score}</span>
                                    <button
                                        onClick={() => vscode.postMessage({ command: "openSubmission", contest: currentContest, id: s.id })}
                                        className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                    >
                                        详情
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
                                        查看
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
