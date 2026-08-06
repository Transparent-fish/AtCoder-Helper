import React from "react";
import { Button, Card, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import type { SubmissionDetail, WebviewMessage } from "./types";

interface SubmissionDetailAppProps {
    initContest?: string;
    initSubmissionId?: string;
}

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

const SubmissionDetailApp: React.FC<SubmissionDetailAppProps> = ({ initContest = "", initSubmissionId = "" }) => {
    const vscode = useVSCode();
    const [detail, setDetail] = React.useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    const [status, setStatus] = React.useState("");

    const fetchDetail = () => {
        if (!initContest || !initSubmissionId) {
            setStatus("缺少比赛代号或提交 ID");
            return;
        }
        setIsLoading(true);
        setStatus(`正在获取提交 ${initSubmissionId} 的详细信息...`);
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

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as WebviewMessage;
            if (message.type === "submissionDetail") {
                setDetail(message.submissionDetail ?? null);
                setIsLoading(false);
                setStatus(`已加载提交 ${message.submissionDetail?.id ?? ""}`);
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? "");
            }
            if (message.type === "error") {
                setStatus(message.text ?? "获取提交详情失败");
                setIsLoading(false);
            }
            if (message.type === "cf_challenge") {
                setStatus("AtCoder 触发 Cloudflare 验证，请在浏览器中打开查看");
                setIsLoading(false);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const renderMeta = (label: string, value: string | undefined): React.ReactNode => (
        <div className="flex items-center gap-2 text-[12px]">
            <span className="opacity-60 w-[70px] flex-shrink-0">{label}</span>
            <span className="truncate">{value || "-"}</span>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
            <div className="h-[35px] flex items-center px-3 bg-[var(--vscode-titleBar-activeBackground)] text-[var(--vscode-titleBar-activeForeground)]">
                <span className="text-[13px] select-none truncate">提交 {initSubmissionId} - {initContest}</span>
                <div className="ml-auto flex items-center gap-1">
                    <Button
                        onClick={fetchDetail}
                        disabled={isLoading}
                        size="sm"
                        className="h-[24px] text-[11px]"
                    >
                        {isLoading ? "刷新中..." : "刷新"}
                    </Button>
                    <Button
                        onClick={() => vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${initContest}/submissions/${initSubmissionId}` })}
                        size="sm"
                        variant="secondary"
                        className="h-[24px] text-[11px]"
                    >
                        浏览器打开
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoading && !detail ? (
                    <div className="flex items-center gap-2 text-[12px] opacity-70">
                        <Spinner size="sm" />
                        <span>正在获取提交详情...</span>
                    </div>
                ) : !detail ? (
                    <div className="text-[12px] opacity-60">{status || "无提交详情"}</div>
                ) : (
                    <>
                        <Card className="p-3 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <div className="text-[13px] font-semibold">{detail.task}</div>
                                <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${statusColor(detail.status)}`}>
                                    {detail.status}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {renderMeta("提交时间", detail.time)}
                                {renderMeta("得分", detail.score)}
                                {renderMeta("语言", detail.language)}
                                {renderMeta("代码长度", detail.codeLength)}
                                {renderMeta("执行时间", detail.execTime)}
                                {renderMeta("内存", detail.memory)}
                            </div>
                        </Card>

                        <Card className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-[12px] font-semibold">源代码</div>
                                <Button onClick={copyCode} size="sm" variant="secondary" className="h-[24px] text-[11px]">
                                    {copied ? "已复制" : "复制"}
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
