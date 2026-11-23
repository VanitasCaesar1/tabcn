'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { STAR_FLOOR } from '@/lib/site';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { GitHubIcon } from './github-icon';
import { TIMING_EASE, TIMING_MS } from './motion';

// The repo's live star count. The page renders with the number saved at
// the last deploy (so first paint is never empty), then the browser asks
// GitHub for the current one and rolls the digits to it if it moved.
//
// Cached in localStorage for five minutes: GitHub allows 60 anonymous
// requests an hour per visitor, and clicking between pages shouldn't spend
// one each time. Offline, rate-limited or blocked, the saved number stays.
// Ported from ui lab (https://lab.xevrion.dev, MIT).

const STORAGE_KEY = 'tabcn-stars';
const STALE_MS = 5 * 60 * 1000;

type Cached = { count: number; fetchedAt: number };

function readCache(): Cached | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return typeof parsed?.count === 'number' && typeof parsed?.fetchedAt === 'number'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

// The cache is the store: the fetch writes it and announces the change,
// and every mounted count (and other tabs, via "storage") reads it back.
const CHANGED = 'tabcn-stars-changed';

function writeCache(count: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, fetchedAt: Date.now() }));
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}
const cachedCount = () => readCache()?.count ?? null;

export function useGithubStars(repo: string, saved: number) {
  // The server (and the first client render) show the saved number; the
  // cached one takes over right after hydration.
  const cached = useSyncExternalStore(subscribe, cachedCount, () => null);

  useEffect(() => {
    const fresh = readCache();
    if (fresh && Date.now() - fresh.fetchedAt < STALE_MS) return;

    let cancelled = false;
    fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: unknown } | null) => {
        if (cancelled || typeof data?.stargazers_count !== 'number') return;
        writeCache(data.stargazers_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return cached ?? saved;
}

const noop = () => () => {};

/** 128, or 1.2k past 999. */
function compact(n: number) {
  return n > 999 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

// The count beside "GitHub" in the header, with a hairline before it. Nothing shows below
// STAR_FLOOR, so a new repo's button just reads "GitHub". A count that first appears after the
// page has loaded fades in; a count that changes rolls up when it rose, down if it dropped.
export function StarCount({ count }: { count: number }) {
  const reduceMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  // Mounted after hydration (the live count crossed the floor): fade in once.
  const [late] = useState(hydrated);
  const [seen, setSeen] = useState({ n: count, dir: 1 });
  if (seen.n !== count) setSeen({ n: count, dir: count > seen.n ? 1 : -1 });
  const dir = seen.n !== count ? (count > seen.n ? 1 : -1) : seen.dir;

  return (
    <span className={late ? 'rise flex items-center gap-2' : 'flex items-center gap-2'}>
      <span aria-hidden className="h-3.5 w-px bg-border" />
      <span className="flex items-center gap-1 text-muted">
        <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="currentColor">
          <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4l-3.8 2 .7-4.3-3.1-3 4.3-.6L8 1.6Z" />
        </svg>
        <span className="relative inline-flex overflow-hidden tabular-nums">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.span
              key={count}
              custom={dir}
              variants={{
                enter: (d: number) => ({ y: d * 10, opacity: 0 }),
                center: { y: 0, opacity: 1 },
                exit: (d: number) => ({ y: d * -10, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={
                reduceMotion ? { duration: 0 } : { duration: TIMING_MS / 1000, ease: TIMING_EASE }
              }
            >
              {compact(count)}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </span>
  );
}

// The header's link to the repo: the GitHub mark and "GitHub", then the star count once there
// are STAR_FLOOR stars. Icon only on phones. Starts at the count saved at deploy, then updates.
export function GitHubLink({ repo, saved, href }: { repo: string; saved: number; href: string }) {
  const count = useGithubStars(repo, saved);
  const show = count >= STAR_FLOOR;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={show ? `tabcn on GitHub, ${count} stars` : 'tabcn on GitHub'}
      className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-card font-medium text-[13px] text-foreground shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden transition-[background-color] duration-150 ease-out hover:bg-cell focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 max-sm:w-9 sm:px-3 motion-reduce:transition-none"
    >
      <GitHubIcon />
      <span className="hidden sm:inline">GitHub</span>
      {show && (
        <span className="hidden sm:flex">
          <StarCount count={count} />
        </span>
      )}
    </a>
  );
}
