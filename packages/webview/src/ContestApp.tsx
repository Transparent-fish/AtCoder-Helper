import React from "react";
import { Button, Card, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
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
    { key: "info", label: "ui.tabInfo" },
    { key: "task", label: "ui.task" },
    { key: "submit", label: "ui.submit" },
    { key: "rating", label: "ui.tabRating" },
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

const formatSubmitTime = (time: string): string => {
    const m = time.match(/(\d{2})-(\d{2}) (\d{2}:\d{2})/);
    return m ? `${m[1]}-${m[2]} ${m[3]}` : time;
};

const ContestApp: React.FC<ContestAppProps> = ({ initContest = "" }) => {
    const vscode = useVSCode();
    const { t } = useI18n();
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
        setStatus(t("status.fetchingProblem", { contest, task }));
        setTranslated(translatedCache[task] ?? null);
        vscode.postMessage({ command: "loadProblem", contest, task });
    };

    const handleRegister = () => {
        setRegistrationMessage(null);
        setStatus(t("status.registration", { contest }));
        vscode.postMessage({ command: "registerContest", contest, rated: isRated });
    };

    const doTranslate = () => {
        if (!problem) return;
        setTranslating(true);
        setStatus(t("status.translating"));
        const texts: Record<string, string> = {};
        if (problem.statement) texts[t("text.problemStatement")] = problem.statement;
        if (problem.constraints) texts[t("text.constraints")] = problem.constraints;
        if (problem.inputFormat) texts[t("text.inputFormat")] = problem.inputFormat;
        if (problem.outputFormat) texts[t("text.outputFormat")] = problem.outputFormat;
        vscode.postMessage({ command: "translate", payload: texts, targetLang: "ZH", translationMode });
    };

    const doCopyMarkdown = () => {
        if (!problem) return;
        vscode.postMessage({ command: "copyMarkdown", problem });
        setStatus(t("status.copying"));
    };

    const doExportToCph = () => {
        if (!problem) return;
        setStatus(t("status.exportingCph"));
        vscode.postMessage({ command: "sendCph", problem });
    };

    const handleFetchSubmitPage = () => {
        setSubmitResult(null);
        setSubmitPageError(null);
        setSubmitTasks([]);
        setSubmitLanguages([]);
        setSourceCode("");
        setStatus(t("status.fetchingSubmitPage"));
        vscode.postMessage({ command: "fetchSubmitPage", contest });
    };

    const handleSubmitCode = () => {
        if (!selectedSubmitTask || !selectedSubmitLanguage || !sourceCode.trim()) return;
        setSubmitResult(null);
        setStatus(t("status.submitting"));
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
        setStatus(t("status.fetchingHistory", { contest }));
        vscode.postMessage({ command: "fetchSubmissionHistory", contest });
    };

    const openTab = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "rating" && !standingsCache.current[contest]) {
            setLoadingStandings(true);
            setStatus(t("status.fetchingStandings", { contest }));
            vscode.postMessage({ command: "fetchStandings", contest });
        }
    };

    const copySampleText = (key: string, text: string) => {
        navigator.clipboard.writeText(text);
    };

    React.useEffect(() => {
        setIsLoading(true);
        setStatus(t("status.loadingContest", { contest }));
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
                setStatus(t("status.tasksLoaded", { count: (message.tasks ?? []).length }));
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
                setStatus(t("status.cfChallenge"));
            }
            if (message.type === "loginRequired") {
                setIsLoading(false);
                setStatus(t("status.loginRequiredSidebar"));
            }
            if (message.type === "problem") {
                setProblem(message.problem ?? null);
                setStatus(t("status.problemLoaded", { title: message.problem?.title ?? "" }));
                setIsLoading(false);
            }
            if (message.type === "loading" || message.type === "update") {
                setStatus(message.text ?? t("status.loading"));
            }
            if (message.type === "error") {
                setStatus(message.text ?? t("err.operationFailed"));
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
                setStatus(message.registrationMessage ?? (message.signed ? t("status.registrationSuccess") : t("status.registrationFail")));
                setIsLoading(false);
            }
            if (message.type === "translation") {
                const key = selectedTaskRef.current;
                setTranslatedCache((prev) => ({ ...prev, [key]: message.translated ?? {} }));
                setTranslated(message.translated ?? null);
                setTranslating(false);
                setStatus(t("status.translationDone"));
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
                setStatus(t("status.submitPageReady"));
                setIsLoading(false);
            }
            if (message.type === "submitPageError") {
                setSubmitPageError({ message: message.message ?? t("err.submitPageUnavailable"), url: message.url });
                setStatus(message.message ?? t("err.submitPageUnavailable"));
                setIsLoading(false);
            }
            if (message.type === "submitResult") {
                setSubmitResult(message.submitResult ?? null);
                setIsLoading(false);
                setStatus(message.submitResult?.success ? t("status.submitSuccess") : (message.submitResult?.message ?? t("status.submitFailed")));
            }
            if (message.type === "statusUpdate") {
                const statuses = message.statuses ?? {};
                setTasks((prev) => prev.map((task) => ({ ...task, status: statuses[task.value] })));
            }
            if (message.type === "submissionHistory") {
                setSubmissions(message.submissions ?? []);
                setLoadingHistory(false);
                setStatus(t("status.historyLoaded", { count: (message.submissions ?? []).length }));
            }
            if (message.type === "standings") {
                const list = message.standings ?? [];
                standingsCache.current[contest] = list;
                setStandings(list);
                setLoadingStandings(false);
                setStatus(t("status.standingsLoaded", { count: list.length }));
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const renderInfoTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <Card className="p-3 space-y-2">
                <div className="space-y-1">
                    <div className="text-[13px] font-semibold">{contestTitle || t("ui.contest", { contest })}</div>
                    <div className="text-[12px] opacity-70">{t("ui.contestId", { contest })}</div>
                    <div className="text-[12px] opacity-70">{t("ui.isRated", { rated: rated ? t("ui.yes") : t("ui.no") })}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleRegister}
                        disabled={isLoading || !hasCookie}
                        variant={signed ? "secondary" : "primary"}
                        size="sm"
                        className="h-[28px] text-[12px]"
                        title={!hasCookie ? t("ui.setCookieFirst") : signed ? t("ui.registered") : t("ui.registerButton")}
                    >
                        {signed ? t("ui.registered") : t("ui.registerButton")}
                    </Button>
                    {rated && (
                        <label className="flex items-center gap-1 text-[12px] select-none cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRated}
                                onChange={(e) => setIsRated(e.target.checked)}
                                className="w-3 h-3"
                            />
                            {t("ui.ratedRegistration")}
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
                    <div className="text-[12px] font-semibold">{t("ui.announcement")}</div>
                    <HtmlContent html={announcement} />
                </Card>
            )}
        </div>
    );

    const renderTaskTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {tasks.length > 0 && (
                <Card className="p-3 space-y-2">
                    <div className="text-[13px] font-semibold">{t("ui.taskList")}</div>
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
                                {translating ? t("ui.translating") : t("ui.translate")}
                            </Button>
                            <select
                                value={translationMode}
                                onChange={(e) => setTranslationMode(e.target.value as "api" | "free")}
                                className="h-[26px] text-[11px] px-1 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none"
                                title={t("ui.translationMode")}
                            >
                                <option value="free">{t("ui.free")}</option>
                                <option value="api">{t("ui.api")}</option>
                            </select>
                            <Button onClick={doCopyMarkdown} size="sm" variant="secondary" className="h-[26px] text-[11px]">
                                {t("ui.copyMarkdown")}
                            </Button>
                            <Button
                                onClick={doExportToCph}
                                size="sm"
                                variant="secondary"
                                className="h-[26px] text-[11px]"
                                title={t("ui.exportCphTitle")}
                            >
                                {t("ui.exportCph")}
                            </Button>
                        </div>
                    </div>

                    {problem.statement && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">{t("ui.statement")}</div>
                            <HtmlContent html={problem.statement} />
                            {translated?.[t("text.problemStatement")] && (
                                <TranslatedBlock original={problem.statement} translation={translated[t("text.problemStatement")]} />
                            )}
                        </div>
                    )}

                    {problem.constraints && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">{t("text.constraints")}</div>
                            <HtmlContent html={problem.constraints} />
                            {translated?.[t("text.constraints")] && (
                                <TranslatedBlock original={problem.constraints} translation={translated[t("text.constraints")]} />
                            )}
                        </div>
                    )}

                    {problem.inputFormat && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">{t("text.inputFormat")}</div>
                            <HtmlContent html={problem.inputFormat} />
                            {translated?.[t("text.inputFormat")] && (
                                <TranslatedBlock original={problem.inputFormat} translation={translated[t("text.inputFormat")]} />
                            )}
                        </div>
                    )}

                    {problem.outputFormat && (
                        <div className="space-y-1">
                            <div className="text-[12px] font-semibold">{t("text.outputFormat")}</div>
                            <HtmlContent html={problem.outputFormat} />
                            {translated?.[t("text.outputFormat")] && (
                                <TranslatedBlock original={problem.outputFormat} translation={translated[t("text.outputFormat")]} />
                            )}
                        </div>
                    )}

                    {problem.samples?.length > 0 ? (
                        problem.samples.map((sample: SampleCase) => (
                            <div key={sample.index} className="space-y-2">
                                <div className="text-[12px] font-semibold">{t("ui.sampleLabel", { index: sample.index })}</div>
                                <div className="rounded bg-[var(--vscode-input-background)] p-2 relative group">
                                    <div className="text-[11px] opacity-60 mb-1">Input</div>
                                    <pre className="text-[12px] whitespace-pre-wrap break-words">{sample.input}</pre>
                                    <button
                                        onClick={() => copySampleText(`${sample.index}-in`, sample.input)}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
                                        title={t("ui.copyInput")}
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
                                        title={t("ui.copyOutput")}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : problem.sampleUrl ? (
                        <div className="flex flex-col items-start gap-2">
                            <div className="text-[12px] opacity-60">{t("ui.sampleExternal")}</div>
                            <Button
                                onClick={() => vscode.postMessage({ command: "openBrowser", url: problem.sampleUrl! })}
                                size="sm"
                                className="h-[26px] text-[11px]"
                            >
                                {t("ui.viewSamples")}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-[12px] opacity-60">{t("ui.noSamples")}</div>
                    )}
                </Card>
            )}

            {!isLoading && tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[12px] opacity-60">
                    {status || t("ui.noTasks", { contest })}
                </div>
            )}

            {isLoading && (
                <div className="flex items-center gap-2 text-[12px] opacity-70">
                    <Spinner size="sm" />
                    <span>{t("ui.fetchingData")}</span>
                </div>
            )}
        </div>
    );

    const renderSubmitTab = () => (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <Card className="p-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="text-[13px] font-semibold">{t("ui.submitTo", { contest })}</div>
                    <div className="flex gap-1 items-center">
                        <Button
                            onClick={() => vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${contest}/submit` })}
                            size="sm"
                            variant="secondary"
                            className="h-[26px] text-[11px]"
                            title={t("ui.openInBrowser")}
                        >
                            {t("ui.browserOpen")}
                        </Button>
                        <Button onClick={handleFetchSubmitPage} disabled={isLoading} size="sm" className="h-[26px] text-[11px]">
                            {submitTasks.length === 0 ? (isLoading ? t("ui.fetching") : t("ui.fetchSubmitPage")) : t("ui.refresh")}
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
                            {t("ui.openSubmitPage")}
                        </Button>
                    </div>
                ) : submitTasks.length === 0 && submitLanguages.length === 0 ? (
                    <div className="text-[12px] opacity-60">{t("ui.clickToStart")}</div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="text-[11px] font-semibold">{t("ui.task")}</div>
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
                            <div className="text-[11px] font-semibold">{t("ui.language")}</div>
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
                            <div className="text-[11px] font-semibold">{t("ui.sourceCode")}</div>
                            <textarea
                                value={sourceCode}
                                onChange={(e) => setSourceCode(e.target.value)}
                                placeholder={t("ui.codePlaceholder")}
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
                            {isLoading ? t("ui.submitting") : t("ui.submit")}
                        </Button>

                        {submitResult && (
                            <div className={`text-[12px] p-2 rounded ${submitResult.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                <div className="font-semibold mb-1">{submitResult.success ? t("ui.submitSuccessTitle") : t("ui.submitFailedTitle")}</div>
                                <div>{submitResult.message}</div>
                                {submitResult.url && (
                                    <div className="mt-1">
                                        <a
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: submitResult.url }); }}
                                            className="underline"
                                        >
                                            {t("ui.viewSubmissionHistory")}
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
                    <div className="text-[12px] font-semibold">{t("ui.submitHistoryTitle")}</div>
                    <Button onClick={handleFetchHistory} disabled={loadingHistory} size="sm" className="h-[24px] text-[11px]">
                        {loadingHistory ? t("ui.refreshing") : t("ui.refresh")}
                    </Button>
                </div>
                {submissions.length === 0 ? (
                    <div className="text-[12px] opacity-60">
                        {loadingHistory ? t("ui.loadingHistory") : t("ui.noHistory")}
                    </div>
                ) : (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {submissions.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]">
                                <span className="flex-1 truncate font-medium" title={`${s.task} · ${s.taskScreenName}`}>{s.task}</span>
                                <span className="text-[10px] opacity-50 flex-shrink-0">{formatSubmitTime(s.time)}</span>
                                <span className={`text-[10px] px-1 rounded font-bold ${statusColor(s.status)}`}>{s.status}</span>
                                <span className="text-[11px] opacity-60 w-[50px] text-right">{s.score}</span>
                                <button
                                    onClick={() => vscode.postMessage({ command: "openSubmission", contest, id: s.id })}
                                    className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                >
                                    {t("ui.details")}
                                </button>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); vscode.postMessage({ command: "openBrowser", url: `https://atcoder.jp/contests/${contest}/submissions/${s.id}` }); }}
                                    className="text-[11px] underline opacity-60 hover:opacity-100 flex-shrink-0"
                                >
                                    {t("ui.view")}
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
                <div className="text-[13px] font-semibold">{t("ui.standingsTitle", { contest })}</div>
                <Button
                    onClick={() => {
                        setLoadingStandings(true);
                        setStatus(t("status.fetchingStandings", { contest }));
                        vscode.postMessage({ command: "fetchStandings", contest });
                    }}
                    disabled={loadingStandings}
                    size="sm"
                    className="h-[26px] text-[11px]"
                >
                    {loadingStandings ? t("ui.refreshing") : t("ui.refresh")}
                </Button>
            </div>
            {loadingStandings && standings.length === 0 ? (
                <div className="flex items-center gap-2 text-[12px] opacity-70">
                    <Spinner size="sm" />
                    <span>{t("ui.fetchingStandings")}</span>
                </div>
            ) : standings.length === 0 ? (
                <div className="text-[12px] opacity-60">{t("ui.noStandings")}</div>
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
                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500" title={t("cookie.loggedIn")} />
                )}
            </div>
            <div className="flex border-b border-[var(--vscode-panel-border)]">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => openTab(tab.key)}
                        className={`flex-1 h-[30px] text-[12px] border-b-2 transition-colors ${activeTab === tab.key ? "border-[var(--vscode-focusBorder)] text-[var(--vscode-foreground)]" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                        {t(tab.label)}
                    </button>
                ))}
            </div>
            {renderContent()}
            {cfUrl && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--vscode-editor-background)]/80">
                    <div className="p-6 flex flex-col items-center justify-center gap-4 max-w-md text-center">
                        <div className="text-[14px] font-medium text-yellow-600">{t("ui.cfTitle")}</div>
                        <div className="text-[12px] opacity-70">
                            {t("ui.cfContestBody")}
                        </div>
                        <div className="flex gap-3 mt-2 flex-wrap justify-center">
                            <Button
                                onClick={() => vscode.postMessage({ command: "openBrowser", url: cfUrl })}
                                className="h-[32px] text-[12px]"
                            >
                                {t("ui.openInBrowser")}
                            </Button>
                            <Button onClick={() => setCfUrl(null)} variant="secondary" className="h-[32px] text-[12px]">
                                {t("ui.close")}
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
