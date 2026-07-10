export interface WebviewMessage {
  type?: string;
  command?: 'alert' | 'error' | 'loadContest' | 'loadProblem' | 'openBrowser';
  text?: string;
  contest?: string;
  task?: string;
  payload?: any;
  url?: string;
  tasks?: Array<{ label: string; value: string; url: string }>;
  problem?: any;
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
