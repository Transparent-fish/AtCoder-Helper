import React from "react";
import { Button, Card, Input, Spinner } from "@template/ui";
import "./styles.css";

import { useVSCode } from "./VSCodeProvider";
import type { WebviewMessage } from "./types";
import { HtmlContent, TranslatedBlock } from "./components/HtmlContent";

export interface WebviewAppProps {
  title?: string;
}

const WebviewApp: React.FC<WebviewAppProps> = ({
  title = "VSCode Extension",
}) => {
  const vscode = useVSCode();
  const [contest, setContest] = React.useState("abc345");
  const [tasks, setTasks] = React.useState<Array<{ label: string; value: string; url: string }>>([]);
  const [selectedTask, setSelectedTask] = React.useState<string>("");
  const [problem, setProblem] = React.useState<any>(null);
  const [status, setStatus] = React.useState("输入比赛代号并加载题目列表");
  const [isLoading, setIsLoading] = React.useState(false);
  const [cfUrl, setCfUrl] = React.useState<string | null>(null);
  const [translated, setTranslated] = React.useState<Record<string, string> | null>(null);
  const [translating, setTranslating] = React.useState(false);
  const [cookieInput, setCookieInput] = React.useState("");
  const [hasCookie, setHasCookie] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const [registrationMessage, setRegistrationMessage] = React.useState<string | null>(null);
  const [Rated, setRated] = React.useState(false);
  const [isRated, setIsRated] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const loadContest = async (nextContest: string) => {
    setIsLoading(true);
    setStatus(`正在加载 ${nextContest} 的题目...`);
    vscode.postMessage({ command: "loadContest", contest: nextContest });
  };

  const loadProblem = async (nextContest: string, task: string) => {
    setIsLoading(true);
    setStatus(`正在抓取 ${nextContest}/${task} 的题面...`);
    setTranslated(null);
    vscode.postMessage({ command: "loadProblem", contest: nextContest, task });
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
    vscode.postMessage({ command: "translate", payload: texts, targetLang: "ZH" });
  };

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    vscode.postMessage({ command: "getCookie" });
  }, []);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "tasks") {
        const nextTasks = message.tasks ?? [];
        setTasks(nextTasks);
        setSelectedTask("");
        setProblem(null);
        setRated(false);
        setIsRated(true);
        setStatus(`已加载 ${nextTasks.length} 道题目`);
        setIsLoading(false);
      }
      if (message.type === "contestInfo") {
        setRated(message.Rated ?? false);
      }
      if (message.type === "problem") {
        setProblem(message.problem ?? null);
        setStatus(`已加载题面：${message.problem?.title ?? ""}`);
        setIsLoading(false);
      }
      if (message.type === "loading") {
        setStatus(message.text ?? "加载中...");
      }
      if (message.type === "error") {
        setStatus(message.text ?? "操作失败");
        setIsLoading(false);
        setTranslating(false);
      }
      if (message.type === "cf_challenge") {
        setCfUrl(message.url ?? null);
        setIsLoading(false);
        setShowSettings(true);
        setStatus("AtCoder 触发 Cloudflare 验证，请在浏览器中完成验证，然后将 Cookie 粘贴到设置中");
      }
      if (message.type === "loginRequired") {
        setIsLoading(false);
        setShowSettings(true);
        setStatus("需要登录 AtCoder 才能查看。请在浏览器中登录，然后将 Cookie 粘贴到设置中");
      }
      if (message.type === "translation") {
        setTranslated(message.translated ?? null);
        setTranslating(false);
        setStatus("翻译完成");
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
        setStatus(message.registrationMessage ?? (message.signed ? "报名成功" : "报名失败"));
        setIsLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function getStatusColor() {
    if (isLoading) return "bg-yellow-500";
    if (status.includes("失败") || status.includes("Error")) return "bg-red-500";
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
          {hasCookie && <span className="w-2 h-2 rounded-full bg-green-500" title="已登录 AtCoder" />}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[11px] opacity-60 hover:opacity-100 px-1 py-0.5 rounded hover:bg-[var(--vscode-toolbar-hoverBackground)]"
            title="设置"
          >
            ⚙
          </button>
        </div>
      </div>
      {/* 主内容 */}
      <div className="flex-1 flex flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
        {showSettings && (
          <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2 bg-[var(--vscode-textBlockQuote-background)]">
            <div className="text-[12px] font-semibold">AtCoder 登录 Cookie</div>
            <div className="space-y-1 text-[11px] opacity-70 leading-relaxed">
              <div>AtCoder 仅需 <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code> 一个 Cookie 即可登录。</div>
              <div className="font-medium mt-1">获取步骤：</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>在浏览器中打开 <span className="underline cursor-pointer" onClick={() => vscode.postMessage({ command: "openBrowser", url: "https://atcoder.jp/login" })}>https://atcoder.jp/login</span> 并登录</li>
                <li>按 <kbd className="px-1 rounded border border-[var(--vscode-input-border)]">F12</kbd> 打开开发者工具</li>
                <li>切换到 <b>Application</b>（Chrome）或 <b>存储</b>（Edge）标签页</li>
                <li>左侧找到 <b>Cookies</b> → <b>https://atcoder.jp</b></li>
                <li>找到名为 <code className="bg-[var(--vscode-textBlockQuote-background)] px-1 rounded">REVEL_SESSION</code> 的行，双击 <b>Value</b> 列全选复制</li>
                <li>粘贴到下方输入框（无需手动加前缀，插件会自动补全）</li>
              </ol>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                placeholder={hasCookie ? "已保存 Cookie，输入新值可覆盖" : "粘贴 REVEL_SESSION 的 Value"}
                className="flex-1 h-[28px] text-[12px] px-2 rounded border border-[var(--vscode-input-border)] bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] outline-none focus:border-[var(--vscode-focusBorder)]"
              />
              <Button
                onClick={() => {
                  const val = cookieInput.trim();
                  if (!val) {
                    setStatus("请先复制 REVEL_SESSION 的值再保存");
                    return;
                  }
                  const finalVal = val.startsWith("REVEL_SESSION=") ? val : `REVEL_SESSION=${val}`;
                  setCookieInput("");
                  setHasCookie(true);
                  setStatus("Cookie 已保存");
                  vscode.postMessage({ command: "setCookie", text: finalVal });
                }}
                size="sm"
                className="h-[28px] text-[11px]"
                disabled={!cookieInput.trim()}
              >
                保存
              </Button>
              {hasCookie && (
                  <Button
                    onClick={() => {
                      vscode.postMessage({ command: "setCookie", text: "" });
                      setHasCookie(false);
                      setStatus("Cookie 已清除");
                    }}
                    size="sm"
                    variant="secondary"
                    className="h-[28px] text-[11px]"
                  >
                    清除
                  </Button>
              )}
            </div>
          </div>
        )}
        <div className="p-3 border-b border-[var(--vscode-panel-border)] space-y-2">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={contest}
              onChange={(e) => setContest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadContest(contest)}
              placeholder="输入比赛代号，如 abc345"
              className="flex-1 h-[28px] text-[12px]"
              disabled={isLoading}
            />
            <Button onClick={() => void loadContest(contest)} disabled={isLoading} className="h-[28px] text-[12px]">
              加载题目
            </Button>
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
          </div>
          {Rated && (
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
          {registrationMessage && (
            <div className={`text-[12px] ${signed ? "text-green-500" : "text-red-500"}`}>
              {registrationMessage}
            </div>
          )}
          <div className="text-[12px] opacity-70">{status}</div>
        </div>

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
                      void loadProblem(contest, task.value);
                    }}
                  >
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
                <Button onClick={doTranslate} disabled={translating} size="sm" className="h-[26px] text-[11px]">
                  {translating ? "翻译中..." : "翻译"}
                </Button>
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
                problem.samples.map((sample: any) => (
                  <div key={sample.index} className="space-y-2">
                    <div className="text-[12px] font-semibold">Sample {sample.index}</div>
                    <div className="rounded bg-[var(--vscode-input-background)] p-2">
                      <div className="text-[11px] opacity-60 mb-1">Input</div>
                      <pre className="text-[12px] whitespace-pre-wrap break-words">{sample.input}</pre>
                    </div>
                    <div className="rounded bg-[var(--vscode-input-background)] p-2">
                      <div className="text-[11px] opacity-60 mb-1">Output</div>
                      <pre className="text-[12px] whitespace-pre-wrap break-words">{sample.output}</pre>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[12px] opacity-60">当前题目没有找到样例。</div>
              )}
            </Card>
          )}

          {!isLoading && tasks.length === 0 && !problem && !cfUrl && (
            <div className="flex flex-col items-center justify-center h-full text-[12px] opacity-60">
              请输入比赛代号，例如 abc345，然后点击加载题目。
            </div>
          )}

          {cfUrl && (
            <div className="p-6 flex flex-col items-center justify-center gap-4">
              <div className="text-[14px] font-medium text-yellow-600">需要 Cloudflare 验证</div>
              <div className="text-[12px] opacity-70 text-center max-w-md">
                <p className="mb-1">AtCoder 触发了 Cloudflare 验证，请按以下步骤操作：</p>
                <ol className="text-left list-decimal pl-4 space-y-1">
                  <li>点击下方按钮在浏览器中打开 AtCoder</li>
                  <li>完成 Cloudflare 人机验证并登录</li>
                  <li>按 <kbd className="px-1 rounded border border-[var(--vscode-input-border)]">F12</kbd> 复制 <b>REVEL_SESSION</b> 的 Cookie</li>
                  <li>在插件设置 ⚙ 中粘贴 Cookie 后重试</li>
                </ol>
              </div>
              <div className="flex gap-3 mt-2 flex-wrap justify-center">
                <Button onClick={() => vscode.postMessage({ command: "openBrowser", url: cfUrl })} className="h-[32px] text-[12px]">
                  在浏览器中打开并验证
                </Button>
                <Button onClick={() => { setShowSettings(true); }} className="h-[32px] text-[12px]">
                  打开设置粘贴 Cookie
                </Button>
                <Button onClick={() => { setCfUrl(null); void loadContest(contest); }} className="h-[32px] text-[12px]">
                  验证完成，重试
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-[12px] opacity-70">
              <Spinner size="sm" />
              <span>正在抓取数据...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { WebviewApp };
