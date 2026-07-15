import React, { createContext, useContext, useState } from "react";
import type { VSCodeAPI, WebviewMessage } from "./types";

interface VSCodeContextType {
  postMessage: (message: WebviewMessage) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

const VSCodeContext = createContext<VSCodeContextType | null>(null);

export const useVSCode = () => {
  const context = useContext(VSCodeContext);
  if (!context) {
    throw new Error("useVSCode must be used within a VSCodeProvider");
  }
  return context;
};

interface VSCodeProviderProps {
  children: React.ReactNode;
}

let cachedApi: VSCodeAPI | null = null;

const mockVSCodeAPI = (): VSCodeAPI => ({
  postMessage: (message: WebviewMessage) => {
    console.log("Mock postMessage:", message);
  },
  setState: (state: unknown) => {
    console.log("Mock setState:", state);
  },
  getState: () => {
    console.log("Mock getState");
    return {};
  },
});

const getVSCodeAPI = (): VSCodeAPI => {
  try {
    if (typeof window.acquireVsCodeApi === 'function') {
      if (!cachedApi) {
        cachedApi = window.acquireVsCodeApi();
      }
      return cachedApi;
    }
  } catch (error) {
    console.warn('Failed to acquire VSCode API:', error);
  }
  return mockVSCodeAPI();
};

export const VSCodeProvider: React.FC<VSCodeProviderProps> = ({
  children,
}) => {
  const [vscode] = useState<VSCodeAPI>(getVSCodeAPI);

  return (
    <VSCodeContext.Provider value={vscode}>{children}</VSCodeContext.Provider>
  );
};
