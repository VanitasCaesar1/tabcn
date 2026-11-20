'use client';

import { Children, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

type Entry = { title: string; description: string; layout: string; layoutLabel: string };
type Category = { id: string; label: string };

// replaceState fires no event of its own, so picking a filter announces it.
const FILTER_EVENT = 'tabcn-filter';

function subscribeFilter(onChange: () => void) {
  window.addEventListener(FILTER_EVENT, onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener(FILTER_EVENT, onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

// Filters the server-rendered cards it's given rather than rendering its own, so the index keeps
// its static HTML. The layout filter lives in the URL (?c=), so a filtered view can be shared.
// (ui lab's lab search, MIT.)
export function DesignGrid({
  entries,
  categories,
  children,
}: {
  entries: Entry[];
  categories: readonly Category[];
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cards = Children.toArray(children);

  const fromUrl = useSyncExternalStore(
    subscribeFilter,
    () => new URLSearchParams(location.search).get('c') ?? 'all',
    () => 'all',
  );
  const category = categories.some((c) => c.id === fromUrl) ? fromUrl : 'all';

  const pick = (id: string) => {
    const url = new URL(location.href);
    if (id === 'all') url.searchParams.delete('c');
    else url.searchParams.set('c', id);
    history.replaceState(history.state, '', url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  };

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

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="shrink-0 text-muted text-sm tabular-nums" aria-live="polite">
          {filtered ? `${count} of ${entries.length}` : `${entries.length} designs`}
        </p>
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
                'flex h-8 shrink-0 touch-manipulation select-none items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium text-[13px] outline-hidden transition-[scale,background-color,color,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]',
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

      <div className="@container mt-4">
        <ul className="grid grid-cols-1 gap-3 @min-[600px]:grid-cols-2 @min-[1000px]:grid-cols-3">
          {cards.filter((_, i) => visible[i])}
        </ul>
      </div>

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
