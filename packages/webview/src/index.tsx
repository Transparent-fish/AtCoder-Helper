import React from "react";
import { createRoot } from "react-dom/client";
import { VSCodeProvider } from "./VSCodeProvider";
import { WebviewApp } from "./WebviewApp";
import "./styles.css";

// 初始化 React 应用
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <VSCodeProvider>
        <WebviewApp />
      </VSCodeProvider>
    </React.StrictMode>
  );
}
