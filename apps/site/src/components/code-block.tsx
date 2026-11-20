import { CopyButton } from './copy-button';

// A small TSX highlighter for the snippets on this site: comments, strings, keywords and JSX
// tag names. Enough for a dozen lines of layout code, with no runtime cost.
const TOKEN =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*')|\b(import|from|export|default|function|return|const|type)\b|(<\/?)([A-Z][\w.]*)/g;

function highlight(code: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(code.slice(last, start));
    const [text, comment, string, keyword, bracket, tag] = m;
    if (comment) {
      out.push(
        <span key={key++} className="text-muted">
          {comment}
        </span>,
      );
    } else if (string) {
      out.push(
        <span key={key++} className="text-code-string">
          {string}
        </span>,
      );
    } else if (keyword) {
      out.push(
        <span key={key++} className="text-code-keyword">
          {keyword}
        </span>,
      );
    } else if (tag) {
      out.push(bracket);
      out.push(
        <span key={key++} className="text-code-tag">
          {tag}
        </span>,
      );
    } else {
      out.push(text);
    }
    last = start + text.length;
  }
  out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, filename }: { code: string; filename: string }) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-surface shadow-raised">
      <div className="flex h-11 items-center justify-between gap-3 border-border border-b pr-1.5 pl-4">
        <span className="truncate font-mono text-[12px] text-muted">{filename}</span>
        <CopyButton value={code} label={`Copy ${filename}`} className="shrink-0" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.7] [scrollbar-width:thin]">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
