'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { legacyGroup, type SiteGroupId } from '@/lib/groups';
import { setParam, useParam } from './catalogue-url';
import { LayoutIcon } from './layout-icons';
import { CUT_IN_MS, CUT_OUT_MS, SPRING_MS, TIMING_MS } from './motion';
import { useCut } from './use-cut';
import { suspendLoops } from './use-loop-player';

type Entry = {
  id: string;
  title: string;
  description: string;
  layoutLabel: string;
  group: SiteGroupId;
};
type Group = { id: SiteGroupId; label: string; note: string; count: number };
type Filter = SiteGroupId | 'all';
type View = 'grid' | 'list';
type State = { group: Filter; view: View; q: string };

/** Search keystrokes settle this long before the results change. */
const SEARCH_DEBOUNCE_MS = 120;

/** The header's height: the filter bar sticks under it. */
const HEADER_PX = 56;

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

const stateKey = (s: State) => `${s.group}|${s.view}|${s.q}`;

const plural = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`;

// The home page's "All designs": a group dock, a filter field and a grid/list switch over the
// server-rendered cards and rows it's given, so the index keeps its static HTML. Every change of
// group, view or search is a cut: the results fade out, swap while hidden and fade back in.
// (Filtering from ui lab's lab search, MIT.)
export function Catalogue({
  titleId,
  entries,
  groups,
  cards,
  rows,
}: {
  /** The heading's id, which the section is labelled by. */
  titleId: string;
  entries: Entry[];
  groups: Group[];
  /** One grid card per entry, in the same order. */
  cards: React.ReactNode[];
  /** One list row per entry, in the same order. */
  rows: React.ReactNode[];
}) {
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [stuck, setStuck] = useState(false);
  // The same, without waiting for a render: an immediate swap reads it after the new results are
  // in, when a shorter page may already have moved the bar.
  const stuckNow = useRef(false);
  const fields = useRef<(HTMLInputElement | null)[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const pressed = useRef(false);

  const group: Filter = legacyGroup(useParam('c')) ?? 'all';
  const viewParam = useParam('view');
  const view: View = viewParam === 'list' || viewParam === 'rows' ? 'list' : 'grid';

  const { shown, hidden } = useCut<State>({ group, view, q: applied }, stateKey, {
    // Only changes someone asked for cut; the URL read after hydration swaps at once.
    animate: () => pressed.current,
    // With the bar stuck, the reader goes back to the section's top, under reduced motion too.
    onSwap: () => {
      const section = sentinel.current?.closest('section');
      if (!section || !sentinel.current) return;
      if (!stuckNow.current && sentinel.current.getBoundingClientRect().top >= HEADER_PX) return;
      const top = section.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'instant' });
    },
  });

  // Nothing plays while the results swap, nor until they're back.
  useEffect(() => {
    if (hidden) {
      suspendLoops(true);
      return;
    }
    const timer = window.setTimeout(() => suspendLoops(false), CUT_IN_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  // Leaving mid-cut (a card opened right after a filter change) must not keep every loop stopped.
  useEffect(() => () => suspendLoops(false), []);

  useEffect(() => {
    if (query === applied) return;
    const timer = window.setTimeout(() => setApplied(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, applied]);

  // The bar draws its background and hairline once it's stuck under the header.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        stuckNow.current =
          !!entry && !entry.isIntersecting && entry.boundingClientRect.top < HEADER_PX + 1;
        setStuck(stuckNow.current);
      },
      { rootMargin: `-${HEADER_PX + 1}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // "/" focuses the filter field from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;
      const field = fields.current.find((f) => f && f.offsetParent !== null);
      if (!field) return;
      e.preventDefault();
      field.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const matcher = (q: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.map(({ title, description, layoutLabel, id }) => {
      const haystack = `${title} ${id} ${description} ${layoutLabel}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  };

  // The dock and the live count follow what was typed; the results follow the cut.
  const matchesNow = matcher(applied);
  const countFor = (id: Filter) =>
    entries.filter((e, i) => matchesNow[i] && (id === 'all' || e.group === id)).length;
  const liveCount = countFor(group);
  const filtered = group !== 'all' || applied.trim() !== '';

  const matchesShown = shown.q === applied ? matchesNow : matcher(shown.q);
  const visible = entries.map(
    (e, i) => matchesShown[i] && (shown.group === 'all' || e.group === shown.group),
  );
  const shownCount = visible.filter(Boolean).length;
  // An empty group with matches elsewhere goes back to All; a search with none anywhere clears.
  const matchesElsewhere = shown.group !== 'all' && matchesShown.some(Boolean);
  const emptyExit = matchesElsewhere
    ? { label: 'Show every design', clearQuery: false }
    : shown.q.trim()
      ? { label: 'Clear the filter', clearQuery: true }
      : null;
  const inGroup = (id: SiteGroupId) =>
    entries.flatMap((e, i) => (e.group === id && visible[i] ? [i] : []));

  const pick = (id: Filter) => {
    pressed.current = true;
    setParam('c', id === 'all' ? null : id);
  };
  const pickView = (v: View) => {
    pressed.current = true;
    setParam('view', v === 'list' ? 'list' : null);
  };
  const type = (value: string) => {
    pressed.current = true;
    setQuery(value);
  };
  // The empty state's way out. Its button goes with the results, so focus moves to the field.
  const reset = (clearQuery: boolean) => {
    pressed.current = true;
    if (clearQuery) {
      setQuery('');
      setApplied('');
    }
    if (group !== 'all') setParam('c', null);
    fields.current.find((f) => f && f.offsetParent !== null)?.focus();
  };

  const segments: { id: Filter; label: string }[] = [{ id: 'all', label: 'All' }, ...groups];
  const field = (slot: number) => (
    <FilterField
      inputRef={(el) => {
        fields.current[slot] = el;
      }}
      value={query}
      onChange={type}
    />
  );
  // Two copies (one per placement, only one shown), so each needs its own radio group.
  const switcher = (slot: number) => (
    <ViewSwitch name={`catalogue-view-${slot}`} view={view} onChange={pickView} />
  );

  return (
    <div
      style={
        {
          '--spring-ms': `${SPRING_MS}ms`,
          '--timing-ms': `${TIMING_MS}ms`,
          '--cut-out-ms': `${CUT_OUT_MS}ms`,
          '--cut-in-ms': `${CUT_IN_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div className="mb-4">
        <h2 className="flex items-baseline gap-2 text-balance">
          <span id={titleId} className="font-medium text-[15px]">
            All designs
          </span>
          <span className="text-[13px] text-muted tabular-nums">
            {filtered ? `${liveCount} of ${entries.length}` : entries.length}
          </span>
        </h2>
        <p className="mt-1 max-w-xl text-pretty text-muted text-sm">Open a design to install it.</p>
      </div>

      {/* Narrow columns: the field and the view switch sit above the bar and scroll away. */}
      <div className="mb-2 flex items-center gap-2 @min-[880px]/cat:hidden">
        {field(0)}
        {switcher(0)}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className="sticky-filter sticky top-14 z-20 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6"
        data-stuck={stuck ? '' : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          {/* The fieldset only groups the radios; the track inside it is the grid, which keeps
              every browser's fieldset quirks out of the layout. */}
          <fieldset className="w-[min(100%,600px)] min-w-0">
            <legend className="sr-only">Show</legend>
            <div
              className="relative grid h-12 grid-cols-6 rounded-full bg-surface p-1 shadow-raised sm:h-10"
              style={
                {
                  '--g': Math.max(
                    0,
                    segments.findIndex((s) => s.id === group),
                  ),
                  '--n': segments.length,
                } as React.CSSProperties
              }
            >
              <span aria-hidden className="dock-capsule filter-capsule" />
              {segments.map((s) => {
                const on = s.id === group;
                const n = countFor(s.id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      'seg relative flex min-w-0 cursor-pointer touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-full has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid has-[input:focus-visible]:-outline-offset-2 sm:flex-row sm:gap-1.5',
                      on ? 'text-foreground' : 'text-muted hover:text-foreground',
                      n === 0 && !on && 'opacity-45',
                    )}
                  >
                    <input
                      type="radio"
                      name="catalogue-group"
                      value={s.id}
                      checked={on}
                      onChange={() => pick(s.id)}
                      aria-label={`${s.label}, ${plural(n)}`}
                      className="sr-only"
                    />
                    <LayoutIcon group={s.id} className="size-4 shrink-0" />
                    <span className="max-w-full truncate font-medium text-[11px] leading-none sm:text-[13px]">
                      {s.label}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'hidden text-[13px] tabular-nums leading-none sm:inline',
                        on ? 'text-foreground/60' : 'text-muted',
                      )}
                    >
                      {n}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="hidden items-center gap-2 @min-[880px]/cat:flex">
            {field(1)}
            {switcher(1)}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {`${liveCount} of ${plural(entries.length)}`}
      </p>

      <div className="cat-results mt-4" data-cut={hidden ? '' : undefined}>
        {shownCount === 0 ? (
          <p className="py-16 text-center text-muted text-sm">
            {shown.q.trim() ? (
              <>Nothing matches &ldquo;{shown.q.trim()}&rdquo;</>
            ) : (
              'Nothing here yet'
            )}
            {shown.group !== 'all' && <> in {groups.find((g) => g.id === shown.group)?.label}</>}.
            {emptyExit && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => reset(emptyExit.clearQuery)}
                  className="rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-2 outline-hidden hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
                >
                  {emptyExit.label}
                </button>
              </>
            )}
          </p>
        ) : shown.view === 'grid' ? (
          shown.group === 'all' ? (
            groups.map((g) => {
              const items = inGroup(g.id);
              if (items.length === 0) return null;
              return (
                <div key={g.id} className="cat-block">
                  <h3 className="mb-3 flex min-w-0 items-baseline gap-2 text-[13px]">
                    <LayoutIcon group={g.id} className="size-4 shrink-0 self-center text-muted" />
                    <span className="font-medium text-foreground">{g.label}</span>
                    <span className="text-muted tabular-nums">{items.length}</span>
                    <span className="hidden min-w-0 truncate text-pretty text-muted sm:inline">
                      {g.note}
                    </span>
                  </h3>
                  <Grid>{items.map((i) => cards[i])}</Grid>
                </div>
              );
            })
          ) : (
            <Grid>{cards.filter((_, i) => visible[i])}</Grid>
          )
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[18px] bg-background shadow-raised">
            {shown.group === 'all' ? (
              groups.map((g) => {
                const items = inGroup(g.id);
                if (items.length === 0) return null;
                return (
                  <div key={g.id} className="divide-y divide-border">
                    <h3 className="flex items-baseline gap-2 bg-surface px-2.5 pt-4 pb-2 font-medium text-[13px]">
                      {g.label}
                      <span className="font-normal text-muted tabular-nums">{items.length}</span>
                    </h3>
                    <ul className="divide-y divide-border">{items.map((i) => rows[i])}</ul>
                  </div>
                );
              })
            ) : (
              <ul className="divide-y divide-border">{rows.filter((_, i) => visible[i])}</ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-3 @min-[560px]/cat:grid-cols-2 @min-[880px]/cat:grid-cols-3">
      {children}
    </ul>
  );
}

function FilterField({
  inputRef,
  value,
  onChange,
}: {
  inputRef: (el: HTMLInputElement | null) => void;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 @min-[880px]/cat:w-56 @min-[880px]/cat:flex-none sm:max-w-56">
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          if (value) onChange('');
          else e.currentTarget.blur();
        }}
        placeholder="Filter designs"
        aria-label="Filter designs"
        aria-keyshortcuts="/"
        spellCheck={false}
        autoComplete="off"
        // 16px on phones: iOS zooms into any smaller input it focuses.
        className="h-9 w-full rounded-full bg-surface pr-3 pl-9 text-base text-foreground shadow-raised outline-hidden placeholder:text-muted focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 sm:pr-9 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      {!value && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-[5px] shadow-[inset_0_0_0_1px_var(--border)] px-1 font-mono text-[11px] text-muted sm:flex"
        >
          /
        </kbd>
      )}
    </div>
  );
}

function ViewSwitch({
  name,
  view,
  onChange,
}: {
  name: string;
  view: View;
  onChange: (view: View) => void;
}) {
  const options: { id: View; label: string; icon: React.ReactNode }[] = [
    {
      id: 'grid',
      label: 'Grid',
      icon: (
        <>
          <rect x="2.5" y="2.5" width="4.75" height="4.75" rx="1" />
          <rect x="8.75" y="2.5" width="4.75" height="4.75" rx="1" />
          <rect x="2.5" y="8.75" width="4.75" height="4.75" rx="1" />
          <rect x="8.75" y="8.75" width="4.75" height="4.75" rx="1" />
        </>
      ),
    },
    {
      id: 'list',
      label: 'List',
      icon: (
        <>
          <rect x="2" y="3" width="12" height="4" rx="1.25" />
          <rect x="2" y="9" width="12" height="4" rx="1.25" />
        </>
      ),
    },
  ];
  return (
    <fieldset className="min-w-0 shrink-0">
      <legend className="sr-only">View</legend>
      <div
        className="relative grid h-9 w-[68px] grid-cols-2 rounded-full bg-surface p-0.5 shadow-raised"
        style={{ '--g': view === 'grid' ? 0 : 1, '--n': 2, '--pad': '2px' } as React.CSSProperties}
      >
        <span aria-hidden className="dock-capsule filter-capsule" />
        {options.map((o) => (
          <label
            key={o.id}
            title={o.label}
            className={cn(
              'seg relative grid size-8 cursor-pointer touch-manipulation place-items-center rounded-full has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid has-[input:focus-visible]:-outline-offset-2',
              view === o.id ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={view === o.id}
              onChange={() => onChange(o.id)}
              className="sr-only"
            />
            <span className="sr-only">{o.label}</span>
            <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="currentColor">
              {o.icon}
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
