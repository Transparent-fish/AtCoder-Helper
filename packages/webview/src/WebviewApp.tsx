import React from "react";
import { Button, Input, Spinner } from "@template/ui";
import "./styles.css";

import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import { useWebviewMessage } from "./hooks/useWebviewMessage";
import { useTranslation } from "./hooks/useTranslation";
import type { WebviewMessage, ContestProblem, SubmitResult } from "./types";
import { ProblemView } from "./components/ProblemView";
import { SubmitPanel } from "./components/SubmitPanel";
import { SubmissionList } from "./components/SubmissionHistory";
import { TaskList } from "./components/TaskList";
import { CookieSettingsPanel } from "./components/CookieSettingsPanel";

export interface WebviewAppProps {
  title?: string;
}

const WebviewApp: React.FC<WebviewAppProps> = ({
  title = "VSCode Extension",
}) => {
  const vscode = useVSCode();
  const { t } = useI18n();
  const [contest, setContest] = React.useState("");
  const [tasks, setTasks] = React.useState<Array<{ label: string; value: string; url: string; status?: string }>>([]);
  const [selectedTask, setSelectedTask] = React.useState<string>("");
  const [problem, setProblem] = React.useState<ContestProblem | null>(null);
  const [status, setStatus] = React.useState(t("ui.enterContestHint"));
  const [isLoading, setIsLoading] = React.useState(false);
  const [cfUrl, setCfUrl] = React.useState<string | null>(null);
  const selectedTaskRef = React.useRef(selectedTask);
  const translation = useTranslation(selectedTaskRef, setStatus);
  const [cookieInput, setCookieInput] = React.useState("");
  const [hasCookie, setHasCookie] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const [registrationMessage, setRegistrationMessage] = React.useState<string | null>(null);
  const [Rated, setRated] = React.useState(false);
  const [isRated, setIsRated] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [showSubmitPanel, setShowSubmitPanel] = React.useState(false);
  const [submitTasks, setSubmitTasks] = React.useState<Array<{ value: string; label: string }>>([]);
  const [submitLanguages, setSubmitLanguages] = React.useState<Array<{ id: string; label: string }>>([]);
  const [selectedSubmitTask, setSelectedSubmitTask] = React.useState("");
  const [selectedSubmitLanguage, setSelectedSubmitLanguage] = React.useState("");
  const [sourceCode, setSourceCode] = React.useState("");
  const [submitResult, setSubmitResult] = React.useState<SubmitResult | null>(null);
  const [showSubmissionHistory, setShowSubmissionHistory] = React.useState(false);
  const [submissionHistory, setSubmissionHistory] = React.useState<Array<{ id: string; time: string; task: string; taskScreenName: string; language: string; score: string; status: string }>>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  const loadContest = async (nextContest: string) => {
    setIsLoading(true);
    setStatus(t("status.loadingContest", { contest: nextContest }));
    vscode.postMessage({ command: "loadContest", contest: nextContest });
  };

  const loadProblem = async (nextContest: string, task: string) => {
    setIsLoading(true);
    setStatus(t("status.fetchingProblem", { contest: nextContest, task }));
    translation.setTranslatedForTask(task);
    vscode.postMessage({ command: "loadProblem", contest: nextContest, task });
  };

  const handleRegister = () => {
    setRegistrationMessage(null);
    setStatus(t("status.registration", { contest }));
    vscode.postMessage({ command: "registerContest", contest, rated: isRated });
  };

  const handleSaveCookie = (raw: string) => {
    const val = raw.trim();
    if (!val) {
      setStatus(t("cookie.pasteFirst"));
      return;
    }
    const finalVal = val.startsWith("REVEL_SESSION=") ? val : `REVEL_SESSION=${val}`;
    setCookieInput("");
    setHasCookie(true);
    setStatus(t("cookie.saved"));
    vscode.postMessage({ command: "setCookie", text: finalVal });
  };

  const handleClearCookie = () => {
    vscode.postMessage({ command: "setCookie", text: "" });
    setHasCookie(false);
    setStatus(t("cookie.cleared"));
  };

  const doCopyMarkdown = () => {
    if (!problem) return;
    vscode.postMessage({ command: "copyMarkdown", problem });
    setStatus(t("status.copying"));
  };

  const doTranslate = () => {
    translation.translate(problem);
  };

  const doExportToCph = () => {
    if (!problem) return;
    setStatus(t("status.exportingCph"));
    vscode.postMessage({ command: "sendCph", problem });
  };

  const handleFetchSubmitPage = () => {
    setSubmitResult(null);
    setSubmitTasks([]);
    setSubmitLanguages([]);
    setSourceCode("");
    setStatus(t("status.fetchingSubmitPage"));
    vscode.postMessage({ command: "fetchSubmitPage", contest });
  };

  const handleFetchSubmissionHistory = () => {
    setLoadingHistory(true);
    setStatus(t("status.fetchingHistory"));
    vscode.postMessage({ command: "fetchSubmissionHistory", contest } as unknown as WebviewMessage);
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

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    vscode.postMessage({ command: "getCookie" });
  }, []);

  React.useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  useWebviewMessage({
    tasks: (message) => {
      const nextTasks = message.tasks ?? [];
      setTasks(nextTasks);
      setSelectedTask("");
      setProblem(null);
      setRated(true);
      setStatus(t("status.tasksLoaded", { count: nextTasks.length }));
      setIsLoading(false);
    },
    contestInfo: (message) => {
      setRated(message.Rated ?? false);
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
    },
    cphExportResult: (message) => {
      const ok = message.success === true;
      setStatus(ok ? (message.message ?? t("status.sentToCph")) : (message.message ?? t("status.cphExportFailed")));
      setIsLoading(false);
    },
    cf_challenge: (message) => {
      setCfUrl(message.url ?? null);
      setIsLoading(false);
      setStatus(t("status.cfChallenge"));
    },
    loginRequired: () => {
      setIsLoading(false);
      setShowSettings(true);
      setStatus(t("status.loginRequired"));
    },
    translation: (message) => translation.applyTranslation(message),
    cookieStatus: (message) => {
      setHasCookie(message.hasCookie ?? false);
      setCookieInput("");
      if (message.statusMessage) {
        setStatus(message.statusMessage);
      }
      if (message.hasCookie) {
        setCfUrl(null);
        setShowSettings(false);
      }
    },
    registrationStatus: (message) => {
      setSigned(message.signed ?? false);
      setRegistrationMessage(message.registrationMessage ?? null);
      setStatus(message.registrationMessage ?? (message.signed ? t("status.registrationSuccess") : t("status.registrationFail")));
      setIsLoading(false);
    },
    submitPage: (message) => {
      setSubmitTasks(message.submitTasks ?? []);
      setSubmitLanguages(message.languages ?? []);
      if (message.submitTasks && message.submitTasks.length > 0) {
        setSelectedSubmitTask(message.submitTasks[0].value);
      }
      if (message.languages && message.languages.length > 0) {
        setSelectedSubmitLanguage(message.languages[0].id);
      }
      setShowSubmitPanel(true);
      setStatus(t("status.submitPageReady"));
      setIsLoading(false);
    },
    submitResult: (message) => {
      setSubmitResult(message.submitResult ?? null);
      setIsLoading(false);
      if (message.submitResult?.success) {
        setStatus(t("status.submitSuccess"));
      } else {
        setStatus(message.submitResult?.message ?? t("status.submitFailed"));
      }
    },
    statusUpdate: (message) => {
      const statuses = message.statuses ?? {};
      setTasks(prev => prev.map(t => ({ ...t, status: statuses[t.value] })));
    },
    submissionHistory: (message) => {
      const records = message.submissions ?? [];
      setSubmissionHistory(records);
      const latest: Record<string, string> = {};
      for (const s of records) {
        if (!(s.taskScreenName in latest)) latest[s.taskScreenName] = s.status;
      }
      setTasks(prev => prev.map(t => ({ ...t, status: latest[t.value] })));
      setLoadingHistory(false);
      setStatus(t("status.historyLoaded", { count: records.length }));
      setShowSubmissionHistory(true);
    },
  });

  function getStatusColor() {
    if (isLoading) return "bg-yellow-500";
    if (/失败|failed|error/i.test(status)) return "bg-red-500";
    if (tasks.length > 0 || problem) return "bg-green-500";
    return "bg-gray-500";
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 标题栏 */}
      <div className="h-[35px] flex items-center px-3 bg-[var(--vscode-titleBar-activeBackground)] text-[var(--vscode-titleBar-activeForeground)]">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${getStatusColor()} transition-colors duration-200`}
          />
          <span className="text-[11px] opacity-60 select-none">extension</span>
          <span className="text-[13px] select-none">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {hasCookie && <span className="w-2 h-2 rounded-full bg-green-500" title={t("cookie.loggedIn")} />}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[11px] opacity-60 hover:opacity-100 px-1 py-0.5 rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
            title={t("ui.settings")}
          >
            ⚙
          </button>
        </div>
      </div>
      {/* 主内容 */}
      <div className="flex-1 flex flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
        {showSettings && (
          <CookieSettingsPanel
            hasCookie={hasCookie}
            cookieInput={cookieInput}
            onCookieInputChange={setCookieInput}
            onSave={handleSaveCookie}
            onClear={handleClearCookie}
          />
        )}
        <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={inputRef}
              value={contest}
              onChange={(e) => setContest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadContest(contest)}
              placeholder={t("ui.contestPlaceholder")}
              className="flex-1 h-[28px] text-[12px]"
              disabled={isLoading}
            />
            <Button onClick={() => void loadContest(contest)} disabled={isLoading} className="h-[28px] text-[12px]">
              {t("ui.loadTasks")}
            </Button>
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
            <Button
              onClick={() => {
                if (submitTasks.length === 0) {
                  handleFetchSubmitPage();
                } else {
                  setShowSubmitPanel(!showSubmitPanel);
                }
              }}
              disabled={isLoading}
              variant={showSubmitPanel ? "secondary" : "primary"}
              size="sm"
              className="h-[28px] text-[12px]"
              title={t("ui.submit")}
            >
              {t("ui.submit")}
            </Button>
            <Button
              onClick={() => {
                if (submissionHistory.length === 0) {
                  handleFetchSubmissionHistory();
                } else {
                  setShowSubmissionHistory(!showSubmissionHistory);
                }
              }}
              disabled={isLoading}
              variant={showSubmissionHistory ? "secondary" : "primary"}
              size="sm"
              className="h-[28px] text-[12px]"
              title={t("ui.submitHistoryTitle")}
            >
              {t("ui.submitHistoryTitle")}
            </Button>
          </div>
          {Rated && (
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
          {registrationMessage && (
            <div className={`text-[12px] ${signed ? "text-green-500" : "text-red-500"}`}>
              {registrationMessage}
            </div>
          )}
          <div className="text-[12px] opacity-70">{status}</div>
        </div>

        {showSubmitPanel && (
          <div className="border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)]">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold">{t("ui.submitTo", { contest })}</div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setShowSubmitPanel(false); setSubmitResult(null); }}
                  className="h-[24px] text-[11px]"
                >
                  {t("ui.close")}
                </Button>
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
                onTaskChange={setSelectedSubmitTask}
                onLanguageChange={setSelectedSubmitLanguage}
                onSourceCodeChange={setSourceCode}
                onSubmit={handleSubmitCode}
                onFetchPage={handleFetchSubmitPage}
              />
            </div>
          </div>
        )}

        {showSubmissionHistory && (
          <div className="border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-textBlockQuote-background)]">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold">{contest} {t("ui.submitHistoryTitle")}</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleFetchSubmissionHistory}
                    disabled={loadingHistory}
                    className="h-[24px] text-[11px]"
                  >
                    {loadingHistory ? t("ui.refreshing") : t("ui.refresh")}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setShowSubmissionHistory(false); }}
                    className="h-[24px] text-[11px]"
                  >
                    {t("ui.close")}
                  </Button>
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                <SubmissionList contest={contest} records={submissionHistory} loading={loadingHistory} timeFirst />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {tasks.length > 0 && (
            <TaskList
              tasks={tasks}
              selectedTask={selectedTask}
              onSelect={(value) => {
                setSelectedTask(value);
                void loadProblem(contest, value);
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

          {!isLoading && tasks.length === 0 && !problem && !cfUrl && (
            <div className="flex flex-col items-center justify-center h-full text-[12px] opacity-60">
              {t("ui.enterContestHint")}
            </div>
          )}

          {cfUrl && (
            <div className="p-6 flex flex-col items-center justify-center gap-4">
              <div className="text-[14px] font-medium text-yellow-600">{t("ui.cfTitle")}</div>
              <div className="text-[12px] opacity-70 text-center max-w-md">
                <p className="mb-2">{t("ui.cfBody1")}</p>
                <p>{t("ui.cfBody2")}</p>
              </div>
              <div className="flex gap-3 mt-2 flex-wrap justify-center">
                <Button onClick={() => vscode.postMessage({ command: "openBrowser", url: cfUrl })} className="h-[32px] text-[12px]">
                  {t("ui.openInBrowser")}
                </Button>
                <Button onClick={() => { setCfUrl(null); }} className="h-[32px] text-[12px]">
                  {t("ui.close")}
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-[12px] opacity-70">
              <Spinner size="sm" />
              <span>{t("ui.fetchingData")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { WebviewApp };
