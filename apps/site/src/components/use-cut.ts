'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { CUT_OUT_MS } from './motion';

/**
 * A cut between two contents of one box: when `target` changes, `hidden` turns on (the box fades
 * out over CUT_OUT_MS in CSS), `shown` swaps to the new target while it's hidden, then `hidden`
 * turns off and the box fades back in (CUT_IN_MS, also CSS). A change that lands mid-cut just
 * moves the swap along. Under reduced motion, or when `animate()` says no (a change nobody
 * pressed for, such as the URL being read after hydration), the swap is immediate.
 * `onSwap` runs at every swap someone asked for (`animate()` says yes), immediate ones included,
 * just before the new content is painted.
 */
export function useCut<T>(
  target: T,
  key: (value: T) => string,
  { animate, onSwap }: { animate: () => boolean; onSwap?: () => void },
) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const [hidden, setHidden] = useState(false);
  const latest = useRef(target);
  latest.current = target;
  const swap = useRef(onSwap);
  swap.current = onSwap;
  // An immediate swap someone asked for (reduced motion): its onSwap runs once it's committed.
  const swapped = useRef(false);

  const targetKey = key(target);
  const shownKey = key(shown);
  // Once the box is hidden, the cut always finishes with a swap.
  const cut = targetKey !== shownKey && (hidden || (!reduced && animate()));

  // An immediate swap happens during render, so it never shows the old content for a frame.
  if (targetKey !== shownKey && !cut) {
    swapped.current = animate();
    setShown(target);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each swap, keyed on it.
  useLayoutEffect(() => {
    if (!swapped.current) return;
    swapped.current = false;
    swap.current?.();
  }, [shownKey]);

  useEffect(() => {
    if (!cut) return;
    setHidden(true);
    const timer = window.setTimeout(() => {
      swap.current?.();
      setShown(latest.current);
      setHidden(false);
    }, CUT_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [cut]);

  return { shown, hidden };
}
