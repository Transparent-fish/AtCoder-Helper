import React from "react";
import { Button, Card, Input, Spinner } from "@template/ui";
import "./styles.css";

import { useVSCode } from "./VSCodeProvider";
import type { WebviewMessage } from "./types";

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
    const handleMessage = (event: MessageEvent) => {
      const message = event.data as WebviewMessage;
      if (message.type === "tasks") {
        const nextTasks = message.tasks ?? [];
        setTasks(nextTasks);
        setSelectedTask("");
        setProblem(null);
        setStatus(`已加载 ${nextTasks.length} 道题目`);
        setIsLoading(false);
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
        setStatus("AtCoder 需要 Cloudflare 验证，请在浏览器中完成验证后重试");
      }
      if (message.type === "translation") {
        setTranslated(message.translated ?? null);
        setTranslating(false);
        setStatus("翻译完成");
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
      </div>
      {/* 主内容 */}
      <div className="flex-1 flex flex-col bg-[var(--vscode-editor-background)] text-[var(--vscode-editor-foreground)]">
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
          </div>
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
                  <div className="text-[12px] whitespace-pre-wrap break-words">{problem.statement}</div>
                  {translated?.["题目描述"] && (
                    <div className="text-[12px] whitespace-pre-wrap break-words mt-1 pl-2 border-l-2 border-[var(--vscode-focusBorder)] opacity-90">
                      {translated["题目描述"]}
                    </div>
                  )}
                </div>
              )}

              {problem.constraints && (
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold">约束</div>
                  <div className="text-[12px] whitespace-pre-wrap break-words">{problem.constraints}</div>
                  {translated?.["约束"] && (
                    <div className="text-[12px] whitespace-pre-wrap break-words mt-1 pl-2 border-l-2 border-[var(--vscode-focusBorder)] opacity-90">
                      {translated["约束"]}
                    </div>
                  )}
                </div>
              )}

              {problem.inputFormat && (
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold">输入格式</div>
                  <div className="text-[12px] whitespace-pre-wrap break-words">{problem.inputFormat}</div>
                  {translated?.["输入格式"] && (
                    <div className="text-[12px] whitespace-pre-wrap break-words mt-1 pl-2 border-l-2 border-[var(--vscode-focusBorder)] opacity-90">
                      {translated["输入格式"]}
                    </div>
                  )}
                </div>
              )}

              {problem.outputFormat && (
                <div className="space-y-1">
                  <div className="text-[12px] font-semibold">输出格式</div>
                  <div className="text-[12px] whitespace-pre-wrap break-words">{problem.outputFormat}</div>
                  {translated?.["输出格式"] && (
                    <div className="text-[12px] whitespace-pre-wrap break-words mt-1 pl-2 border-l-2 border-[var(--vscode-focusBorder)] opacity-90">
                      {translated["输出格式"]}
                    </div>
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
            <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
              <div className="text-[14px] font-medium text-yellow-600">需要 Cloudflare 验证</div>
              <div className="text-[12px] opacity-70 text-center max-w-md">
                AtCoder 触发了 Cloudflare 验证，请在浏览器中完成验证后重试。
              </div>
              <div className="flex gap-3 mt-2">
                <Button onClick={() => vscode.postMessage({ command: "openBrowser", url: cfUrl })} className="h-[32px] text-[12px]">
                  在浏览器中打开
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
