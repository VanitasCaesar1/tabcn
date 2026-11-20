import type { ReactNode } from 'react';
import type { DesignProp, DesignProps } from '../../../../scripts/design-props';

// A design's props, read from its source at build time (scripts/design-props.ts), so the table
// can't drift from the code. Types are shown as written; the names the design file declares
// link to their line in "View source".

const CODE = 'font-mono text-[12.5px]';

/** Splits a type on the names the design file declares, linking each to its line. */
function typeWithLinks(prop: DesignProp, source: string) {
  if (!prop.refs.length) return prop.type;
  const lines = new Map(prop.refs.map((r) => [r.name, r.line]));
  const pattern = new RegExp(`\\b(${prop.refs.map((r) => r.name).join('|')})\\b`, 'g');
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of prop.type.matchAll(pattern)) {
    const start = m.index ?? 0;
    const name = m[1] as string;
    if (start > last) out.push(prop.type.slice(last, start));
    out.push(
      <a
        key={start}
        href={`${source}#L${lines.get(name)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-sm text-code-tag underline decoration-current/30 underline-offset-2 outline-hidden transition-[text-decoration-color] duration-150 ease-out hover:decoration-current focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
      >
        {name}
      </a>,
    );
    last = start + name.length;
  }
  out.push(prop.type.slice(last));
  return out;
}

/** Doc comment text, with `backticks` as inline code. */
function prose(text: string) {
  return text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string
      <code key={i} className={`${CODE} text-foreground`}>
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

export function PropsTable({ props, source }: { props: DesignProps; source: string }) {
  if (!props.props.length) return null;
  return (
    <div className="overflow-hidden rounded-[20px] bg-surface shadow-raised">
      {/* Column heads, on screens wide enough for columns. */}
      <div
        aria-hidden
        className="hidden h-11 items-center gap-4 border-border border-b px-4 text-[12px] text-muted sm:grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,9rem)]"
      >
        <span>Prop</span>
        <span>Type</span>
        <span>Default</span>
      </div>
      <dl className="divide-y divide-border">
        {props.props.map((prop) => (
          <div
            key={prop.name}
            className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 py-3.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,9rem)]"
          >
            <dt className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <code className={`${CODE} break-words font-medium text-foreground`}>{prop.name}</code>
              {!prop.optional && <span className="text-[11px] text-marker">required</span>}
            </dt>
            <dd className={`${CODE} min-w-0 break-words text-muted`}>
              <span className="sr-only">Type: </span>
              {typeWithLinks(prop, source)}
            </dd>
            <dd className={`${CODE} min-w-0 break-words text-muted`}>
              <span aria-hidden className="text-[12px] sm:hidden">
                Default{' '}
              </span>
              <span className="sr-only">Default: </span>
              {prop.default ?? (
                <>
                  <span aria-hidden>–</span>
                  <span className="sr-only">none</span>
                </>
              )}
            </dd>
            {prop.description && (
              <dd className="min-w-0 text-pretty text-[13.5px] text-muted leading-relaxed sm:col-span-3">
                {prose(prop.description)}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
