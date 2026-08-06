import React from "react";
import { Button, Input, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import type { SubmissionRecord, WebviewMessage } from "./types";

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

const SidebarApp: React.FC = () => {
    const vscode = useVSCode();
    const [contests, setContests] = React.useState<string[]>([]);
    const [currentContest, setCurrentContest] = React.useState<string | null>(null);
    const [input, setInput] = React.useState("");
    const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const [status, setStatus] = React.useState("");
    const currentContestRef = React.useRef<string | null>(null);
    currentContestRef.current = currentContest;

    const fetchHistory = (contest: string) => {
        setLoadingHistory(true);
        setStatus(`正在获取 ${contest} 的提交记录...`);
        vscode.postMessage({ command: "fetchSubmissionHistory", contest });
    };

    const handleAdd = () => {
        const value = input.trim();
        if (!value) return;
        setInput("");
        vscode.postMessage({ command: "addContest", contest: value });
    };

    const handleOpen = (contest: string) => {
        setCurrentContest(contest);
        vscode.postMessage({ command: "openContest", contest });
        fetchHistory(contest);
    };

    const handleRemove = (contest: string) => {
        vscode.postMessage({ command: "removeContest", contest });
        if (currentContestRef.current === contest) {
            setCurrentContest(null);
            setSubmissions([]);
        }
    };

    React.useEffect(() => {
        vscode.postMessage({ command: "getContests" });
    }, []);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as WebviewMessage;
            if (message.type === "contestList") {
                const next = message.contests ?? [];
                setContests(next);
                if (!currentContestRef.current && next.length > 0) {
                    setCurrentContest(next[0]);
                    fetchHistory(next[0]);
                }
            }
            if (message.type === "submissionHistory") {
                setSubmissions(message.submissions ?? []);
                setLoadingHistory(false);
                setStatus(`已获取 ${(message.submissions ?? []).length} 条提交记录`);
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? "");
            }
            if (message.type === "error") {
                setStatus(message.text ?? "操作失败");
                setLoadingHistory(false);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)]">
            <div className="flex-1 flex flex-col min-h-0 border-b border-[var(--vscode-panel-border)]">
                <div className="p-2 space-y-2 border-b border-[var(--vscode-panel-border)]">
                    <div className="text-[12px] font-semibold">比赛列表</div>
                    <div className="flex gap-1">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="添加比赛代号，如 abc345"
                            className="h-[26px] text-[12px]"
                        />
                        <Button
                            onClick={handleAdd}
                            size="sm"
                            disabled={!input.trim()}
                            className="h-[26px] text-[11px] flex-shrink-0"
                        >
                            添加
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contests.length === 0 ? (
                        <div className="p-3 text-[12px] opacity-60">暂无比赛，输入代号添加</div>
                    ) : (
                        contests.map((contest) => (
                            <div
                                key={contest}
                                className={`flex items-center gap-1 px-2 py-1.5 text-[12px] cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] ${currentContest === contest ? "bg-[var(--vscode-list-activeSelectionBackground)]" : ""}`}
                                onClick={() => handleOpen(contest)}
                                title="打开比赛面板"
                            >
                                <span className="flex-1 truncate">{contest}</span>
                                <button
                                    className="text-[11px] opacity-60 hover:opacity-100 hover:text-red-400 px-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(contest);
                                    }}
                                    title="删除"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
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
                        <div className="p-3 text-[12px] opacity-60">点击左侧比赛查看提交记录</div>
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
