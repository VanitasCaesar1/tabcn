'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { registryUrl } from '@/lib/site';
import { aiPromptFor, type UsageDesign, type UsageSettings, usageFor } from '@/lib/usage';
import { CodeBlock } from './code-block';
import { CopyButton } from './copy-button';
import { CustomizePanel } from './customize-panel';
import { LivePhone } from './live-phone';
import { DesignPhone, type ScreenMedia } from './phone';
import { RUNNERS, useRunner } from './use-runner';

type Tab = 'preview' | 'code';

/**
 * On desktop, as wide as lets the whole phone (2.088 times as tall as wide) fit in the window on
 * load, under everything above the stage (`--stage-top`, measured) and the stage's padding: up to
 * 380 px, and no less than 220 px on a very short window. 260 px on phones, which scroll to it.
 */
const PHONE_WIDTH =
  'w-[260px] md:w-[clamp(220px,calc((100dvh_-_var(--stage-top,300px)_-_56px)_/_2.088),380px)]';

/** Keeps `--stage-top` on the stage: how far down the page it starts. */
function useStageTop() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.setProperty('--stage-top', `${Math.round(top)}px`);
    };
    measure();
    // The header wraps differently as the window narrows; the window's height alone changes nothing above.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// The top of a design's page: Preview / Code tabs and "Copy for AI" over a stage, the Customize
// panel under it, then the install box and the usage snippet. Everything under the tabs follows
// the settings picked in the panel: the live preview by message, the code by rebuilding it.
export function DesignWorkbench({
  usage,
  media,
  preview,
  themed,
  scheme,
  minTabs,
  maxTabs,
  sources,
  install,
  usageNotes,
}: {
  usage: UsageDesign;
  media: ScreenMedia;
  preview: string | null;
  themed: boolean;
  scheme: 'light' | 'dark';
  minTabs: number;
  maxTabs: number;
  /** The files the registry copies in: the name each lands under and its text. */
  sources: { name: string; code: string }[];
  /** The install box, shown under the panel. */
  install: React.ReactNode;
  /** The lines above the usage snippet. */
  usageNotes: React.ReactNode;
}) {
  const id = useId();
  const initial: UsageSettings = { tabs: maxTabs, scheme, theme: 'tabcn' };
  const [settings, setSettings] = useState<UsageSettings>(initial);
  const [rtl, setRtl] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [file, setFile] = useState(0);
  const runner = useRunner();
  const stageRef = useStageTop();

  const chosen = { ...settings, rtl };
  const snippet = usageFor(usage, chosen);
  const files = [{ name: '_layout.tsx', code: snippet }, ...sources];
  const shownFile = files[file] ?? files[0];
  const prompt = aiPromptFor(usage, chosen, `${RUNNERS[runner]} ${registryUrl(usage.id)}`);

  return (
    <>
      {/* One stage for both tabs: the code lies over the phone, so the live preview keeps running
          (and keeps its state) while the code is shown. */}
      <div className="relative overflow-hidden rounded-2xl border border-card-border bg-card-stage">
        {/* The tabs and "Copy for AI": a row at the top of the stage, and in its top corners once the
            stage is wide enough that they clear the phone, so the phone starts higher. */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:top-0 xl:[&>*]:pointer-events-auto">
          <div
            role="tablist"
            aria-label="View"
            className="relative grid h-9 w-[176px] grid-cols-2 rounded-[10px] bg-card p-0.5 shadow-[inset_0_0_0_1px_var(--card-border)]"
            style={
              {
                '--g': tab === 'preview' ? 0 : 1,
                '--n': 2,
                '--pad': '2px',
                '--capsule-r': '8px',
              } as React.CSSProperties
            }
          >
            <span aria-hidden className="dock-capsule" />
            {(['preview', 'code'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`${id}-${t}-tab`}
                aria-selected={tab === t}
                aria-controls={`${id}-${t}`}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => setTab(t)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                  e.preventDefault();
                  const next = t === 'preview' ? 'code' : 'preview';
                  setTab(next);
                  document.getElementById(`${id}-${next}-tab`)?.focus();
                }}
                className={cn(
                  'seg relative flex touch-manipulation items-center justify-center gap-1.5 rounded-lg font-medium text-[13px] outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2',
                  tab === t ? 'text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                {t === 'preview' ? <EyeIcon /> : <CodeIcon />}
                {t === 'preview' ? 'Preview' : 'Code'}
              </button>
            ))}
          </div>
          <CopyButton value={prompt} label="Copy for AI">
            Copy for AI
          </CopyButton>
        </div>
        <div
          ref={stageRef}
          id={`${id}-preview`}
          role="tabpanel"
          aria-labelledby={`${id}-preview-tab`}
          aria-hidden={tab !== 'preview'}
          inert={tab !== 'preview'}
          className={cn(
            'relative flex justify-center overflow-x-clip px-4 pb-6 xl:pt-6',
            tab !== 'preview' && 'invisible',
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--foreground)_6%,transparent),transparent)]"
          />
          {preview ? (
            <LivePhone
              media={media}
              preview={preview}
              settings={settings}
              rtl={rtl}
              className={PHONE_WIDTH}
            />
          ) : (
            <DesignPhone media={media} className={PHONE_WIDTH} />
          )}
        </div>
        {tab === 'code' && (
          <div
            id={`${id}-code`}
            role="tabpanel"
            aria-labelledby={`${id}-code-tab`}
            className="absolute inset-x-0 top-[60px] bottom-0 px-2 pb-2"
          >
            {shownFile && (
              <CodeBlock
                filename={shownFile.name}
                code={shownFile.code}
                className="h-full"
                header={
                  <div className="-ml-2 flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {files.map((f, i) => (
                      <button
                        key={f.name}
                        type="button"
                        aria-pressed={i === file}
                        onClick={() => setFile(i)}
                        className={cn(
                          'h-8 shrink-0 touch-manipulation rounded-lg px-2.5 font-mono text-[12px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid motion-reduce:transition-none',
                          i === file
                            ? 'bg-cell text-foreground'
                            : 'text-muted hover:text-foreground',
                        )}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                }
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <CustomizePanel
          settings={settings}
          rtl={rtl}
          minTabs={minTabs}
          maxTabs={maxTabs}
          themed={themed}
          accent={!!usage.controls.accent}
          labels={!!usage.controls.labels}
          onChange={setSettings}
          onRtl={setRtl}
          onReset={() => {
            setSettings(initial);
            setRtl(false);
          }}
        />
      </div>

      <div className="mt-12">{install}</div>

      <section aria-labelledby={`${id}-usage`} className="mt-12">
        <h2 id={`${id}-usage`} className="font-semibold text-[20px] tracking-[-0.01em]">
          Usage
        </h2>
        <p className="mt-2 mb-4 max-w-2xl text-pretty text-[14px] text-muted leading-relaxed">
          {usageNotes}
        </p>
        <CodeBlock filename="app/(tabs)/_layout.tsx" code={snippet} />
      </section>
    </>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M1.75 8s2.25-4.25 6.25-4.25S14.25 8 14.25 8 12 12.25 8 12.25 1.75 8 1.75 8Z" />
      <circle cx="8" cy="8" r="1.9" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}
