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
}

export interface WebviewMessage {
  type?: string;
  command?: 'alert' | 'error' | 'loadContest' | 'loadProblem' | 'openBrowser' | 'translate' | 'setApiKey' | 'setCookie' | 'getCookie' | 'loginRequired' | 'registerContest' | 'copyMarkdown';
  statusMessage?: string;
  text?: string;
  contest?: string;
  task?: string;
  payload?: Record<string, string>;
  url?: string;
  targetLang?: string;
  translated?: Record<string, string>;
  tasks?: Array<{ label: string; value: string; url: string }>;
  problem?: ContestProblem;
  hasCookie?: boolean;
  masked?: string;
  signed?: boolean;
  registrationMessage?: string;
  rated?: boolean;
  Rated?: boolean;
}

export interface VSCodeAPI {
  postMessage: (message: WebviewMessage) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
  }
}

export { };
