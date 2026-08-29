import React from "react";
import { Button, Card, Spinner } from "@template/ui";
import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import { ProblemView } from "./components/ProblemView";
import { SubmitPanel } from "./components/SubmitPanel";
import { SubmissionList } from "./components/SubmissionHistory";
import { TaskList } from "./components/TaskList";
import { HtmlContent } from "./components/HtmlContent";
import { useWebviewMessage } from "./hooks/useWebviewMessage";
import { useTranslation } from "./hooks/useTranslation";
import type { ContestProblem, Standing, SubmissionRecord } from "./types";

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

    const [isLoading, setIsLoading] = React.useState(false);
    const [status, setStatus] = React.useState("");
    const [submissions, setSubmissions] = React.useState<SubmissionRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(false);
    const selectedTaskRef = React.useRef(selectedTask);
    selectedTaskRef.current = selectedTask;
    const translation = useTranslation(selectedTaskRef, setStatus);

    const loadProblem = (task: string) => {
        setIsLoading(true);
        setStatus(t("status.fetchingProblem", { contest, task }));
        translation.setTranslatedForTask(task);
        vscode.postMessage({ command: "loadProblem", contest, task });
    };

    const handleRegister = () => {
        setRegistrationMessage(null);
        setStatus(t("status.registration", { contest }));
        vscode.postMessage({ command: "registerContest", contest, rated: isRated });
    };

    const doTranslate = () => {
        translation.translate(problem);
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

    React.useEffect(() => {
        setIsLoading(true);
        setStatus(t("status.loadingContest", { contest }));
        vscode.postMessage({ command: "loadContest", contest });
        vscode.postMessage({ command: "getCookie" });
    }, []);

    useWebviewMessage({
        tasks: (message) => {
            setTasks(message.tasks ?? []);
            setSelectedTask("");
            setProblem(null);
            setStatus(t("status.tasksLoaded", { count: (message.tasks ?? []).length }));
            setIsLoading(false);
        },
        contestInfo: (message) => {
            setRated(message.Rated ?? false);
            setContestTitle(message.title ?? "");
            setAnnouncement(message.announcement ?? "");
        },
        cf_challenge: (message) => {
            setCfUrl(message.url ?? null);
            setIsLoading(false);
            setStatus(t("status.cfChallenge"));
        },
        loginRequired: () => {
            setIsLoading(false);
            setStatus(t("status.loginRequiredSidebar"));
        },
        problem: (message) => {
            setProblem(message.problem ?? null);
            setStatus(t("status.problemLoaded", { title: message.problem?.title ?? "" }));
            setIsLoading(false);
        },
        loading: (message) => setStatus(message.text ?? t("status.loading")),
        update: (message) => setStatus(message.text ?? t("status.loading")),
        error: (message) => {
            setStatus(message.text ?? t("err.operationFailed"));
            setIsLoading(false);
            translation.setTranslating(false);
            setLoadingStandings(false);
            setLoadingHistory(false);
        },
        cookieStatus: (message) => {
            setHasCookie(message.hasCookie ?? false);
            if (message.statusMessage) setStatus(message.statusMessage);
        },
        registrationStatus: (message) => {
            setSigned(message.signed ?? false);
            setRegistrationMessage(message.registrationMessage ?? null);
            setStatus(message.registrationMessage ?? (message.signed ? t("status.registrationSuccess") : t("status.registrationFail")));
            setIsLoading(false);
        },
        translation: (message) => translation.applyTranslation(message),
        submitPage: (message) => {
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
        },
        submitPageError: (message) => {
            setSubmitPageError({ message: message.message ?? t("err.submitPageUnavailable"), url: message.url });
            setStatus(message.message ?? t("err.submitPageUnavailable"));
            setIsLoading(false);
        },
        submitResult: (message) => {
            setSubmitResult(message.submitResult ?? null);
            setIsLoading(false);
            setStatus(message.submitResult?.success ? t("status.submitSuccess") : (message.submitResult?.message ?? t("status.submitFailed")));
        },
        statusUpdate: (message) => {
            const statuses = message.statuses ?? {};
            setTasks((prev) => prev.map((task) => ({ ...task, status: statuses[task.value] })));
        },
        submissionHistory: (message) => {
            setSubmissions(message.submissions ?? []);
            setLoadingHistory(false);
            setStatus(t("status.historyLoaded", { count: (message.submissions ?? []).length }));
        },
        standings: (message) => {
            const list = message.standings ?? [];
            standingsCache.current[contest] = list;
            setStandings(list);
            setLoadingStandings(false);
            setStatus(t("status.standingsLoaded", { count: list.length }));
        },
    });

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
                <TaskList
                    tasks={tasks}
                    selectedTask={selectedTask}
                    onSelect={(value) => {
                        setSelectedTask(value);
                        loadProblem(value);
                    }}
                />
            )}

            {problem && (
                <ProblemView
                    problem={problem}
                    translated={translation.translated}
                    translating={translation.translating}
                    translationMode={translation.translationMode}
                    onTranslate={doTranslate}
                    onTranslationModeChange={translation.setTranslationMode}
                    onCopyMarkdown={doCopyMarkdown}
                    onExportCph={doExportToCph}
                />
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
                    </div>
                </div>

                <SubmitPanel
                    contest={contest}
                    submitTasks={submitTasks}
                    submitLanguages={submitLanguages}
                    selectedTask={selectedSubmitTask}
                    selectedLanguage={selectedSubmitLanguage}
                    sourceCode={sourceCode}
                    isLoading={isLoading}
                    submitResult={submitResult}
                    error={submitPageError}
                    onTaskChange={setSelectedSubmitTask}
                    onLanguageChange={setSelectedSubmitLanguage}
                    onSourceCodeChange={setSourceCode}
                    onSubmit={handleSubmitCode}
                    onFetchPage={handleFetchSubmitPage}
                />
            </Card>

            <Card className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-[12px] font-semibold">{t("ui.submitHistoryTitle")}</div>
                    <Button onClick={handleFetchHistory} disabled={loadingHistory} size="sm" className="h-[24px] text-[11px]">
                        {loadingHistory ? t("ui.refreshing") : t("ui.refresh")}
                    </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                    <SubmissionList contest={contest} records={submissions} loading={loadingHistory} />
                </div>
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
