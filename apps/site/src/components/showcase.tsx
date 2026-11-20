'use client';

import { AnimatePresence, animate, type MotionValue, motion, useMotionValue } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { designPath } from '@/lib/site';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { Arrow } from './arrow';
import { DesignPhone, type ScreenMedia } from './phone';

export interface ShowcaseItem extends ScreenMedia {
  id: string;
  description: string;
  layoutLabel: string;
}

// About one loop of a recording each.
const EACH = 6;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// The newest designs, playing one after another on a big stage. It waits while you're over it,
// and sleeps when it's off screen or the tab is hidden. (ui lab's "Just made", MIT.)
export function Showcase({ items }: { items: ShowcaseItem[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabShown, setTabShown] = useState(true);
  const section = useRef<HTMLElement>(null);
  const progress = useMotionValue(0);
  const current = items[index] ?? items[0];
  const running = visible && tabShown && !held;

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), {
      threshold: 0.35,
    });
    io.observe(el);
    const onVisibility = () => setTabShown(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Runs the current item's time down from wherever it was paused, then moves on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: index restarts the timer for the next item.
  useEffect(() => {
    if (!running) return;
    const left = (1 - progress.get()) * EACH;
    const controls = animate(progress, 1, {
      duration: left,
      ease: 'linear',
      onComplete: () => {
        progress.jump(0);
        setIndex((i) => (i + 1) % items.length);
      },
    });
    return () => controls.stop();
  }, [running, index, items.length, progress]);

  if (!current) return null;

  const go = (i: number) => {
    progress.jump(0);
    setIndex(i);
  };

  return (
    <section
      ref={section}
      aria-labelledby="showcase"
      className="mb-16"
      onPointerEnter={(e) => e.pointerType !== 'touch' && setHeld(true)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && setHeld(false)}
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="showcase" className="flex items-center gap-2 font-medium text-[15px]">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-marker opacity-60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-marker" />
          </span>
          Showcase
        </h2>
        <p className="text-[13px] text-muted">The newest {items.length}, playing on their own</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* The stage. A link laid over all of it opens the design that's playing. */}
        <div className="group/stage relative h-[420px] overflow-hidden rounded-[22px] bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1px)] bg-surface [background-size:18px_18px] shadow-raised sm:h-[500px]">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={current.id}
              inert
              className="absolute inset-0 flex items-center justify-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { duration: 0.45, ease: EASE_OUT },
              }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : {
                      opacity: 0,
                      y: -10,
                      filter: 'blur(6px)',
                      transition: { duration: 0.25, ease: EASE_OUT },
                    }
              }
            >
              <DesignPhone
                media={current}
                play={visible && tabShown}
                className="w-[176px] sm:w-[210px]"
              />
            </motion.div>
          </AnimatePresence>

          <Link
            href={designPath(current.id)}
            aria-label={`Open ${current.title}`}
            className="absolute inset-0 z-10 rounded-[22px] outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2"
          >
            <span className="absolute right-4 bottom-4 hidden h-8 items-center gap-1 rounded-full bg-background/85 px-3 font-medium text-[13px] shadow-raised backdrop-blur-sm transition-[translate] duration-150 ease-out group-hover/stage:-translate-y-0.5 motion-reduce:transition-none md:flex">
              Open
              <Arrow
                direction="right"
                className="size-3 transition-[translate] duration-150 ease-out group-hover/stage:translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
          </Link>
        </div>

        {/* Phones: story ticks and a caption under the stage. */}
        <div className="md:hidden">
          <div className="flex gap-1.5" role="tablist" aria-label="Newest designs">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={item.title}
                onClick={() => go(i)}
                className="relative h-6 flex-1 touch-manipulation outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
              >
                <Tick
                  progress={progress}
                  state={i < index ? 'done' : i === index ? 'now' : 'next'}
                />
              </button>
            ))}
          </div>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={current.id}
              className="flex items-start justify-between gap-4"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transition: { duration: 0.3 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <div className="min-w-0">
                <p className="font-medium text-[15px]">{current.title}</p>
                <p className="mt-0.5 text-pretty text-muted text-sm">{current.description}</p>
              </div>
              <Link
                href={designPath(current.id)}
                className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-surface px-3 font-medium text-[13px] shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]"
              >
                Open
                <Arrow direction="right" className="size-3" />
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Wider screens: the line-up, with the one playing filling up. */}
        <ol className="hidden flex-col gap-1 md:flex">
          {items.map((item, i) => {
            const on = i === index;
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  aria-current={on ? 'true' : undefined}
                  onClick={() => go(i)}
                  className={cn(
                    'relative flex h-full w-full flex-col justify-center overflow-hidden rounded-2xl px-4 py-2.5 text-left outline-hidden transition-[background-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-1',
                    on ? 'bg-surface' : 'hover:bg-surface/60',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={cn(
                        'truncate font-medium text-[14px] transition-[color] duration-200 ease-out',
                        on ? 'text-foreground' : 'text-muted',
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{item.layoutLabel}</span>
                  </span>
                  {on && (
                    <span className="absolute inset-x-4 bottom-1.5 h-[2px] overflow-hidden rounded-full bg-border">
                      <Fill progress={progress} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Fill({ progress }: { progress: MotionValue<number> }) {
  return (
    <motion.span
      className="block h-full origin-left rounded-full bg-foreground"
      style={{ scaleX: progress }}
    />
  );
}

function Tick({
  progress,
  state,
}: {
  progress: MotionValue<number>;
  state: 'done' | 'now' | 'next';
}) {
  return (
    <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-border">
      <motion.span
        className="block h-full origin-left rounded-full bg-foreground"
        style={{ scaleX: state === 'now' ? progress : state === 'done' ? 1 : 0 }}
      />
    </span>
  );
}
