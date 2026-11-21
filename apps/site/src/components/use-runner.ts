'use client';

import { useSyncExternalStore } from 'react';

// The package manager the visitor picked for the shadcn CLI. Every install box reads and writes
// this one saved setting, so a choice made in one box carries to the others and across pages.

export const RUNNERS = {
  npm: 'npx shadcn@latest add',
  pnpm: 'pnpm dlx shadcn@latest add',
  yarn: 'yarn dlx shadcn@latest add',
  bun: 'bunx shadcn@latest add',
} as const;
export type Runner = keyof typeof RUNNERS;
export const RUNNER_NAMES = Object.keys(RUNNERS) as Runner[];

export const RUNNER_KEY = 'tabcn-runner';
export const RUNNER_CHANGED = 'tabcn-runner-changed';

function readRunner(): Runner {
  try {
    const saved = localStorage.getItem(RUNNER_KEY);
    return saved && saved in RUNNERS ? (saved as Runner) : 'npm';
  } catch {
    return 'npm';
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(RUNNER_CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(RUNNER_CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** npm on the server and during hydration, the saved choice right after. */
export function useRunner(): Runner {
  return useSyncExternalStore<Runner>(subscribe, readRunner, () => 'npm');
}

/** Saves the choice and tells every install box on the page. */
export function saveRunner(runner: Runner) {
  try {
    localStorage.setItem(RUNNER_KEY, runner);
  } catch {}
  window.dispatchEvent(new Event(RUNNER_CHANGED));
}
