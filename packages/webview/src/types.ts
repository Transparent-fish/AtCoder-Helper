export interface WebviewMessage {
  type?: string;
  command?: 'alert' | 'error' | 'loadContest' | 'loadProblem' | 'openBrowser' | 'translate' | 'setApiKey' | 'setCookie' | 'getCookie' | 'loginRequired' | 'registerContest' | 'copyMarkdown';
  statusMessage?: string;
  text?: string;
  contest?: string;
  task?: string;
  payload?: any;
  url?: string;
  targetLang?: string;
  translated?: Record<string, string>;
  tasks?: Array<{ label: string; value: string; url: string }>;
  problem?: any;
  hasCookie?: boolean;
  masked?: string;
  signed?: boolean;
  registrationMessage?: string;
  rated?: boolean;
  Rated?: boolean;
}

export interface VSCodeAPI {
  postMessage: (message: WebviewMessage) => void;
  setState: (state: any) => void;
  getState: () => any;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
  }
}

export { };
