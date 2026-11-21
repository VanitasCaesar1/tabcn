'use client';

import { CopyButton } from './copy-button';
import { RunnerTabs } from './runner-tabs';
import { RUNNERS, useRunner } from './use-runner';

// One line to take a design home (and a fix-up line under it): the shadcn CLI pulls the files from /r/<id>.json into your
// project. The package manager you pick is remembered across pages. (From ui lab, MIT.)
export function InstallCommand({ url, title = 'Install' }: { url: string; title?: string }) {
  const runner = useRunner();
  const command = `${RUNNERS[runner]} ${url}`;

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-3 pl-1">
        <h2 className="font-medium text-[13px]">{title}</h2>
        <RunnerTabs />
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
      {/* shadcn installs packages at npm's latest; this moves them to your SDK's versions. */}
      <p className="mt-2 pl-1 text-pretty text-[13px] text-muted">
        Then run <code className="font-mono text-foreground">npx expo install --fix</code> so the
        packages it added match your Expo SDK.
      </p>
    </section>
  );
}
