'use client';

// From ui lab (https://lab.xevrion.dev, MIT, see LICENSE-ui-lab).

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { TIMING_EASE, TIMING_MS } from './motion';

type Status = 'idle' | 'copied' | 'failed';

// tabcnTiming (200 ms on bezier 0.25, 0.1, 0.25, 1): the icons and the tooltip only crossfade.
// Nothing grows, shrinks or lifts.
const SWAP = { duration: TIMING_MS / 1000, ease: TIMING_EASE };

export function CopyButton({
  value,
  label = 'Copy to clipboard',
  // Long enough to read the tooltip, short enough that a second copy
  // rarely lands while the first is still confirming.
  resetAfter = 1600,
  onCopy,
  className,
}: {
  value: string;
  label?: string;
  resetAfter?: number;
  onCopy?: (value: string) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  // Holds the last message while the tooltip fades out, so it never
  // empties mid-exit.
  const [message, setMessage] = useState('Copied');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const attempt = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (next: Exclude<Status, 'idle'>) => {
    setStatus(next);
    setMessage(next === 'copied' ? 'Copied' : "Couldn't copy");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), resetAfter);
  };

  const copy = async () => {
    const id = ++attempt.current;
    // Confirm on press rather than after the write resolves; the write is
    // near instant, and waiting for it makes the click feel ignored.
    show('copied');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (id === attempt.current) onCopy?.(value);
    } catch {
      // Ignore failures from a click that a newer one has superseded.
      if (id === attempt.current) show('failed');
    }
  };

  const visible = status !== 'idle';

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        onClick={copy}
        className={cn(
          'relative flex size-8 touch-manipulation items-center justify-center rounded-full text-muted outline-hidden transition-[color,background-color] duration-150 ease-out select-none hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
          // Grows the hit area to 40px without growing the visible circle.
          'after:absolute after:-inset-1 after:rounded-full',
          visible && 'text-foreground',
        )}
      >
        {/* Both icons share one grid cell so the swap never shifts layout. */}
        <span className="grid" aria-hidden>
          <CopyGlyph copied={status === 'copied'} reduceMotion={reduceMotion} />
          <CheckGlyph copied={status === 'copied'} reduceMotion={reduceMotion} />
        </span>
      </button>

      {/* Out of flow, so appearing never nudges the row. It fades in and out on tabcnTiming;
          with reduced motion it appears and goes at once. */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background',
          'transition-opacity duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        {message}
      </span>

      <span className="sr-only" aria-live="polite">
        {visible ? message : ''}
      </span>
    </span>
  );
}

const GLYPH = {
  viewBox: '0 0 16 16',
  className: 'col-start-1 row-start-1 size-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// The copy icon and the check share one cell and crossfade. With reduced motion they swap at once.
function CopyGlyph({ copied, reduceMotion }: { copied: boolean; reduceMotion: boolean | null }) {
  return (
    <motion.svg
      {...GLYPH}
      initial={false}
      animate={{ opacity: copied ? 0 : 1 }}
      transition={reduceMotion ? { duration: 0 } : SWAP}
    >
      <path d="M10.75 5.25V4.5a1.75 1.75 0 0 0-1.75-1.75H4.5A1.75 1.75 0 0 0 2.75 4.5V9a1.75 1.75 0 0 0 1.75 1.75h.75" />
      <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" />
    </motion.svg>
  );
}

function CheckGlyph({ copied, reduceMotion }: { copied: boolean; reduceMotion: boolean | null }) {
  return (
    <motion.svg
      {...GLYPH}
      initial={false}
      animate={{ opacity: copied ? 1 : 0 }}
      transition={reduceMotion ? { duration: 0 } : SWAP}
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </motion.svg>
  );
}
