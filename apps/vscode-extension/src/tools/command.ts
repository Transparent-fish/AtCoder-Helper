import * as vscode from "vscode";
import { copyMarkdown } from "./copy";
import { IncomingMessage } from "./types";
import { openContestPanel, openSubmissionPanel } from "../extension"
import {
  handleContestLoad,
  handleProblemLoad,
  handleTranslate,
  handleGetCookie,
  handleSetCookie,
  handleRegistration,
  handleFetchSubmitPage,
  handleSubmitCode,
  handleFetchSubHistory,
  handleExportToCph,
  handleFetchStandings,
  handleGetContests,
  handleFetchSubmissionDetail,
} from "./handle";

const loadCommands = new Set(["loadContest", "loadProblem", "openBrowser"]);
const deeplCommands = new Set(["translate", "setApiKey"]);
const cookieCommands = new Set(["getCookie", "setCookie"]);
const problemCommands = new Set(["registerContest", "copyMarkdown", "alert", "sendCph"]);
const submitCommands = new Set(["fetchSubmitPage", "submitCode", "fetchSubmissionHistory", "fetchSubmissionDetail"]);
const contestCommands = new Set(["fetchStandings", "getContests", "openContest", "openSubmission"]);

export async function runCommand(message: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,) {
  if (loadCommands.has(message.command!)) await runLoadCommand(message, sendToWebview);
  else if (deeplCommands.has(message.command!)) await runDeepL(message, context, sendToWebview);
  else if (cookieCommands.has(message.command!)) await runCookie(message, context, sendToWebview);
  else if (problemCommands.has(message.command!)) await runProblem(message, context, sendToWebview);
  else if (submitCommands.has(message.command!)) await runSubmit(message, context, sendToWebview);
  else if (contestCommands.has(message.command!)) await runContest(message, context, sendToWebview);
  else throw new Error("unknown command");
}

async function runContest(command: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "fetchStandings":
      if (!command.contest) return false;
      await handleFetchStandings(command.contest, sendToWebview);
      return true;
    case "getContests":
      await handleGetContests(sendToWebview);
      return true;
    case "openContest":
      if (!command.contest) return false;
      openContestPanel(context, command.contest);
      return true;
    case "openSubmission":
      if (!command.contest || !command.id) return false;
      openSubmissionPanel(context, command.contest, command.id);
      return true;
    default:
      return false;
  }
}

async function runSubmit(command: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "fetchSubmitPage":
      if (!command.contest) return false;
      await handleFetchSubmitPage(command.contest, sendToWebview);
      return true;
    case "submitCode":
      if (!command.contest) return false;
      await handleSubmitCode(command.contest, command.taskScreenName, command.languageId, command.sourceCode, sendToWebview);
      return true;
    case "fetchSubmissionHistory":
      if (!command.contest) return false;
      await handleFetchSubHistory(command.contest, sendToWebview);
      return true;
    case "fetchSubmissionDetail":
      if (!command.contest || !command.id) return false;
      await handleFetchSubmissionDetail(command.contest, command.id, sendToWebview);
      return true;
    default:
      return false;
  }
}

async function runProblem(command: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "registerContest":
      if (!command.contest) return false;
      await handleRegistration(command.contest, command.rated, sendToWebview);
      return true;
    case "copyMarkdown":
      if (command.problem) {
        await vscode.env.clipboard.writeText(copyMarkdown(command.problem));
        sendToWebview({ type: "update", text: "已复制到剪贴板" });
      }
      return true;
    case "alert":
      vscode.window.showInformationMessage(command.text ?? "");
      sendToWebview({ type: "update", text: `Extension received: ${command.text ?? ""}` });
      return true;
    case "sendCph":
      if (command.problem) {
        await handleExportToCph(command.problem, sendToWebview);
      }
      return true;
    default:
      return false;
  }
}

async function runCookie(command: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "getCookie":
      await handleGetCookie(context, sendToWebview);
      return true;
    case "setCookie":
      await handleSetCookie(command.text, context, sendToWebview);
      return true;
    default:
      return false;
  }
}

async function runDeepL(command: IncomingMessage, context: vscode.ExtensionContext, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "translate":
      await handleTranslate(command.payload, command.targetLang, context, sendToWebview, command.translationMode);
      return true;
    case "setApiKey":
      if (command.text?.trim()) {
        await context.secrets.store("deeplApiKey", command.text.trim());
        vscode.window.showInformationMessage("DeepL API Key 已保存");
      }
      return true;
    default:
      return false;
  }
}

async function runLoadCommand(command: IncomingMessage, sendToWebview: (payload: Record<string, unknown>) => void,): Promise<boolean> {
  switch (command.command) {
    case "loadContest":
      if (!command.contest) return false;
      await handleContestLoad(command.contest, sendToWebview);
      return true;
    case "loadProblem":
      if (!command.contest || !command.task) return false;
      await handleProblemLoad(command.contest, command.task, sendToWebview);
      return true;
    case "openBrowser":
      if (command.url) vscode.env.openExternal(vscode.Uri.parse(command.url));
      return true;
    default:
      return false;
  }
}
