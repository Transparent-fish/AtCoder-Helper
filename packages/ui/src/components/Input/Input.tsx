import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-vscode-input-background text-vscode-input-foreground border rounded px-3 py-2
          border-[var(--vscode-input-border,#6e7681)]
          shadow-[inset_0_0_0_1px_var(--vscode-input-border,#6e7681)]
          placeholder-vscode-input-placeholder
          focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder,#007fd4)] focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
