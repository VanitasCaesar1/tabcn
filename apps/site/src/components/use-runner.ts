'use client';

import { useSyncExternalStore } from 'react';

// The package manager the visitor picked in an install box, read from the same saved setting
// and change event as install-command.tsx, so the hero's command follows that choice.
// Keep RUNNERS and the two keys in step with install-command.tsx (the home hero may not edit
// that file yet; it should export these, and this file can then import them).

export const RUNNERS = {
  npm: 'npx shadcn@latest add',
  pnpm: 'pnpm dlx shadcn@latest add',
  yarn: 'yarn dlx shadcn@latest add',
  bun: 'bunx shadcn@latest add',
} as const;
export type Runner = keyof typeof RUNNERS;

const STORAGE_KEY = 'tabcn-runner';
const CHANGED = 'tabcn-runner-changed';

function readRunner(): Runner {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved in RUNNERS ? (saved as Runner) : 'npm';
  } catch {
    return 'npm';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** npm on the server and during hydration, the saved choice right after. */
export function useRunner(): Runner {
  return useSyncExternalStore<Runner>(subscribe, readRunner, () => 'npm');
}
