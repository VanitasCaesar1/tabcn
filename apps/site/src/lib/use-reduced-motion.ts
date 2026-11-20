'use client';

import { useSyncExternalStore } from 'react';

// Reports false during hydration, matching the server HTML, then the real preference straight
// after, and follows it if it changes. (From ui lab.)
const query = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
