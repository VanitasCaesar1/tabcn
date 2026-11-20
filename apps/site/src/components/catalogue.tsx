'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

type Entry = { title: string; description: string; layout: string; layoutLabel: string };
type Category = { id: string; label: string };
type View = 'rows' | 'grid';

// replaceState fires no event of its own, so changing the URL announces it.
const URL_EVENT = 'tabcn-catalogue';

function subscribeUrl(onChange: () => void) {
  window.addEventListener(URL_EVENT, onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener(URL_EVENT, onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function useParam(key: string, fallback: string) {
  return useSyncExternalStore(
    subscribeUrl,
    () => new URLSearchParams(location.search).get(key) ?? fallback,
    () => fallback,
  );
}

function setParam(key: string, value: string | null) {
  const url = new URL(location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  history.replaceState(history.state, '', url);
  window.dispatchEvent(new Event(URL_EVENT));
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

const focusRing =
  'outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2';

// Search, layout filter and a row/grid switch over the server-rendered rows and cards it's given,
// so the index keeps its static HTML. The layout (?c=) and the view (?view=grid) live in the URL,
// so a filtered view can be shared. (Filtering from ui lab's lab search, MIT.)
export function Catalogue({
  entries,
  categories,
  rows,
  cards,
}: {
  entries: Entry[];
  categories: readonly Category[];
  /** One row-view item per entry, in the same order. */
  rows: React.ReactNode[];
  /** One grid-view card per entry, in the same order. */
  cards: React.ReactNode[];
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const fromUrl = useParam('c', 'all');
  const category = categories.some((c) => c.id === fromUrl) ? fromUrl : 'all';
  const view: View = useParam('view', 'rows') === 'grid' ? 'grid' : 'rows';

  // "/" focuses the search field from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = entries.map(({ title, description, layoutLabel }) => {
    const haystack = `${title} ${description} ${layoutLabel}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const visible = matches.map(
    (m, i) => m && (category === 'all' || entries[i]?.layout === category),
  );
  const count = visible.filter(Boolean).length;
  const counts = new Map<string, number>();
  entries.forEach((e, i) => {
    if (matches[i]) counts.set(e.layout, (counts.get(e.layout) ?? 0) + 1);
  });
  const all = matches.filter(Boolean).length;
  const filtered = words.length > 0 || category !== 'all';
  const pick = (id: string) => setParam('c', id === 'all' ? null : id);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="shrink-0 text-muted text-sm tabular-nums" aria-live="polite">
          {filtered ? `${count} of ${entries.length}` : `${entries.length} designs`}
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative w-full max-w-64">
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <circle cx="7" cy="7" r="4.25" />
              <path d="m10.25 10.25 3 3" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Escape') return;
                if (query) setQuery('');
                else e.currentTarget.blur();
              }}
              placeholder="Filter designs"
              aria-label="Filter designs"
              aria-keyshortcuts="/"
              spellCheck={false}
              autoComplete="off"
              className="h-9 w-full rounded-full bg-surface pr-3 pl-9 text-base text-foreground shadow-raised outline-hidden placeholder:text-muted focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 sm:pr-9 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {!query && (
              <kbd
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border border-border px-1 font-mono text-[11px] text-muted sm:flex"
              >
                /
              </kbd>
            )}
          </div>
          <fieldset
            aria-label="View"
            className="flex shrink-0 gap-0.5 rounded-full bg-surface p-0.5 shadow-raised"
          >
            <ViewButton label="Rows" on={view === 'rows'} onClick={() => setParam('view', null)}>
              <rect x="2" y="3" width="12" height="4" rx="1.25" />
              <rect x="2" y="9" width="12" height="4" rx="1.25" />
            </ViewButton>
            <ViewButton label="Grid" on={view === 'grid'} onClick={() => setParam('view', 'grid')}>
              <rect x="2.5" y="2.5" width="4.75" height="4.75" rx="1" />
              <rect x="8.75" y="2.5" width="4.75" height="4.75" rx="1" />
              <rect x="2.5" y="8.75" width="4.75" height="4.75" rx="1" />
              <rect x="8.75" y="8.75" width="4.75" height="4.75" rx="1" />
            </ViewButton>
          </fieldset>
        </div>
      </div>

      {/* Scrolls sideways on a phone instead of wrapping; the edges fade. */}
      <fieldset
        aria-label="Filter by layout"
        className="-mx-4 mt-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        {[{ id: 'all', label: 'All' }, ...categories].map((c) => {
          const n = c.id === 'all' ? all : (counts.get(c.id) ?? 0);
          const on = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => pick(c.id)}
              className={cn(
                'flex h-8 shrink-0 touch-manipulation select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium text-[13px] transition-[scale,background-color,color,opacity] duration-150 ease-out active:scale-[0.96]',
                focusRing,
                on
                  ? 'bg-foreground text-background'
                  : 'bg-surface text-foreground hover:bg-foreground/10',
                n === 0 && !on && 'opacity-45',
              )}
            >
              {c.label}
              <span className={cn('tabular-nums', on ? 'text-background/60' : 'text-muted')}>
                {n}
              </span>
            </button>
          );
        })}
      </fieldset>

      {view === 'rows' ? (
        <ul className="mt-4 flex flex-col gap-3">{rows.filter((_, i) => visible[i])}</ul>
      ) : (
        <div className="@container mt-4">
          <ul className="grid grid-cols-1 gap-3 @min-[600px]:grid-cols-2 @min-[1000px]:grid-cols-3">
            {cards.filter((_, i) => visible[i])}
          </ul>
        </div>
      )}

      {count === 0 && (
        <p className="py-16 text-center text-muted text-sm">
          {words.length ? <>Nothing matches &ldquo;{query.trim()}&rdquo;</> : 'Nothing here yet'}
          {category !== 'all' && (
            <>
              {' '}
              in {categories.find((c) => c.id === category)?.label}.{' '}
              <button
                type="button"
                onClick={() => pick('all')}
                className="rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-2 outline-hidden hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
              >
                Show every layout
              </button>
            </>
          )}
          {category === 'all' && '.'}
        </p>
      )}
    </>
  );
}

function ViewButton({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} view`}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      className={cn(
        'grid size-8 touch-manipulation place-items-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94]',
        focusRing,
        on ? 'bg-background text-foreground shadow-raised' : 'text-muted hover:text-foreground',
      )}
    >
      <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="currentColor">
        {children}
      </svg>
    </button>
  );
}
