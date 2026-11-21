'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import type { DesignSummary } from '@/lib/designs';
import { designPath } from '@/lib/site';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { TIMING_EASE, TIMING_MS } from './motion';

// The ⌘K search from ui lab (https://lab.xevrion.dev, MIT, see LICENSE-ui-lab), over the designs.
// Each result shows a thumbnail of its bar on the demo colour.

const noop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);
const isClient = () => true;

// Every word must appear somewhere; titles that start with the query rank first, then titles
// containing it, then matches in the description or layout.
function search(items: DesignSummary[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const words = q.split(/\s+/);
  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const hay = `${title} ${item.id} ${item.description} ${item.layoutLabel}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return null;
      const rank = title.startsWith(q)
        ? 0
        : title.split(' ').some((w) => w.startsWith(words[0] ?? ''))
          ? 1
          : title.includes(q)
            ? 2
            : 3;
      return { item, rank };
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.rank - b.rank || a.item.title.localeCompare(b.item.title))
    .map((r) => r.item);
}

/** Anything can open the search by announcing this (the phone menu's search row does). */
const OPEN_EVENT = 'tabcn-open-search';

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const kbdClass =
  'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[5px] px-1 font-mono text-[11px] text-muted shadow-[inset_0_0_0_1px_var(--border)]';

/**
 * The header's search: a field-shaped button that opens the ⌘K dialog (an icon below 768 px).
 * `variant="row"` is the phone menu's full-width field, which asks the header's to open.
 */
export function HeaderSearch({
  items,
  variant = 'header',
  onOpen,
}: {
  items: DesignSummary[];
  variant?: 'header' | 'row';
  /** Called as the row asks the dialog to open (the menu closes itself). */
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // The server can't know the platform, so the shortcut appears once it's known.
  const mac = useSyncExternalStore(noop, isMac, () => null);
  const trigger = useRef<HTMLButtonElement>(null);
  const header = variant === 'header';

  // ⌘K / Ctrl K from any page toggles it; the menu's row asks for it with OPEN_EVENT.
  useEffect(() => {
    if (!header) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey)) return;
      if (e.defaultPrevented) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, [header]);

  const shortcut = mac === null ? null : mac ? '⌘K' : 'Ctrl K';

  if (!header) {
    return (
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          openSearch();
        }}
        aria-haspopup="dialog"
        className="flex h-10 w-full items-center gap-2 rounded-full bg-surface px-3.5 text-[14px] text-muted shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[color,background-color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 motion-reduce:transition-none"
      >
        <SearchIcon />
        <span className="flex-1 text-left">Search {items.length} designs</span>
      </button>
    );
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-9 shrink-0 items-center gap-2 rounded-full text-[13px] text-muted outline-hidden transition-[color,background-color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 max-md:w-9 max-md:justify-center max-md:hover:bg-surface md:w-48 md:bg-surface md:pr-2 md:pl-3 md:shadow-[inset_0_0_0_1px_var(--border)] lg:w-[232px] motion-reduce:transition-none"
      >
        <SearchIcon />
        <span className="sr-only md:hidden">Search designs</span>
        <span className="hidden flex-1 text-left md:inline lg:hidden">Search</span>
        <span className="hidden flex-1 text-left lg:inline">Search {items.length} designs</span>
        <kbd aria-hidden className={cn(kbdClass, 'max-md:hidden', !shortcut && 'invisible')}>
          {shortcut ?? '⌘K'}
        </kbd>
      </button>
      <SearchDialog
        items={items}
        open={open}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }}
      />
    </>
  );
}

function SearchDialog({
  items,
  open,
  onClose,
}: {
  items: DesignSummary[];
  open: boolean;
  onClose: () => void;
}) {
  const client = useSyncExternalStore(noop, isClient, () => false);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // The page behind stays put while the dialog is up.
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  const results = search(items, query);
  const current = Math.min(active, Math.max(0, results.length - 1));

  // The highlighted row stays in view as the arrows walk the list.
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };

  const go = (designId: string) => {
    close();
    router.push(designPath(designId));
  };

  const t = reduceMotion ? { duration: 0 } : { duration: TIMING_MS / 1000, ease: TIMING_EASE };

  if (!client) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[min(14vh,120px)] sm:px-6">
          <motion.div
            aria-hidden
            onClick={close}
            className="absolute inset-0 bg-foreground/15 dark:bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.12 } }}
            transition={t}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search designs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.12 } }}
            transition={t}
            className="relative flex max-h-[min(560px,72dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-background shadow-[0_0_0_1px_var(--border),0_24px_60px_-12px_oklch(0_0_0/0.35)]"
          >
            <div className="flex h-14 shrink-0 items-center gap-3 border-border border-b px-4">
              <span className="text-muted">
                <SearchIcon />
              </span>
              <input
                // biome-ignore lint/a11y/noAutofocus: the dialog exists to type into this field.
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={results.length ? `${id}-${current}` : undefined}
                aria-autocomplete="list"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const step = e.key === 'ArrowDown' ? 1 : -1;
                    const n = results.length;
                    if (n) setActive((current + step + n) % n);
                  } else if (e.key === 'Enter' && results[current]) {
                    e.preventDefault();
                    go(results[current].id);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                  } else if (e.key === 'Tab') {
                    // Only the field takes focus; the rows follow the arrows.
                    e.preventDefault();
                  }
                }}
                placeholder="Search designs"
                spellCheck={false}
                autoComplete="off"
                // 16px on phones: iOS zooms into any smaller input it focuses.
                className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-muted sm:text-[15px]"
              />
              <kbd className="hidden h-6 items-center rounded-full px-2 font-medium font-sans text-[11px] text-muted shadow-[inset_0_0_0_1px_var(--border)] sm:flex">
                Esc
              </kbd>
            </div>

            <div className="min-h-0 shrink overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
              {!query.trim() && (
                <p className="px-3 pt-1 pb-2 font-medium text-[12px] text-muted">All designs</p>
              )}
              <div ref={list} id={`${id}-list`} role="listbox" aria-label="Results">
                {results.map((item, i) => (
                  <div
                    key={item.id}
                    id={`${id}-${i}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === current}
                    data-index={i}
                  >
                    <Link
                      href={designPath(item.id)}
                      tabIndex={-1}
                      onClick={(e) => {
                        // Plain clicks close the dialog; modified clicks (new tab) leave it open.
                        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                        close();
                      }}
                      onPointerMove={() => i !== current && setActive(i)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 outline-hidden transition-[background-color] duration-100',
                        i === current && 'bg-surface',
                      )}
                    >
                      <span
                        aria-hidden
                        className="relative h-[22px] w-16 shrink-0 overflow-hidden rounded-[5px] shadow-[0_0_0_1px_var(--tile-ring)]"
                        style={{ backgroundColor: item.background }}
                      >
                        {item.thumb && (
                          // biome-ignore lint/performance/noImgElement: a static export of tiny, pre-sized JPGs.
                          <img
                            src={item.thumb}
                            alt=""
                            width={138}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-[14px] text-foreground">
                          {item.title}
                        </span>
                        <span className="block truncate text-[13px] text-muted">
                          {item.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">{item.layoutLabel}</span>
                    </Link>
                  </div>
                ))}
              </div>
              {query.trim() && results.length === 0 && (
                <p className="px-3 py-10 text-center text-[14px] text-muted">
                  Nothing matches &ldquo;{query.trim()}&rdquo;
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3 3" />
    </svg>
  );
}
