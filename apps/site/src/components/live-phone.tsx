'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { DemoVideo } from './demo-video';
import { PhoneFrame, type ScreenMedia, ScreenPlaceholder } from './phone';
import { PillRadio } from './pill-radio';

// The preview is laid out 390 points wide, as on an iPhone, and scaled to the frame's width;
// its height fills the frame. The design then looks as it does on a phone at any frame width.
const SCREEN_WIDTH = 390;

type Theme = 'tabcn' | 'panel' | 'moon' | 'grass';
const THEMES: readonly { value: Theme; label: string; ariaLabel?: string }[] = [
  { value: 'tabcn', label: 'tabcn', ariaLabel: 'Design colours' },
  { value: 'panel', label: 'Panel', ariaLabel: 'PanelUI Panel' },
  { value: 'moon', label: 'Moon', ariaLabel: 'PanelUI Moon' },
  { value: 'grass', label: 'Grass', ariaLabel: 'PanelUI Grass' },
];

/**
 * The design running live: the example app's web build (scripts/build-preview.ts) in the phone
 * frame, loaded once the frame comes near the screen. The recording shows until the app says
 * it's ready, and stays if it never does. Light or dark follows the site's own theme (the
 * iframe inherits `color-scheme`). For a design with a PanelUI mapping, a switch under the
 * phone shows it in PanelUI's themes.
 */
export function LivePhone({
  media,
  preview,
  themed,
  className,
}: {
  media: ScreenMedia;
  preview: string;
  themed: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scale = size.width / SCREEN_WIDTH;
  const [theme, setTheme] = useState<Theme>('tabcn');
  // The theme the iframe was first opened with; later switches go by message, not reloads.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (near && !src) setSrc(`${preview}&theme=${theme}`);
  }, [near, src, preview, theme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frame.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === 'tabcn:ready') setReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const pick = (next: Theme) => {
    setTheme(next);
    frame.current?.contentWindow?.postMessage(
      { type: 'tabcn:theme', theme: next },
      window.location.origin,
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <PhoneFrame className={className}>
        <div ref={box} className="absolute inset-0">
          {ready ? null : media.video ? (
            <DemoVideo src={media.video} poster={media.poster} title={media.title} play="auto" />
          ) : (
            <ScreenPlaceholder title={media.title} />
          )}
          {src && scale > 0 ? (
            <iframe
              ref={frame}
              src={src}
              title={`${media.title}, live preview`}
              className={cn(
                'absolute top-0 left-0 origin-top-left border-0 transition-opacity duration-150 ease-out motion-reduce:transition-none',
                ready ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
              style={{
                width: SCREEN_WIDTH,
                height: size.height / scale,
                transform: `scale(${scale})`,
              }}
            />
          ) : null}
        </div>
      </PhoneFrame>
      {themed ? <PillRadio label="Theme" options={THEMES} value={theme} onChange={pick} /> : null}
    </div>
  );
}
