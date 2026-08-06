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

export interface HomepageContest {
  id: string;
  title: string;
  start: string;
  category: "active" | "upcoming" | "recent" | "daily";
}

export interface JudgeStatus {
  status: string;
  cnt: number;
}

export interface JudgeSet {
  name: string;
  score: string;
  maxScore: string;
  statuses: JudgeStatus[];
  caseName: string[];
  cases?: Array<{ name: string; status: string }>;
}

export interface SubmissionDetail {
  id: string;
  contest: string;
  task: string;
  taskScreenName: string;
  time: string;
  status: string;
  score: string;
  language: string;
  code: string;
  codeLength?: string;
  execTime?: string;
  memory?: string;
  judgeSets?: JudgeSet[];
}

export interface WebviewMessage {
  type?: string;
  command?: 'alert' | 'error' | 'loadContest' | 'loadProblem' | 'openBrowser' | 'translate' | 'setApiKey' | 'setCookie' | 'getCookie' | 'loginRequired' | 'registerContest' | 'copyMarkdown' | 'sendCph' | 'fetchSubmitPage' | 'submitCode' | 'fetchSubmissionHistory' | 'fetchSubmissionDetail' | 'openSubmission' | 'fetchStandings' | 'getContests' | 'openContest';
  statusMessage?: string;
  text?: string;
  success?: boolean;
  message?: string;
  contest?: string;
  task?: string;
  id?: string;
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
  announcement?: string;
  title?: string;
  submitTasks?: Array<{ value: string; label: string }>;
  languages?: Array<{ id: string; label: string }>;
  csrfToken?: string;
  submitResult?: SubmitResult;
  statuses?: Record<string, string>;
  submissions?: SubmissionRecord[];
  contests?: HomepageContest[];
  standings?: Standing[];
  submissionDetail?: SubmissionDetail;
}

export interface VSCodeAPI {
  postMessage: (message: WebviewMessage) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
    __ATCODER_MODE__?: "editor" | "sidebar" | "contest" | "submission";
    __ATCODER_INIT_CONTEST__?: string;
    __ATCODER_SUBMISSION_ID__?: string;
  }
}

export { };
