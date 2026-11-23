'use client';

import { CopyButton } from './copy-button';
import { RunnerTabs } from './runner-tabs';
import { RUNNERS, useRunner } from './use-runner';

// One line to take a design home (and a fix-up line under it): the shadcn CLI pulls the files from /r/<id>.json into your
// project. The package manager you pick is remembered across pages. (From ui lab, MIT.)
export function InstallCommand({
  url,
  title = 'Install',
  inline = false,
}: {
  url: string;
  title?: string;
  /** A small label (inside a Quick start step) instead of a section heading. */
  inline?: boolean;
}) {
  const runner = useRunner();
  const command = `${RUNNERS[runner]} ${url}`;

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2
          className={
            inline ? 'pl-1 font-medium text-[13px]' : 'font-semibold text-[20px] tracking-[-0.01em]'
          }
        >
          {title}
        </h2>
        <RunnerTabs />
      </div>
      <div className="mt-3 flex h-12 items-center gap-2 rounded-xl bg-card pr-1.5 pl-4 shadow-[inset_0_0_0_1px_var(--card-border)]">
        {/* Long URLs scroll sideways inside the pill and fade at the edge. */}
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span aria-hidden className="select-none text-muted">
            ${' '}
          </span>
          {command}
        </code>
        <CopyButton value={command} label="Copy install command" className="shrink-0" />
      </div>
      {/* shadcn installs packages at npm's latest; this moves them to your SDK's versions. */}
      <p className="mt-3 text-pretty text-[14px] text-muted">
        Then run <code className="font-mono text-foreground">npx expo install --fix</code> so the
        packages it added match your Expo SDK.
      </p>
    </section>
  );
}
