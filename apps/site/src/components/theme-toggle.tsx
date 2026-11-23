'use client';

import { motion, type Transition } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { TIMING_EASE, TIMING_MS } from './motion';

type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';
// The icons crossfade on tabcnTiming; nothing scales.
const ICON_TRANSITION: Transition = { duration: TIMING_MS / 1000, ease: TIMING_EASE };

// Runs in <head> before first paint, so a saved theme never flashes the other one.
// Dark first: the page starts dark (see layout.tsx) unless "light" was saved.
export const themeScript = `try{const t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}`;

function subscribe(onChange: () => void) {
  const media = matchMedia(DARK_QUERY);
  const observer = new MutationObserver(onChange);
  media.addEventListener('change', onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => {
    media.removeEventListener('change', onChange);
    observer.disconnect();
  };
}

function getTheme(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  // Without this every color transition on the page fires at once and the
  // switch smears instead of snapping.
  const pause = document.createElement('style');
  pause.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.append(pause);

  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {}

  void document.body.offsetHeight;
  requestAnimationFrame(() => pause.remove());
}

function setTheme(theme: Theme, x: number, y: number) {
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme(theme);
    return;
  }

  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  document
    .startViewTransition(() => applyTheme(theme))
    .ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        {
          duration: 400,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTheme(next, rect.x + rect.width / 2, rect.y + rect.height / 2);
      }}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-card text-muted shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden transition-[color,background-color] duration-150 ease-out hover:bg-cell hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100 motion-reduce:transition-none"
    >
      {/* The server can't know the theme, so the icons mount once it's known,
          already in place, instead of animating in on every page load. */}
      {theme && (
        <>
          <Icon visible={theme === 'light'}>
            <circle cx="8" cy="8" r="2.75" />
            <path d="M8 1.75v1M8 13.25v1M1.75 8h1M13.25 8h1M3.58 3.58l.7.7M11.72 11.72l.7.7M3.58 12.42l.7-.7M11.72 4.28l.7-.7" />
          </Icon>
          <Icon visible={theme === 'dark'}>
            <path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z" />
          </Icon>
        </>
      )}
    </button>
  );
}

function Icon({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 16 16"
      className="absolute size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : ICON_TRANSITION}
    >
      {children}
    </motion.svg>
  );
}
