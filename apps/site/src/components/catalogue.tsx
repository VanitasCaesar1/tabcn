'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { isStyle, legacyGroup, type SiteGroupId, type StyleId } from '@/lib/groups';
import { setParam, useParam } from './catalogue-url';
import { CUT_IN_MS, CUT_OUT_MS, SPRING_MS, TIMING_MS } from './motion';
import { useCut } from './use-cut';
import { suspendLoops } from './use-loop-player';

type Entry = {
  id: string;
  title: string;
  description: string;
  layoutLabel: string;
  group: SiteGroupId;
  style: StyleId;
  styleLabel: string;
  /** The gallery section it sits in when nothing is filtered (its style). */
  section: string;
};
type Option<T extends string> = { id: T; label: string };
type Section = { id: string; label: string; note: string };
type StyleFilter = StyleId | 'all';
type LayoutFilter = SiteGroupId | 'all';
type View = 'grid' | 'list';
type State = { style: StyleFilter; layout: LayoutFilter; view: View; q: string };

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

const stateKey = (s: State) => `${s.style}|${s.layout}|${s.view}|${s.q}`;

const plural = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`;

// The gallery: style chips (the main filter), a quieter layout filter under them, a search field
// and a grid/list switch over the server-rendered cards and rows it's given, so the index keeps its
// static HTML. Style lives in ?s=, layout in ?c= (so the old group links still land), view in
// ?view=list. Every change is a cut: the results fade out, swap while hidden and fade back in.
// (Filtering from ui lab's lab search, MIT.)
export function Catalogue({
  titleId,
  entries,
  styles,
  layouts,
  sections,
  cards,
  rows,
}: {
  /** The heading's id, which the section is labelled by. */
  titleId: string;
  entries: Entry[];
  styles: Option<StyleId>[];
  layouts: Option<SiteGroupId>[];
  /** The headed sections of the unfiltered grid, in order. */
  sections: Section[];
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

  const sParam = useParam('s');
  const cParam = useParam('c');
  // ?c= once named layout groups only; a style there (a hand-made link) is read as a style.
  const style: StyleFilter = isStyle(sParam) ? sParam : isStyle(cParam) ? cParam : 'all';
  const layout: LayoutFilter = legacyGroup(cParam) ?? 'all';
  const viewParam = useParam('view');
  const view: View = viewParam === 'list' || viewParam === 'rows' ? 'list' : 'grid';

  const { shown, hidden } = useCut<State>({ style, layout, view, q: applied }, stateKey, {
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

  // The bar draws its background and hairline once it's stuck under the header. Read on scroll
  // (once a frame) rather than with an IntersectionObserver, which misses a jump that carries the
  // marker from below the window to above it in one step.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = sentinel.current;
      if (!el) return;
      const now = el.getBoundingClientRect().top < HEADER_PX + 1;
      if (now === stuckNow.current) return;
      stuckNow.current = now;
      setStuck(now);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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
    return entries.map(({ title, description, layoutLabel, styleLabel, id }) => {
      const haystack = `${title} ${id} ${description} ${layoutLabel} ${styleLabel}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  };

  // The chips and the live count follow what was typed; the results follow the cut.
  const matchesNow = matcher(applied);
  const fits = (e: Entry, s: StyleFilter, l: LayoutFilter) =>
    (s === 'all' || e.style === s) && (l === 'all' || e.group === l);
  const styleCount = (s: StyleFilter) =>
    entries.filter((e, i) => matchesNow[i] && fits(e, s, layout)).length;
  const layoutCount = (l: LayoutFilter) =>
    entries.filter((e, i) => matchesNow[i] && fits(e, style, l)).length;
  const liveCount = styleCount(style);
  const filtered = style !== 'all' || layout !== 'all' || applied.trim() !== '';

  const matchesShown = shown.q === applied ? matchesNow : matcher(shown.q);
  const visible = entries.map((e, i) => matchesShown[i] && fits(e, shown.style, shown.layout));
  const shownCount = visible.filter(Boolean).length;
  const grouped = shown.style === 'all' && shown.layout === 'all';
  // A filter with nothing left but matches elsewhere goes back to all; a search with none clears.
  const matchesElsewhere =
    (shown.style !== 'all' || shown.layout !== 'all') && matchesShown.some(Boolean);
  const emptyExit = matchesElsewhere
    ? { label: 'Show every design', clearQuery: false }
    : shown.q.trim()
      ? { label: 'Clear the search', clearQuery: true }
      : null;
  const inSection = (id: string) =>
    entries.flatMap((e, i) => (e.section === id && visible[i] ? [i] : []));

  const pickStyle = (id: StyleFilter) => {
    pressed.current = true;
    // A style link written as ?c=glass becomes ?s=glass, so ?c= is left to the layout.
    if (isStyle(cParam)) setParam('c', null);
    setParam('s', id === 'all' ? null : id);
  };
  const pickLayout = (id: LayoutFilter) => {
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
    if (style !== 'all' || isStyle(cParam)) setParam('s', null);
    if (cParam) setParam('c', null);
    fields.current.find((f) => f && f.offsetParent !== null)?.focus();
  };

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
  const styleOptions: Option<StyleFilter>[] = [{ id: 'all', label: 'All' }, ...styles];
  const layoutOptions: Option<LayoutFilter>[] = [{ id: 'all', label: 'Any' }, ...layouts];

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
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="flex items-baseline gap-2.5">
          <span id={titleId} className="font-semibold text-[28px] tracking-[-0.02em]">
            Designs
          </span>
          <span className="text-[15px] text-muted tabular-nums">
            {filtered ? `${liveCount} of ${entries.length}` : entries.length}
          </span>
        </h2>
      </div>

      {/* Narrow columns: the field and the view switch sit above the chips and scroll away. */}
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
          <ChipGroup
            legend="Style"
            name="catalogue-style"
            options={styleOptions}
            value={style}
            count={styleCount}
            onChange={pickStyle}
          />
          <div className="hidden shrink-0 items-center gap-2 @min-[880px]/cat:flex">
            {field(1)}
            {switcher(1)}
          </div>
        </div>
      </div>

      <fieldset className="mt-1 flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <legend className="sr-only">Layout</legend>
        <span aria-hidden className="mr-1.5 shrink-0 text-[13px] text-muted">
          Layout
        </span>
        {layoutOptions.map((o) => {
          const on = o.id === layout;
          const n = layoutCount(o.id);
          return (
            <label
              key={o.id}
              className={cn(
                'relative flex h-8 shrink-0 cursor-pointer touch-manipulation select-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-[color,background-color] duration-150 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid has-[input:focus-visible]:-outline-offset-2 motion-reduce:transition-none',
                on ? 'bg-cell text-foreground' : 'text-muted hover:text-foreground',
                n === 0 && !on && 'opacity-45',
              )}
            >
              <input
                type="radio"
                name="catalogue-layout"
                value={o.id}
                checked={on}
                onChange={() => pickLayout(o.id)}
                aria-label={`${o.id === 'all' ? 'Any layout' : o.label}, ${plural(n)}`}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </fieldset>

      <p className="sr-only" aria-live="polite">
        {`${liveCount} of ${plural(entries.length)}`}
      </p>

      <div className="cat-results mt-6" data-cut={hidden ? '' : undefined}>
        {shownCount === 0 ? (
          <p className="rounded-2xl border border-card-border bg-card py-16 text-center text-muted text-sm">
            {shown.q.trim() ? (
              <>Nothing matches &ldquo;{shown.q.trim()}&rdquo;</>
            ) : (
              'No design has both of these'
            )}
            .
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
          grouped ? (
            sections.map((s) => {
              const items = inSection(s.id);
              if (items.length === 0) return null;
              return (
                <div key={s.id} className="cat-block">
                  <h3 className="mb-4 flex min-w-0 items-baseline gap-2">
                    <span className="font-medium text-[17px] tracking-[-0.01em]">{s.label}</span>
                    <span className="text-[14px] text-muted tabular-nums">{items.length}</span>
                    <span className="hidden min-w-0 truncate pl-2 text-[14px] text-muted sm:inline">
                      {s.note}
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
          <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
            {grouped ? (
              sections.map((s) => {
                const items = inSection(s.id);
                if (items.length === 0) return null;
                return (
                  <div key={s.id}>
                    <h3 className="flex items-baseline gap-2 border-card-border border-b px-4 pt-5 pb-2.5 font-medium text-[13px]">
                      {s.label}
                      <span className="font-normal text-muted tabular-nums">{items.length}</span>
                    </h3>
                    <ul className="divide-y divide-[var(--card-border)] border-card-border border-b">
                      {items.map((i) => rows[i])}
                    </ul>
                  </div>
                );
              })
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {rows.filter((_, i) => visible[i])}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-4 @min-[560px]/cat:grid-cols-2 @min-[880px]/cat:grid-cols-3">
      {children}
    </ul>
  );
}

// The style chips: radio buttons drawn as chips, each with its count for the current search and
// layout. On narrow screens the row scrolls sideways.
function ChipGroup<T extends string>({
  legend,
  name,
  options,
  value,
  count,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  count: (id: T) => number;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="-my-1 flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => {
        const on = o.id === value;
        const n = count(o.id);
        return (
          <label
            key={o.id}
            className={cn(
              'relative flex h-9 shrink-0 cursor-pointer touch-manipulation select-none items-center gap-2 rounded-[10px] px-3.5 font-medium text-[13px] transition-[color,background-color,box-shadow] duration-150 ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-offset-2 motion-reduce:transition-none',
              on
                ? 'bg-foreground text-background'
                : 'bg-card text-muted shadow-[inset_0_0_0_1px_var(--card-border)] hover:text-foreground hover:shadow-[inset_0_0_0_1px_var(--card-border-hover)]',
              n === 0 && !on && 'opacity-45',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={on}
              onChange={() => onChange(o.id)}
              aria-label={`${o.label}, ${plural(n)}`}
              className="sr-only"
            />
            {o.label}
            <span
              aria-hidden
              className={cn('tabular-nums', on ? 'text-background/60' : 'text-muted/70')}
            >
              {n}
            </span>
          </label>
        );
      })}
    </fieldset>
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
        placeholder="Search designs"
        aria-label="Search designs"
        aria-keyshortcuts="/"
        spellCheck={false}
        autoComplete="off"
        // 16px on phones: iOS zooms into any smaller input it focuses.
        className="h-9 w-full rounded-[10px] bg-card pr-3 pl-9 text-base text-foreground shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden placeholder:text-muted focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 sm:pr-9 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      {!value && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-[5px] px-1 font-mono text-[11px] text-muted shadow-[inset_0_0_0_1px_var(--card-border)] sm:flex"
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
        className="relative grid h-9 w-[68px] grid-cols-2 rounded-[10px] bg-card p-0.5 shadow-[inset_0_0_0_1px_var(--card-border)]"
        style={
          {
            '--g': view === 'grid' ? 0 : 1,
            '--n': 2,
            '--pad': '2px',
            '--capsule-r': '8px',
          } as React.CSSProperties
        }
      >
        <span aria-hidden className="dock-capsule" />
        {options.map((o) => (
          <label
            key={o.id}
            title={o.label}
            className={cn(
              'seg relative grid size-8 cursor-pointer touch-manipulation place-items-center rounded-lg has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-foreground has-[input:focus-visible]:outline-solid has-[input:focus-visible]:-outline-offset-2',
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
