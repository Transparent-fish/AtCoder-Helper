import React from "react";
import { Button, Card, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import type { ContestProblem, SampleCase, Standing, SubmissionRecord, WebviewMessage } from "./types";
import { HtmlContent, TranslatedBlock } from "./components/HtmlContent";

type Tab = "info" | "task" | "submit" | "rating";

interface ContestAppProps {
    initContest?: string;
}

interface SubmitTask {
    value: string;
    label: string;
}

interface SubmitLanguage {
    id: string;
    label: string;
}

interface TaskItem {
    label: string;
    value: string;
    url: string;
    status?: string;
}

const TABS: Array<{ key: Tab; label: string }> = [
    { key: "info", label: "信息" },
    { key: "task", label: "题目" },
    { key: "submit", label: "提交" },
    { key: "rating", label: "排行" },
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

const ContestApp: React.FC<ContestAppProps> = ({ initContest = "" }) => {
    const vscode = useVSCode();
    const contest = initContest;
    const [activeTab, setActiveTab] = React.useState<Tab>("task");

    const [tasks, setTasks] = React.useState<TaskItem[]>([]);
    const [selectedTask, setSelectedTask] = React.useState("");
    const [problem, setProblem] = React.useState<ContestProblem | null>(null);

    const [rated, setRated] = React.useState(false);
    const [isRated, setIsRated] = React.useState(true);
    const [signed, setSigned] = React.useState(false);
    const [hasCookie, setHasCookie] = React.useState(false);
    const [registrationMessage, setRegistrationMessage] = React.useState<string | null>(null);
    const [contestTitle, setContestTitle] = React.useState("");
    const [announcement, setAnnouncement] = React.useState("");
    const [cfUrl, setCfUrl] = React.useState<string | null>(null);

    const [submitTasks, setSubmitTasks] = React.useState<SubmitTask[]>([]);
    const [submitLanguages, setSubmitLanguages] = React.useState<SubmitLanguage[]>([]);
    const [selectedSubmitTask, setSelectedSubmitTask] = React.useState("");
    const [selectedSubmitLanguage, setSelectedSubmitLanguage] = React.useState("");
    const [sourceCode, setSourceCode] = React.useState("");
    const [submitResult, setSubmitResult] = React.useState<{ success: boolean; message: string; url?: string } | null>(null);
    const [submitPageError, setSubmitPageError] = React.useState<{ message: string; url?: string } | null>(null);

    const [standings, setStandings] = React.useState<Standing[]>([]);
    const [loadingStandings, setLoadingStandings] = React.useState(false);
    const standingsCache = React.useRef<Record<string, Standing[]>>({});

    const [translatedCache, setTranslatedCache] = React.useState<Record<string, Record<string, string>>>({});
    const [translated, setTranslated] = React.useState<Record<string, string> | null>(null);
    const [translating, setTranslating] = React.useState(false);
    const [translationMode, setTranslationMode] = React.useState<"api" | "free">("free");

    const [isLoading, setIsLoading] = React.useState(false);
    const [status, setStatus] = React.useState("");
    const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const selectedTaskRef = React.useRef(selectedTask);
    selectedTaskRef.current = selectedTask;

    const loadProblem = (task: string) => {
        setIsLoading(true);
        setStatus(`正在抓取 ${contest}/${task} 的题面...`);
        setTranslated(translatedCache[task] ?? null);
        vscode.postMessage({ command: "loadProblem", contest, task });
    };

    const handleRegister = () => {
        setRegistrationMessage(null);
        setStatus(`正在报名 ${contest} ...`);
        vscode.postMessage({ command: "registerContest", contest, rated: isRated });
    };

    const doTranslate = () => {
        if (!problem) return;
        setTranslating(true);
        setStatus("正在翻译...");
        const texts: Record<string, string> = {};
        if (problem.statement) texts["题目描述"] = problem.statement;
        if (problem.constraints) texts["约束"] = problem.constraints;
        if (problem.inputFormat) texts["输入格式"] = problem.inputFormat;
        if (problem.outputFormat) texts["输出格式"] = problem.outputFormat;
        vscode.postMessage({ command: "translate", payload: texts, targetLang: "ZH", translationMode });
    };

    const doCopyMarkdown = () => {
        if (!problem) return;
        vscode.postMessage({ command: "copyMarkdown", problem });
        setStatus("正在复制...");
    };

    const doExportToCph = () => {
        if (!problem) return;
        setStatus("正在导出到 CPH...");
        vscode.postMessage({ command: "sendCph", problem });
    };

    const handleFetchSubmitPage = () => {
        setSubmitResult(null);
        setSubmitPageError(null);
        setSubmitTasks([]);
        setSubmitLanguages([]);
        setSourceCode("");
        setStatus("正在获取提交页面...");
        vscode.postMessage({ command: "fetchSubmitPage", contest });
    };

    const handleSubmitCode = () => {
        if (!selectedSubmitTask || !selectedSubmitLanguage || !sourceCode.trim()) return;
        setSubmitResult(null);
        setStatus("正在提交代码...");
        vscode.postMessage({
            command: "submitCode",
            contest,
            taskScreenName: selectedSubmitTask,
            languageId: selectedSubmitLanguage,
            sourceCode,
        });
    };

    const handleFetchHistory = () => {
        setLoadingHistory(true);
        setStatus(`正在获取 ${contest} 提交记录...`);
        vscode.postMessage({ command: "fetchSubmissionHistory", contest });
    };

    const openTab = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "rating" && !standingsCache.current[contest]) {
            setLoadingStandings(true);
            setStatus(`正在获取 ${contest} 排行榜...`);
            vscode.postMessage({ command: "fetchStandings", contest });
        }
    };

    const copySampleText = (key: string, text: string) => {
        navigator.clipboard.writeText(text);
    };

    React.useEffect(() => {
        setIsLoading(true);
        setStatus(`正在加载 ${contest} 的题目...`);
        vscode.postMessage({ command: "loadContest", contest });
        vscode.postMessage({ command: "getCookie" });
    }, []);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as WebviewMessage;
            if (message.type === "tasks") {
                setTasks(message.tasks ?? []);
                setSelectedTask("");
                setProblem(null);
                setStatus(`已加载 ${(message.tasks ?? []).length} 道题目`);
                setIsLoading(false);
            }
            if (message.type === "contestInfo") {
                setRated(message.Rated ?? false);
                setContestTitle(message.title ?? "");
                setAnnouncement(message.announcement ?? "");
            }
            if (message.type === "cf_challenge") {
                setCfUrl(message.url ?? null);
                setIsLoading(false);
                setStatus("AtCoder 触发 Cloudflare 验证，插件无法直接访问，请在浏览器中完成验证");
            }
            if (message.type === "problem") {
                setProblem(message.problem ?? null);
                setStatus(`已加载题面：${message.problem?.title ?? ""}`);
                setIsLoading(false);
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? "加载中...");
            }
            if (message.type === "error") {
                setStatus(message.text ?? "操作失败");
                setIsLoading(false);
                setTranslating(false);
                setLoadingStandings(false);
                setLoadingHistory(false);
            }
            if (message.type === "cookieStatus") {
                setHasCookie(message.hasCookie ?? false);
                if (message.statusMessage) setStatus(message.statusMessage);
            }
            if (message.type === "registrationStatus") {
                setSigned(message.signed ?? false);
                setRegistrationMessage(message.registrationMessage ?? null);
                setStatus(message.registrationMessage ?? (message.signed ? "报名成功" : "报名失败"));
                setIsLoading(false);
            }
            if (message.type === "translation") {
                const key = selectedTaskRef.current;
                setTranslatedCache((prev) => ({ ...prev, [key]: message.translated ?? {} }));
                setTranslated(message.translated ?? null);
                setTranslating(false);
                setStatus("翻译完成");
            }
            if (message.type === "submitPage") {
                setSubmitPageError(null);
                setSubmitTasks(message.submitTasks ?? []);
                setSubmitLanguages(message.languages ?? []);
                if (message.submitTasks && message.submitTasks.length > 0) {
                    setSelectedSubmitTask(message.submitTasks[0].value);
                }
                if (message.languages && message.languages.length > 0) {
                    setSelectedSubmitLanguage(message.languages[0].id);
                }
                setStatus("已获取提交页面信息");
                setIsLoading(false);
            }
            if (message.type === "submitPageError") {
                setSubmitPageError({ message: message.message ?? "提交页面无法访问", url: message.url });
                setStatus(message.message ?? "提交页面无法访问");
                setIsLoading(false);
            }
            if (message.type === "submitResult") {
                setSubmitResult(message.submitResult ?? null);
                setIsLoading(false);
                setStatus(message.submitResult?.success ? "代码提交成功" : (message.submitResult?.message ?? "提交失败"));
            }
            if (message.type === "statusUpdate") {
                const statuses = message.statuses ?? {};
                setTasks((prev) => prev.map((t) => ({ ...t, status: statuses[t.value] })));
            }
            if (message.type === "submissionHistory") {
                setSubmissions(message.submissions ?? []);
                setLoadingHistory(false);
                setStatus(`已获取 ${(message.submissions ?? []).length} 条提交记录`);
            }
            if (message.type === "standings") {
                const list = message.standings ?? [];
                standingsCache.current[contest] = list;
                setStandings(list);
                setLoadingStandings(false);
                setStatus(`已获取 ${list.length} 条排行`);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const renderInfoTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <Card className="p-3 space-y-2">
                <div className="space-y-1">
                    <div className="text-[13px] font-semibold">{contestTitle || `比赛 ${contest}`}</div>
                    <div className="text-[12px] opacity-70">比赛代号：{contest}</div>
                    <div className="text-[12px] opacity-70">评级比赛：{rated ? "是" : "否"}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleRegister}
                        disabled={isLoading || !hasCookie}
                        variant={signed ? "secondary" : "primary"}
                        size="sm"
                        className="h-[28px] text-[12px]"
                        title={!hasCookie ? "请先设置 AtCoder Cookie" : signed ? "已报名" : "报名比赛"}
                    >
                        {signed ? "已报名" : "报名比赛"}
                    </Button>
                    {rated && (
                        <label className="flex items-center gap-1 text-[12px] select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRated}
                                onChange={(e) => setIsRated(e.target.checked)}
                                className="w-3 h-3"
                            />
                            评级报名
                        </label>
                    )}
                </div>
                {registrationMessage && (
                    <div className={`text-[12px] ${signed ? "text-green-500" : "text-red-500"}`}>
                        {registrationMessage}
                    </div>
                )}
            </Card>

            {announcement && (
                <Card className="p-3 space-y-2">
                    <div className="text-[12px] font-semibold">公告</div>
                    <HtmlContent html={announcement} />
                </Card>
            )}
        </div>
    );

    const renderTaskTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {tasks.length > 0 && (
                <Card className="p-3 space-y-2">
                    <div className="text-[13px] font-semibold">题目列表</div>
                    <div className="flex flex-wrap gap-2">
                        {tasks.map((task) => (
                            <Button
                                key={task.value}
                                variant={selectedTask === task.value ? "primary" : "secondary"}
                                size="sm"
                                onClick={() => {
                                    setSelectedTask(task.value);
                                    loadProblem(task.value);
                                }}
                                className="flex items-center gap-1"
                            >
                                {task.status && (
                                    <span className={`text-[10px] px-1 rounded font-bold ${statusColor(task.status)}`}>
                                        {task.status}
                                    </span>
                                )}
                                {task.label}
                            </Button>
                        ))}
                    </div>
                </Card>
            )}

            {problem && (
                <Card className="p-3 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="space-y-1">
                            <div className="text-[13px] font-semibold">{problem.title}</div>
                            <div className="text-[12px] opacity-60">{problem.url}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <Button onClick={doTranslate} disabled={translating} size="sm" className="h-[26px] text-[11px]">
                                {translating ? "翻译中..." : "翻译"}
                            </Button>
                            <select
                                value={translationMode}
                                onChange={(e) => setTranslationMode(e.target.value as "api" | "free")}
                                className="h-[26px] text-[11px] px-1 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none"
                                title="翻译模式"
                            >
                                <option value="free">免费</option>
                                <option value="api">API</option>
                            </select>
                            <Button onClick={doCopyMarkdown} size="sm" variant="secondary" className="h-[26px] text-[11px]">
                                复制 Markdown
                            </Button>
                            <Button
                                onClick={doExportToCph}
                                size="sm"
                                variant="secondary"
                                className="h-[26px] text-[11px]"
                                title="导出到 CPH（需已安装 Competitive Programming Helper）"
                            >
                                导出 CPH
                            </Button>
                        </div>
                    </div>

                    {problem.statement && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">题面</div>
                            <HtmlContent html={problem.statement} />
                            {translated?.["题目描述"] && (
                                <TranslatedBlock original={problem.statement} translation={translated["题目描述"]} />
                            )}
                        </div>
                    )}

                    {problem.constraints && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">约束</div>
                            <HtmlContent html={problem.constraints} />
                            {translated?.["约束"] && (
                                <TranslatedBlock original={problem.constraints} translation={translated["约束"]} />
                            )}
                        </div>
                    )}

                    {problem.inputFormat && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">输入格式</div>
                            <HtmlContent html={problem.inputFormat} />
                            {translated?.["输入格式"] && (
                                <TranslatedBlock original={problem.inputFormat} translation={translated["输入格式"]} />
                            )}
                        </div>
                    )}

                    {problem.outputFormat && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">输出格式</div>
                            <HtmlContent html={problem.outputFormat} />
                            {translated?.["输出格式"] && (
                                <TranslatedBlock original={problem.outputFormat} translation={translated["输出格式"]} />
                            )}
                        </div>
                    )}

                    {problem.samples?.length > 0 ? (
                        problem.samples.map((sample: SampleCase) => (
                            <div key={sample.index} className="space-y-2">
                                <div className="text-[12px] font-semibold">Sample {sample.index}</div>
                                <div className="rounded bg-[var(--vscode-input-background)] p-2 relative group">
                                    <div className="text-[11px] opacity-60 mb-1">Input</div>
                                    <pre className="text-[12px] whitespace-pre-wrap break-words">{sample.input}</pre>
                                    <button
                                        onClick={() => copySampleText(`${sample.index}-in`, sample.input)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
                                        title="复制 Input"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                                <div className="rounded bg-[var(--vscode-input-background)] p-2 relative group">
                                    <div className="text-[11px] opacity-60 mb-1">Output</div>
                                    <pre className="text-[12px] whitespace-pre-wrap break-words">{sample.output}</pre>
                                    <button
                                        onClick={() => copySampleText(`${sample.index}-out`, sample.output)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
                                        title="复制 Output"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : problem.sampleUrl ? (
                        <div className="flex flex-col items-start gap-2">
                            <div className="text-[12px] opacity-60">该题目没有内嵌样例，样例在外部链接中。</div>
                            <Button
                                onClick={() => vscode.postMessage({ command: "openBrowser", url: problem.sampleUrl! })}
                                size="sm"
                                className="h-[26px] text-[11px]"
                            >
                                查看样例
                            </Button>
                        </div>
                    ) : (
                        <div className="text-[12px] opacity-60">当前题目没有找到样例。</div>
                    )}
                </Card>
            )}

            {!isLoading && tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[12px] opacity-60">
                    正在加载 {contest} 的题目...
                </div>
            )}

            {isLoading && (
                <div className="flex items-center gap-2 text-[12px] opacity-70">
                    <Spinner size="sm" />
                    <span>正在抓取数据...</span>
                </div>
            )}
        </div>
    );

    const renderSubmitTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <Card className="p-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="text-[13px] font-semibold">提交代码到 {contest}</div>
                    <div className="flex gap-1 items-center">
                        <Button
                            onClick={() => vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${contest}/submit` })}
                            size="sm"
                            variant="secondary"
                            className="h-[26px] text-[11px]"
                            title="在浏览器中打开提交页（如遇 Cloudflare 验证可在浏览器中完成）"
                        >
                            浏览器打开
                        </Button>
                        <Button onClick={handleFetchSubmitPage} disabled={isLoading} size="sm" className="h-[26px] text-[11px]">
                            {submitTasks.length === 0 ? (isLoading ? "获取中..." : "获取提交页面") : "刷新"}
                        </Button>
                    </div>
                </div>

                {submitPageError ? (
                    <div className="space-y-2">
                        <div className="text-[12px] p-2 rounded bg-red-500/10 text-red-500">{submitPageError.message}</div>
                        <Button
                            onClick={() => vscode.postMessage({ command: "openBrowser", url: submitPageError.url ?? `https://atcoder.jp/contests/${contest}/submit` })}
                            size="sm"
                            className="h-[26px] text-[11px]"
                        >
                            在浏览器中打开提交页
                        </Button>
                    </div>
                ) : submitTasks.length === 0 && submitLanguages.length === 0 ? (
                    <div className="text-[12px] opacity-60">点击「获取提交页面」开始提交。</div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold">题目</div>
                            <select
                                value={selectedSubmitTask}
                                onChange={(e) => setSelectedSubmitTask(e.target.value)}
                                className="w-full h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                            >
                                {submitTasks.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold">语言</div>
                            <select
                                value={selectedSubmitLanguage}
                                onChange={(e) => setSelectedSubmitLanguage(e.target.value)}
                                className="w-full h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
                            >
                                {submitLanguages.map((l) => (
                                    <option key={l.id} value={l.id}>{l.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold">源代码</div>
                            <textarea
                                value={sourceCode}
                                onChange={(e) => setSourceCode(e.target.value)}
                                placeholder="在此粘贴或输入代码..."
                                rows={10}
                                className="w-full text-[12px] p-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] resize-vertical font-mono"
                            />
                        </div>

                        <Button
                            onClick={handleSubmitCode}
                            disabled={isLoading || !selectedSubmitTask || !selectedSubmitLanguage || !sourceCode.trim()}
                            size="sm"
                            className="h-[28px] text-[12px]"
                        >
                            {isLoading ? "提交中..." : "提交"}
                        </Button>

                        {submitResult && (
                            <div className={`text-[12px] p-2 rounded ${submitResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                <div className="font-semibold mb-1">{submitResult.success ? "提交成功" : "提交失败"}</div>
                                <div>{submitResult.message}</div>
                                {submitResult.url && (
                                    <div className="mt-1">
                                        <a
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: submitResult.url }); }}
                                            className="underline"
                                        >
                                            查看提交记录
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold">提交记录</div>
                    <Button onClick={handleFetchHistory} disabled={loadingHistory} size="sm" className="h-[24px] text-[11px]">
                        {loadingHistory ? "刷新中..." : "刷新"}
                    </Button>
                </div>
                {submissions.length === 0 ? (
                    <div className="text-[12px] opacity-60">
                        {loadingHistory ? "正在获取提交记录..." : "暂无提交记录"}
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {submissions.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]">
                                <span className="text-[11px] opacity-60 w-[120px] flex-shrink-0">{s.time}</span>
                                <span className="flex-1 truncate">{s.task}</span>
                                <span className={`text-[10px] px-1 rounded font-bold ${statusColor(s.status)}`}>{s.status}</span>
                                <span className="text-[11px] opacity-60 w-[50px] text-right">{s.score}</span>
                                <button
                                    onClick={() => vscode.postMessage({ command: "openSubmission", contest, id: s.id })}
                                    className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                >
                                    详情
                                </button>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${contest}/submissions/${s.id}` }); }}
                                    className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                >
                                    查看
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );

    const renderRatingTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold">排行榜 - {contest}</div>
                <Button
                    onClick={() => {
                        setLoadingStandings(true);
                        setStatus(`正在获取 ${contest} 排行榜...`);
                        vscode.postMessage({ command: "fetchStandings", contest });
                    }}
                    disabled={loadingStandings}
                    size="sm"
                    className="h-[26px] text-[11px]"
                >
                    {loadingStandings ? "刷新中..." : "刷新"}
                </Button>
            </div>
            {loadingStandings && standings.length === 0 ? (
                <div className="flex items-center gap-2 text-[12px] opacity-70">
                    <Spinner size="sm" />
                    <span>正在获取排行榜...</span>
                </div>
            ) : standings.length === 0 ? (
                <div className="text-[12px] opacity-60">暂无排行数据</div>
            ) : (
                <div className="space-y-1">
                    {standings.map((row) => (
                        <div key={row.rank} className="flex items-center gap-2 px-2 py-1 text-[12px] border border-[var(--vscode-panel-border)] rounded">
                            <span className="w-[40px] text-[11px] opacity-60 flex-shrink-0 text-right">{row.rank}</span>
                            <span className="flex-1 truncate">{row.user}</span>
                            <span className="text-[11px] font-semibold w-[50px] text-right">{row.score}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderContent = (): React.ReactNode => {
        if (activeTab === "info") return renderInfoTab();
        if (activeTab === "task") return renderTaskTab();
        if (activeTab === "submit") return renderSubmitTab();
        return renderRatingTab();
    };

    return (
        <div className="h-screen flex flex-col relative bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
            <div className="h-[35px] flex items-center px-3 bg-[var(--vscode-titleBar-activeBackground)] text-[var(--vscode-titleBar-activeForeground)]">
                <span className="text-[13px] select-none truncate">AtCoder - {contest}</span>
                {hasCookie && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500" title="已登录 AtCoder" />
                )}
            </div>
            <div className="flex border-b border-[var(--vscode-panel-border)]">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => openTab(tab.key)}
                        className={`flex-1 h-[30px] text-[12px] border-b-2 transition-colors ${activeTab === tab.key ? "border-[var(--vscode-focusBorder)] text-[var(--vscode-foreground)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {renderContent()}
            {cfUrl && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--vscode-editor-background)]/80">
                    <div className="p-6 flex flex-col items-center justify-center gap-4 max-w-md text-center">
                        <div className="text-[14px] font-medium text-yellow-600">Cloudflare 验证</div>
                        <div className="text-[12px] opacity-70">
                            AtCoder 触发了 Cloudflare 验证，插件无法直接访问。请点击下方按钮在浏览器中打开，完成验证后重新设置 Cookie 再试。
                        </div>
                        <div className="flex gap-3 mt-2 flex-wrap justify-center">
                            <Button
                                onClick={() => vscode.postMessage({ command: "openBrowser", url: cfUrl })}
                                className="h-[32px] text-[12px]"
                            >
                                在浏览器中打开
                            </Button>
                            <Button onClick={() => setCfUrl(null)} variant="secondary" className="h-[32px] text-[12px]">
                                关闭
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {status && (
                <div className="text-[11px] opacity-60 px-2 py-1 border-t border-[var(--vscode-panel-border)]">
                    {status}
                </div>
            )}
        </div>
    );
};

export { ContestApp };
