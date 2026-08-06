export interface SampleCase {
  index: number;
  input: string;
  output: string;
}

export interface ContestProblem {
  contest: string;
  title: string;
  url: string;
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  samples: SampleCase[];
  sampleUrl?: string;
}

export interface SubmitResult {
  success: boolean;
  message: string;
  url?: string;
}

export interface SubmissionRecord {
  id: string;
  time: string;
  task: string;
  taskScreenName: string;
  language: string;
  score: string;
  status: string;
}

export interface Standing {
  rank: number;
  user: string;
  score: string;
}

export interface WebviewMessage {
  type?: string;
  command?: 'alert' | 'error' | 'loadContest' | 'loadProblem' | 'openBrowser' | 'translate' | 'setApiKey' | 'setCookie' | 'getCookie' | 'loginRequired' | 'registerContest' | 'copyMarkdown' | 'sendCph' | 'fetchSubmitPage' | 'submitCode' | 'fetchSubmissionHistory' | 'fetchStandings' | 'getContests' | 'addContest' | 'removeContest' | 'openContest';
  statusMessage?: string;
  text?: string;
  success?: boolean;
  message?: string;
  contest?: string;
  task?: string;
  taskScreenName?: string;
  languageId?: string;
  sourceCode?: string;
  payload?: Record<string, string>;
  url?: string;
  targetLang?: string;
  translationMode?: "api" | "free";
  translated?: Record<string, string>;
  tasks?: Array<{ label: string; value: string; url: string; status?: string }>;
  problem?: ContestProblem;
  hasCookie?: boolean;
  masked?: string;
  signed?: boolean;
  registrationMessage?: string;
  rated?: boolean;
  Rated?: boolean;
  submitTasks?: Array<{ value: string; label: string }>;
  languages?: Array<{ id: string; label: string }>;
  csrfToken?: string;
  submitResult?: SubmitResult;
  statuses?: Record<string, string>;
  submissions?: SubmissionRecord[];
  contests?: string[];
  standings?: Standing[];
}

export interface VSCodeAPI {
  postMessage: (message: WebviewMessage) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
    __ATCODER_MODE__?: "editor" | "sidebar" | "contest";
    __ATCODER_INIT_CONTEST__?: string;
  }
}

export { };
