'use client';

import { motion } from 'motion/react';
import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { SPRING_MS } from './motion';
import { RUNNER_NAMES, type Runner, saveRunner, useRunner } from './use-runner';

// The package-manager switch over an install command: four pills, with a capsule that glides to
// the one you pick on the site's critically damped spring (no overshoot). Each switch has its
// own layout id, so two on one page never pass the capsule between them. Arrow keys move and
// select as in a native radio group; Home and End go to the ends. (Pills from ui lab, MIT.)
export function RunnerTabs({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const runner = useRunner();
  const layoutId = useId();
  const group = useRef<HTMLDivElement>(null);

  const transition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, visualDuration: SPRING_MS / 1000, bounce: 0 };

  const select = (name: Runner) => {
    saveRunner(name);
    group.current
      ?.querySelector<HTMLButtonElement>(`[data-runner="${name}"]`)
      ?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = RUNNER_NAMES.indexOf(runner);
    const last = RUNNER_NAMES.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = i === last ? 0 : i + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = i === 0 ? last : i - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    const name = RUNNER_NAMES[next];
    if (name) select(name);
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label="Package manager"
      onKeyDown={onKeyDown}
      className={cn('flex shrink-0 items-center gap-0.5', className)}
    >
      {RUNNER_NAMES.map((name) => {
        const active = name === runner;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control styled as pills, as in ui lab.
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-runner={name}
            onClick={() => saveRunner(name)}
            className={cn(
              'relative h-7 touch-manipulation rounded-full px-2 font-mono text-xs outline-hidden transition-[color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-1 motion-reduce:transition-none sm:px-2.5',
              active ? 'text-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="absolute inset-0 rounded-full bg-background shadow-raised"
                transition={transition}
              />
            )}
            <span className="relative">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
