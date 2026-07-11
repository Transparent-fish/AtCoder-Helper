import React from "react";

interface HtmlContentProps {
  html: string;
  className?: string;
}

const HtmlContent: React.FC<HtmlContentProps> = ({ html, className = "" }) => {
  if (!html) return null;

  return (
    <div
      className={`html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const TranslatedBlock: React.FC<{ original: string; translation: string }> = ({
  original,
  translation,
}) => {
  if (!translation) return null;
  return (
    <div className="mt-1 pl-2 border-l-2 border-[var(--vscode-focusBorder)] opacity-90">
      <HtmlContent html={translation} />
    </div>
  );
};

export { HtmlContent, TranslatedBlock };
