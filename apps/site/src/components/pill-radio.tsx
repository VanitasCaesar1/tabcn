'use client';

import { motion } from 'motion/react';
import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { SPRING_MS } from './motion';

// A row of pills with a capsule that glides to the one you pick, on the site's critically
// damped spring (no overshoot). Each group has its own layout id, so two on one page never pass
// the capsule between them. Arrow keys move and select as in a native radio group; Home and End
// go to the ends. (Pills from ui lab, MIT.)
export function PillRadio<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  pillClassName,
}: {
  label: string;
  options: readonly { value: T; label: string; ariaLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  pillClassName?: string;
}) {
  const reduced = useReducedMotion();
  const layoutId = useId();
  const group = useRef<HTMLDivElement>(null);

  const transition = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, visualDuration: SPRING_MS / 1000, bounce: 0 };

  const select = (next: T) => {
    onChange(next);
    group.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)
      ?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = options.findIndex((option) => option.value === value);
    const last = options.length - 1;
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
    const option = options[next];
    if (option) select(option.value);
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex shrink-0 items-center gap-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control styled as pills, as in ui lab.
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.ariaLabel}
            tabIndex={active ? 0 : -1}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative h-7 touch-manipulation rounded-full px-2 text-xs outline-hidden transition-[color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-1 motion-reduce:transition-none sm:px-2.5',
              active ? 'text-foreground' : 'text-muted hover:text-foreground',
              pillClassName,
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
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
