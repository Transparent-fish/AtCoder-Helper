import React from "react";
import { Button, Card, Input, Spinner } from "@template/ui";
import "./styles.css";

import { useVSCode } from "./VSCodeProvider";
import { useI18n } from "./i18n";
import type { WebviewMessage, ContestProblem, SampleCase, SubmitResult } from "./types";
import { HtmlContent, TranslatedBlock } from "./components/HtmlContent";

export interface WebviewAppProps {
  title?: string;
}

const WebviewApp: React.FC<WebviewAppProps> = ({
  title = "VSCode Extension",
}) => {
  const vscode = useVSCode();
  const { t, nodes } = useI18n();
  const [contest, setContest] = React.useState("");
  const [tasks, setTasks] = React.useState<Array<{ label: string; value: string; url: string; status?: string }>>([]);
  const [selectedTask, setSelectedTask] = React.useState<string>("");
  const [problem, setProblem] = React.useState<ContestProblem | null>(null);
  const [status, setStatus] = React.useState(t("ui.enterContestHint"));
  const [isLoading, setIsLoading] = React.useState(false);
  const [cfUrl, setCfUrl] = React.useState<string | null>(null);
  const [translated, setTranslated] = React.useState<Record<string, string> | null>(null);
  const [translatedCache, setTranslatedCache] = React.useState<Record<string, Record<string, string>>>({});
  const [translating, setTranslating] = React.useState(false);
  const [translationMode, setTranslationMode] = React.useState<"api" | "free">("free");
  const selectedTaskRef = React.useRef(selectedTask);
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
  const [copiedSample, setCopiedSample] = React.useState<Record<string, boolean>>({});
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
    setTranslated(translatedCache[task] ?? null);
    vscode.postMessage({ command: "loadProblem", contest: nextContest, task });
  };

  const handleRegister = () => {
    setRegistrationMessage(null);
    setStatus(t("status.registration", { contest }));
    vscode.postMessage({ command: "registerContest", contest, rated: isRated });
  };

  const doCopyMarkdown = () => {
    if (!problem) return;
    vscode.postMessage({ command: "copyMarkdown", problem });
    setStatus(t("status.copying"));
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
    vscode.postMessage({ command: "translate", payload: texts, targetLang: "ZH", translationMode } as WebviewMessage);
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

  const copySampleText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSample(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopiedSample(prev => ({ ...prev, [key]: false })), 1500);
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

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "tasks") {
        const nextTasks = message.tasks ?? [];
        setTasks(nextTasks);
        setSelectedTask("");
        setProblem(null);
        setRated(true);
        setStatus(t("status.tasksLoaded", { count: nextTasks.length }));
        setIsLoading(false);
      }
      if (message.type === "contestInfo") {
        setRated(message.Rated ?? false);
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
      }
      if (message.type === "cphExportResult") {
        const ok = message.success === true;
        setStatus(ok ? (message.message ?? t("status.sentToCph")) : (message.message ?? t("status.cphExportFailed")));
        setIsLoading(false);
      }
      if (message.type === "cf_challenge") {
        setCfUrl(message.url ?? null);
        setIsLoading(false);
        setStatus(t("status.cfChallenge"));
      }
      if (message.type === "loginRequired") {
        setIsLoading(false);
        setShowSettings(true);
        setStatus(t("status.loginRequired"));
      }
      if (message.type === "translation") {
        setTranslatedCache(prev => ({ ...prev, [selectedTaskRef.current]: message.translated ?? {} }));
        setTranslated(message.translated ?? null);
        setTranslating(false);
        setStatus(t("status.translationDone"));
      }
      if (message.type === "cookieStatus") {
        setHasCookie(message.hasCookie ?? false);
        setCookieInput("");
        if (message.statusMessage) {
          setStatus(message.statusMessage);
        }
        if (message.hasCookie) {
          setCfUrl(null);
          setShowSettings(false);
        }
      }
      if (message.type === "registrationStatus") {
        setSigned(message.signed ?? false);
        setRegistrationMessage(message.registrationMessage ?? null);
        setStatus(message.registrationMessage ?? (message.signed ? t("status.registrationSuccess") : t("status.registrationFail")));
        setIsLoading(false);
      }
      if (message.type === "submitPage") {
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
      }
      if (message.type === "submitResult") {
        setSubmitResult(message.submitResult ?? null);
        setIsLoading(false);
        if (message.submitResult?.success) {
          setStatus(t("status.submitSuccess"));
        } else {
          setStatus(message.submitResult?.message ?? t("status.submitFailed"));
        }
      }
      if (message.type === "statusUpdate") {
        const statuses = message.statuses ?? {};
        setTasks(prev => prev.map(t => ({ ...t, status: statuses[t.value] })));
      }
      if (message.type === "submissionHistory") {
        const m = message as any;
        setSubmissionHistory(m.submissions ?? []);
        const latest: Record<string, string> = {};
        for (const s of (m.submissions ?? [])) {
          if (!(s.taskScreenName in latest)) latest[s.taskScreenName] = s.status;
        }
        setTasks(prev => prev.map(t => ({ ...t, status: latest[t.value] })));
        setLoadingHistory(false);
        setStatus(t("status.historyLoaded", { count: (m.submissions ?? []).length }));
        setShowSubmissionHistory(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
          <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2 bg-[var(--vscode-textBlockQuote-background)]">
            <div className="text-[12px] font-semibold">{t("cookie.title")}</div>
            <div className="space-y-1 text-[11px] opacity-70 leading-relaxed">
              <div>
                {nodes(t("cookie.onlyNeedRevel"), {
                  code: <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>,
                })}
              </div>
              <div className="font-medium mt-1">{t("cookie.steps")}</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>
                  {nodes(t("cookie.step1"), {
                    link: (
                      <span className="underline cursor-pointer" onClick={() => vscode.postMessage({ command: "openBrowser", url: "https://atcoder.jp/login" })}>
                        https://atcoder.jp/login
                      </span>
                    ),
                  })}
                </li>
                <li>
                  {nodes(t("cookie.step2"), {
                    key: <kbd className="px-1 rounded border border-[var(--vscode-input-border,#6e7681)]">F12</kbd>,
                  })}
                </li>
                <li>
                  {nodes(t("cookie.step3"), {
                    application: <b>{t("cookie.chromeApp")}</b>,
                    storage: <b>{t("cookie.edgeStorage")}</b>,
                  })}
                </li>
                <li>
                  {nodes(t("cookie.step4"), {
                    cookies: <b>Cookies</b>,
                    site: <b>https://atcoder.jp</b>,
                  })}
                </li>
                <li>
                  {nodes(t("cookie.step5"), {
                    code: <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code>,
                    value: <b>Value</b>,
                  })}
                </li>
                <li>{t("cookie.step6")}</li>
              </ol>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                placeholder={hasCookie ? t("cookie.placeholderHas") : t("cookie.placeholderEmpty")}
                className="flex-1 h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
              />
              <Button
                onClick={() => {
                  const val = cookieInput.trim();
                  if (!val) {
                    setStatus(t("cookie.pasteFirst"));
                    return;
                  }
                  const finalVal = val.startsWith("REVEL_SESSION=") ? val : `REVEL_SESSION=${val}`;
                  setCookieInput("");
                  setHasCookie(true);
                  setStatus(t("cookie.saved"));
                  vscode.postMessage({ command: "setCookie", text: finalVal });
                }}
                size="sm"
                className="h-[28px] text-[11px]"
                disabled={!cookieInput.trim()}
              >
                {t("ui.save")}
              </Button>
              {hasCookie && (
                  <Button
                    onClick={() => {
                      vscode.postMessage({ command: "setCookie", text: "" });
                      setHasCookie(false);
                      setStatus(t("cookie.cleared"));
                    }}
                    size="sm"
                    variant="secondary"
                    className="h-[28px] text-[11px]"
                  >
                    {t("ui.clear")}
                  </Button>
              )}
            </div>
          </div>
        )}
        <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={inputRef}
              value={contest}
              onChange={(e) => setContest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadContest(contest)}
              placeholder={t("ui.contestPlaceholder")}
              className="flex-1 h-[28px] text-[12px] bg-white! text-[#000000]! placeholder:text-[#000000]! placeholder:opacity-100! shadow-none!"
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

              {submitTasks.length === 0 ? (
                <Button onClick={handleFetchSubmitPage} disabled={isLoading} size="sm" className="h-[28px] text-[12px]">
                  {isLoading ? t("ui.fetching") : t("ui.fetchSubmitPage")}
                </Button>
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
                      rows={8}
                      className="w-full text-[12px] p-2 rounded border border-[var(--vscode-input-border,#6e7681)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)] resize-vertical font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSubmitCode}
                      disabled={isLoading || !selectedSubmitTask || !selectedSubmitLanguage || !sourceCode.trim()}
                      size="sm"
                      className="h-[28px] text-[12px]"
                    >
                      {isLoading ? t("ui.submitting") : t("ui.submit")}
                    </Button>
                    <Button
                      onClick={handleFetchSubmitPage}
                      disabled={isLoading}
                      size="sm"
                      variant="secondary"
                      className="h-[28px] text-[12px]"
                    >
                      {t("ui.refresh")}
                    </Button>
                  </div>

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

              {submissionHistory.length === 0 ? (
                <div className="text-[12px] opacity-60">
                  {loadingHistory ? t("ui.loadingHistory") : t("ui.noHistory")}
                </div>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {submissionHistory.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 text-[12px] border border-[var(--vscode-panel-border)] rounded hover:bg-[var(--vscode-list-hoverBackground)]">
                      <span className="text-[11px] opacity-60 w-[120px] flex-shrink-0">{s.time}</span>
                      <span className="flex-1 truncate">{s.task}</span>
                      <span className={`text-[10px] px-1 rounded font-bold ${
                        s.status === "AC" ? "text-green-500 bg-green-500/10" :
                        s.status === "WA" ? "text-red-500 bg-red-500/10" :
                        s.status === "TLE" ? "text-cyan-500 bg-cyan-500/10" :
                        s.status === "MLE" ? "text-yellow-500 bg-yellow-500/10" :
                        s.status === "RE" ? "text-purple-500 bg-purple-500/10" :
                        s.status === "CE" ? "text-gray-400 bg-gray-400/10" :
                        "text-gray-400 bg-gray-400/10"
                      }`}>{s.status}</span>
                      <span className="text-[11px] opacity-60 w-[50px] text-right">{s.score}</span>
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
            </div>
          </div>
        )}

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
                      void loadProblem(contest, task.value);
                    }}
                    className="flex items-center gap-1"
                  >
                    {task.status && (
                      <span className={`text-[10px] px-1 rounded font-bold ${
                        task.status === "AC" ? "text-green-500 bg-green-500/10" :
                        task.status === "WA" ? "text-red-500 bg-red-500/10" :
                        task.status === "TLE" ? "text-cyan-500 bg-cyan-500/10" :
                        task.status === "MLE" ? "text-yellow-500 bg-yellow-500/10" :
                        task.status === "RE" ? "text-purple-500 bg-purple-500/10" :
                        task.status === "CE" ? "text-gray-400 bg-gray-400/10" :
                        task.status === "WJ" || task.status === "WR" ? "text-yellow-500 bg-yellow-500/10" :
                        "text-gray-400 bg-gray-400/10"
                      }`}>{task.status}</span>
                    )}
                    {task.label}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {problem && (
            <Card className="p-3 space-y-3">
              <div className="flex items-center justify-between">
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
                  <Button onClick={doExportToCph} size="sm" variant="secondary" className="h-[26px] text-[11px]" title={t("ui.exportCphTitle")}>
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
                        {copiedSample[`${sample.index}-in`] ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
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
                        {copiedSample[`${sample.index}-out`] ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vscode-editor-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
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
