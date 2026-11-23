'use client';

import Link from 'next/link';
import type { ClipboardEvent } from 'react';
import { designPath, registryUrl, site } from '@/lib/site';
import { CopyButton } from './copy-button';
import { RunnerTabs } from './runner-tabs';
import { RUNNERS, useRunner } from './use-runner';

// The home page's one install command. It always adds the same design, named in the label above
// it, so it can't change while someone is about to copy it; the board below never drives it. The
// whole command shows: the CLI on the first line, the registry URL under it, breaking after the
// host on phones. Nothing scrolls sideways and nothing is cut off with an ellipsis.
export function HeroInstall({ id, title }: { id: string; title: string }) {
  const runner = useRunner();
  const url = registryUrl(id);
  const command = `${RUNNERS[runner]} ${url}`;

  // https://vanitascaesar1.github.io/ | tabcn/r/ | <id> | .json, read off the site's own URL.
  const file = `${id}.json`;
  const host = site.url.slice(0, site.url.lastIndexOf('/') + 1);
  const path = url.slice(host.length, url.length - file.length);

  return (
    <div className="rise mt-8 w-[min(560px,100%)] text-left [--rise-delay:180ms]">
      <div className="flex h-8 items-center justify-between gap-2 pl-1 pointer-coarse:h-10">
        <Link
          href={designPath(id)}
          id="hero-install-label"
          className="whitespace-nowrap rounded-sm font-medium text-[13px] text-foreground underline decoration-transparent underline-offset-2 outline-hidden transition-[text-decoration-color] duration-150 hover:decoration-border focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          <span className="max-[359px]:hidden">Add </span>
          {title}
        </Link>
        <RunnerTabs />
      </div>
      <figure
        aria-labelledby="hero-install-label"
        onCopy={keepOneLine}
        className="cmd-card mt-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 bg-card py-3 pr-2 pl-3.5 font-mono text-[12px] leading-5 shadow-[inset_0_0_0_1px_var(--card-border)] sm:pl-4 sm:text-[13px]"
      >
        <span aria-hidden className="select-none text-muted">
          $
        </span>
        {/* Two lines on screen, one line on the clipboard. The CLI is a full-width inline-block,
            not a block, so a selection copies it, the space and the URL with no newline between
            them; a pasted newline would run `shadcn add` with nothing to add. */}
        <code className="min-w-0 [overflow-wrap:anywhere]">
          <span className="inline-block w-full whitespace-nowrap text-foreground">
            {RUNNERS[runner]}
          </span>{' '}
          <span className="text-muted">{host}</span>
          <wbr />
          <span className="text-muted">{path}</span>
          <span className="text-foreground">{id}</span>
          <span className="text-muted">.json</span>
        </code>
        <CopyButton
          tone="solid"
          value={command}
          label={`Copy install command for ${title}`}
          className="-mt-1.5 self-start"
        />
      </figure>
    </div>
  );
}

// Some browsers still put a line break between the two lines when part of the command is copied,
// and a triple-click selects the whole figure. When the whole selection sits inside the figure,
// copy it as one line instead; a selection that runs on past it is left alone.
function keepOneLine(event: ClipboardEvent<HTMLElement>) {
  const selection = window.getSelection();
  const box = event.currentTarget;
  if (!selection || selection.isCollapsed) return;
  if (!box.contains(selection.anchorNode) || !box.contains(selection.focusNode)) return;
  const text = selection.toString();
  if (!/\n/.test(text)) return;
  event.clipboardData.setData('text/plain', text.replace(/\s*\n\s*/g, ' ').trim());
  event.preventDefault();
}
