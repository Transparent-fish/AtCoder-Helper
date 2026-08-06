import React from "react";
import { createRoot } from "react-dom/client";
import { VSCodeProvider } from "./VSCodeProvider";
import { WebviewApp } from "./WebviewApp";
import { SidebarApp } from "./SidebarApp";
import { ContestApp } from "./ContestApp";
import { SubmissionDetailApp } from "./SubmissionDetailApp";
import "./styles.css";

const mode = window.__ATCODER_MODE__;

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <VSCodeProvider>
        {mode === "contest" ? (
          <ContestApp initContest={window.__ATCODER_INIT_CONTEST__} />
        ) : mode === "sidebar" ? (
          <SidebarApp />
        ) : mode === "submission" ? (
          <SubmissionDetailApp
            initContest={window.__ATCODER_INIT_CONTEST__}
            initSubmissionId={window.__ATCODER_SUBMISSION_ID__}
          />
        ) : (
          <WebviewApp />
        )}
      </VSCodeProvider>
    </React.StrictMode>
  );
}
