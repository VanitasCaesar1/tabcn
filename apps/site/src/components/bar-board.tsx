'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { BoardGroup } from '@/lib/board';
import { designPath } from '@/lib/site';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { Arrow } from './arrow';
import { BarRow } from './bar-row';
import type { BarItem } from './bar-tile';
import { BoardDock } from './board-dock';
import { CopyButton } from './copy-button';
import {
  BOARD_DWELL_MS,
  BOARD_FIRST_MS,
  CUT_IN_MS,
  CUT_OUT_MS,
  JUMP_SLIDE_MAX,
  PRESS_LOCK_MS,
  ROW_STAGGER_MS,
  SPRING_MS,
  TIMING_EASE,
  TIMING_MS,
} from './motion';
import { RUNNERS, useRunner } from './use-runner';

/** Each row's first bar (relative to the lead row), its size, and the way it slides. */
const ROWS = [
  { start: 0, dir: 1, size: 'lead' },
  { start: 8, dir: -1, size: 'chorus' },
  { start: 16, dir: 1, size: 'chorus' },
] as const;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The shortest way round the board from one bar to another: negative goes back. */
function shortest(from: number, to: number, n: number) {
  const ahead = mod(to - from, n);
  return ahead > n / 2 ? ahead - n : ahead;
}

// Wide screens with a mouse play every lead tile in the row's clear middle; everything else
// plays only the tile in focus.
const WIDE = '(min-width: 1024px) and (pointer: fine)';
function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

const roundButton =
  'grid size-8 shrink-0 touch-manipulation place-items-center rounded-full bg-surface text-foreground shadow-raised outline-hidden transition-[background-color] duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2';

const buttonPrimary =
  'hidden h-10 shrink-0 items-center rounded-full bg-foreground px-5 font-medium text-background text-sm outline-hidden transition-[opacity] duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 sm:flex';

/** 'out' fades the rows away, 'snap' moves them while hidden, 'in' fades them back. */
type Cut = 'none' | 'out' | 'snap' | 'in';

// The departure board under the home headline: an actual-size row of real tab bars over two
// smaller rows, stepping along together on the library's own spring. The lead row's middle tile
// is the one in focus: the caption names it, the command above installs it, and the dock below
// shows its layout group and jumps between groups. The board waits while you're over it or using
// its controls, and sleeps when it's off screen or the tab is hidden.
export function BarBoard({
  items,
  groups,
  startIndex,
  registryBase,
}: {
  items: BarItem[];
  groups: BoardGroup[];
  startIndex: number;
  registryBase: string;
}) {
  const reduced = useReducedMotion();
  const wide = useWide();
  const runner = useRunner();
  const root = useRef<HTMLDivElement>(null);
  const refocusTitle = useRef(false);
  const ticked = useRef(false);
  const lockedUntil = useRef(0);
  const cutTimers = useRef<number[]>([]);

  const [offset, setOffset] = useState(startIndex);
  const [step, setStep] = useState<'auto' | 'manual'>('auto');
  const [cut, setCut] = useState<Cut>('none');
  // The group a cut is heading to, so the capsule moves on the press, not after the fade.
  const [heading, setHeading] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [overRows, setOverRows] = useState(false);
  const [overCaption, setOverCaption] = useState(false);
  const [keyboardInCaption, setKeyboardInCaption] = useState(false);
  const [keyboardInDock, setKeyboardInDock] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabShown, setTabShown] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const n = items.length;
  const index = mod(offset, n);
  const current = items[index];
  const live = onScreen && tabShown && !paused && !reduced;
  const running =
    live &&
    !blocked &&
    !overRows &&
    !overCaption &&
    !keyboardInCaption &&
    !keyboardInDock &&
    cut === 'none';

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hero = el.closest('section') ?? el;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? false), {
      threshold: 0.2,
    });
    io.observe(hero);
    const onVisibility = () => setTabShown(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(
    () => () => {
      for (const t of cutTimers.current) clearTimeout(t);
    },
    [],
  );

  // One step at a time, each scheduled by the last. Any step (or a pause ending) starts the wait
  // over, so a step never lands just after you've moved the board yourself.
  // biome-ignore lint/correctness/useExhaustiveDependencies: offset restarts the wait after every step.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(
      () => {
        ticked.current = true;
        setStep('auto');
        setOffset((o) => o + 1);
      },
      ticked.current ? BOARD_DWELL_MS : BOARD_FIRST_MS,
    );
    return () => clearTimeout(timer);
  }, [running, offset]);

  // A keyboard step swaps the caption's link for the new one; keep focus on it. The old link
  // stays in the page while it fades out, so the new one is found by its bar's id rather than
  // through a shared ref, which the old link would clear as it unmounts.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each step's render.
  useEffect(() => {
    if (!refocusTitle.current) return;
    refocusTitle.current = false;
    const id = items[mod(offset, items.length)]?.id;
    if (!id) return;
    root.current?.querySelector<HTMLAnchorElement>(`a[data-title="${CSS.escape(id)}"]`)?.focus();
  }, [offset]);

  // A step you asked for. A short one slides all rows together; a long one fades the rows out,
  // moves them while hidden and fades them back, since a long slide would run past the drawn
  // slots. Presses that land while one is still moving are ignored.
  const move = (by: number) => {
    if (by === 0) return false;
    const now = performance.now();
    if (now < lockedUntil.current) return false;
    lockedUntil.current = now + PRESS_LOCK_MS;
    ticked.current = true;
    setStep('manual');
    if (reduced || Math.abs(by) <= JUMP_SLIDE_MAX) {
      setOffset((o) => o + by);
      return true;
    }
    const later = (fn: () => void, ms: number) => {
      cutTimers.current.push(window.setTimeout(fn, ms));
    };
    setHeading(items[mod(offset + by, n)]?.group ?? null);
    setCut('out');
    later(() => {
      setCut('snap');
      setOffset((o) => o + by);
      // Once React has drawn the jump, read the layout so the browser applies it with the slide
      // switched off, then switch it back on and fade the rows in.
      later(() => {
        root.current?.getBoundingClientRect();
        setCut('in');
        setHeading(null);
        later(() => setCut('none'), CUT_IN_MS);
      }, 34);
    }, CUT_OUT_MS);
    return true;
  };

  const jump = (group: number) => {
    const target = groups[group]?.start;
    if (target === undefined || items[index]?.group === group) return;
    move(shortest(index, target, n));
  };

  const onBlocked = useCallback(() => setBlocked(true), []);
  const onUnblocked = useCallback(() => setBlocked(false), []);

  const hover = (set: (on: boolean) => void) => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && set(true),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === 'mouse' && set(false),
  });

  if (!current) return null;

  const command = `${RUNNERS[runner]} ${registryBase}${current.id}.json`;
  const swap = { duration: reduced ? 0 : TIMING_MS / 1000, ease: TIMING_EASE };
  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: swap },
    exit: { opacity: 0, transition: swap },
  };
  const counter = `${String(index + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;

  return (
    <div
      ref={root}
      data-step={step}
      style={
        {
          '--spring-ms': `${SPRING_MS}ms`,
          '--timing-ms': `${TIMING_MS}ms`,
          '--stagger': `${ROW_STAGGER_MS}ms`,
          '--cut-out-ms': `${CUT_OUT_MS}ms`,
          '--cut-in-ms': `${CUT_IN_MS}ms`,
        } as React.CSSProperties
      }
    >
      {/* The install command for the bar in focus. */}
      <div className="rise mx-auto mt-5 flex max-w-[760px] items-center justify-center gap-2 px-4 [--rise-delay:180ms] sm:mt-6 sm:px-6">
        <div className="flex h-11 w-[min(600px,100%)] min-w-0 items-center gap-2 rounded-full bg-surface pr-1.5 pl-4 shadow-raised">
          <code className="flex min-w-0 flex-1 items-center whitespace-pre font-mono text-[13px]">
            <span aria-hidden className="shrink-0 select-none text-muted">
              ${' '}
            </span>
            {/* The runner and the start of the URL give way first on narrow screens. */}
            <span className="min-w-0 truncate text-muted">
              {RUNNERS[runner]} {registryBase}
            </span>
            <span className="relative grid shrink-0">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span key={current.id} className="col-start-1 row-start-1" {...fade}>
                  <span className="text-foreground">{current.id}</span>
                  <span className="text-muted">.json</span>
                </motion.span>
              </AnimatePresence>
            </span>
          </code>
          <CopyButton value={command} label="Copy install command" className="shrink-0" />
        </div>
        <a href="#designs" className={buttonPrimary}>
          Browse designs
        </a>
      </div>
      {/* Every design installs the tabcn package from npm, which isn't published yet. */}
      <p className="rise mx-auto mt-2.5 max-w-[600px] px-4 text-center text-[12px] text-muted [--rise-delay:180ms] sm:px-6">
        Pre-release: the tabcn package is not on npm yet, so this command won't install until it is.{' '}
        <a
          href="#quick-start"
          className="rounded-sm text-foreground underline decoration-border underline-offset-2 outline-hidden hover:decoration-current focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
        >
          Quick start
        </a>
      </p>

      {/* Which bar is in focus, with the step buttons. Arrow keys step while focus is in here. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys are a shortcut for the buttons inside. */}
      <div
        className="rise mt-6 grid min-h-8 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 [--rise-delay:240ms] sm:mt-7 sm:px-6"
        {...hover(setOverCaption)}
        onFocus={(e) => setKeyboardInCaption(e.target.matches(':focus-visible'))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardInCaption(false);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const moved = move(e.key === 'ArrowRight' ? 1 : -1);
          refocusTitle.current =
            moved && e.target instanceof Element && e.target.closest('a[data-title]') !== null;
        }}
      >
        <div className="flex justify-end">
          <button
            type="button"
            aria-label="Previous bar"
            onClick={() => move(-1)}
            className={roundButton}
          >
            <Arrow direction="left" className="size-3.5" />
          </button>
        </div>

        {/* Old and new captions share one grid cell, so they overlap while they crossfade. On
            phones the meta line sits under the title; from 640 px it follows it. */}
        <div className="grid w-[min(440px,calc(100cqi-128px))] grid-cols-[minmax(0,1fr)]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={current.id}
              className="col-start-1 row-start-1 flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap sm:flex-row sm:items-baseline sm:gap-2"
              {...fade}
            >
              <Link
                data-title={current.id}
                href={designPath(current.id)}
                className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm font-medium text-[15px] leading-5 outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
              >
                <span className="truncate">{current.title}</span>
                <Arrow direction="right" className="size-3" />
              </Link>
              <span aria-hidden className="hidden text-[13px] text-muted sm:inline">
                ·
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted uppercase leading-4 tracking-[0.08em] tabular-nums">
                <span className="max-[380px]:hidden">{current.layoutLabel} · </span>
                {counter}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            aria-label="Next bar"
            onClick={() => move(1)}
            className={roundButton}
          >
            <Arrow direction="right" className="size-3.5" />
          </button>
        </div>
      </div>

      {/* The rows: an actual-size lead row that plays, over two smaller rows of posters. */}
      <div className="bar-rows" data-cut={cut === 'none' ? undefined : cut} {...hover(setOverRows)}>
        {ROWS.map((r, i) => (
          <BarRow
            key={r.start}
            seq={items}
            start={r.start}
            offset={offset}
            dir={r.dir}
            row={i}
            size={r.size}
            focusSlot={r.size === 'lead' ? offset : undefined}
            playPolicy={r.size === 'lead' ? (wide ? 'visible' : 'focus-only') : 'none'}
            live={live}
            manualPlay={reduced || blocked}
            onStep={r.size === 'lead' ? move : undefined}
            onBlocked={onBlocked}
            onUnblocked={onUnblocked}
          />
        ))}
      </div>

      <BoardDock
        groups={groups}
        active={heading ?? current.group}
        onJump={jump}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        showPause={!reduced}
        onKeyboardIn={setKeyboardInDock}
      />
    </div>
  );
}
