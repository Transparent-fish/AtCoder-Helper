// VSCode 主题变量的默认值
export const defaultVSCodeTheme = {
  // 基础颜色
  'vscode-editor-background': '#1e1e1e',
  'vscode-editor-foreground': '#d4d4d4',
  'vscode-foreground': '#cccccc',
  
  // 按钮相关
  'vscode-button-background': '#0e639c',
  'vscode-button-foreground': '#ffffff',
  'vscode-button-hoverBackground': '#1177bb',
  'vscode-button-secondaryBackground': '#3a3d41',
  'vscode-button-secondaryHoverBackground': '#45494e',
  
  // 输入框相关
  'vscode-input-background': '#3c3c3c',
  'vscode-input-foreground': '#cccccc',
  'vscode-input-border': '#6e7681',
  'vscode-input-placeholderForeground': '#cccccc80',
  
  // 下拉框相关
  'vscode-dropdown-background': '#3c3c3c',
  'vscode-dropdown-foreground': '#f0f0f0',
  'vscode-dropdown-border': '#3c3c3c',
  
  // 其他
  'vscode-focusBorder': '#007fd4',
};

// 生成 CSS 变量
export const generateVSCodeThemeCSS = () => {
  const cssVariables = Object.entries(defaultVSCodeTheme)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n  ');

  return `:root {\n  ${cssVariables}\n}`;
};

// 检测是否在 VSCode 环境中
export const isInVSCode = () => {
  return typeof acquireVsCodeApi !== 'undefined';
};
