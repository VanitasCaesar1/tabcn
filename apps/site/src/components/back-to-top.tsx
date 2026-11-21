'use client';

import { Arrow } from './arrow';

// The footer's way back up: a smooth scroll, or a jump under reduced motion.
export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        document.getElementById('content')?.focus({ preventScroll: true });
      }}
      className="inline-flex items-center gap-1 self-start rounded-sm outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none"
    >
      Back to top
      <Arrow direction="up" className="size-3" />
    </button>
  );
}
