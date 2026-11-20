'use client';

import { motion } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { CopyButton } from './copy-button';

// One line to take a design home: the shadcn CLI pulls the files from /r/<id>.json into your
// project. The package manager you pick is remembered across pages. (From ui lab, MIT.)

const RUNNERS = {
  npm: 'npx shadcn@latest add',
  pnpm: 'pnpm dlx shadcn@latest add',
  yarn: 'yarn dlx shadcn@latest add',
  bun: 'bunx shadcn@latest add',
} as const;
type Runner = keyof typeof RUNNERS;
const NAMES = Object.keys(RUNNERS) as Runner[];

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

function saveRunner(runner: Runner) {
  try {
    localStorage.setItem(STORAGE_KEY, runner);
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

export function InstallCommand({ url, title = 'Install' }: { url: string; title?: string }) {
  const reduceMotion = useReducedMotion();
  // npm on the server and during hydration, the saved choice right after.
  const runner = useSyncExternalStore<Runner>(subscribe, readRunner, () => 'npm');
  const command = `${RUNNERS[runner]} ${url}`;

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-3 pl-1">
        <h2 className="font-medium text-[13px]">{title}</h2>
        <div role="radiogroup" aria-label="Package manager" className="flex items-center gap-0.5">
          {NAMES.map((name) => {
            const active = name === runner;
            return (
              // biome-ignore lint/a11y/useSemanticElements: a segmented control styled as pills, as in ui lab.
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => saveRunner(name)}
                className={cn(
                  'relative h-7 rounded-full px-2.5 font-mono text-xs outline-hidden transition-[color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-1',
                  active ? 'text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`runner-${title}`}
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-background shadow-raised"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', visualDuration: 0.25, bounce: 0.15 }
                    }
                  />
                )}
                <span className="relative">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-full bg-surface pr-1.5 pl-4 shadow-raised">
        {/* Long URLs scroll sideways inside the pill and fade at the edge. */}
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span aria-hidden className="select-none text-muted">
            ${' '}
          </span>
          {command}
        </code>
        <CopyButton value={command} label="Copy install command" className="shrink-0" />
      </div>
    </section>
  );
}
