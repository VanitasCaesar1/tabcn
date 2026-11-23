'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import type { PreviewSettings } from '../../../example/src/preview-settings';
import { DemoVideo } from './demo-video';
import { PhoneFrame, type ScreenMedia, ScreenPlaceholder } from './phone';

// The preview is laid out 390 points wide, as on an iPhone, and scaled to the frame's width;
// its height fills the frame. The design then looks as it does on a phone at any frame width.
const SCREEN_WIDTH = 390;

/**
 * The design running live: the example app's web build (scripts/build-preview.ts) in the phone
 * frame, loaded once the frame comes near the screen. The recording shows until the app says
 * it's ready, and stays if it never does. Every change of `settings` goes to the app as a
 * `tabcn:settings` message (and the theme as `tabcn:theme` too, which today's preview reads);
 * right to left can't change at run time, so it reloads the app with `&rtl=1`.
 */
export function LivePhone({
  media,
  preview,
  settings,
  rtl,
  className,
}: {
  media: ScreenMedia;
  preview: string;
  settings: PreviewSettings;
  rtl: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const scale = size.width / SCREEN_WIDTH;
  const [src, setSrc] = useState<string | null>(null);
  // The theme the app opens with; later changes go by message, not reloads.
  const theme = useRef(settings.theme ?? 'tabcn');
  theme.current = settings.theme ?? 'tabcn';

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

  // Opens the app, and opens it again when right to left changes; the recording covers the reload.
  useEffect(() => {
    if (!near) return;
    setReady(false);
    setSrc(`${preview}&theme=${theme.current}${rtl ? '&rtl=1' : ''}`);
  }, [near, preview, rtl]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frame.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === 'tabcn:ready') setReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Sent once the app is ready, and again on every change.
  useEffect(() => {
    const target = frame.current?.contentWindow;
    if (!ready || !target) return;
    const origin = window.location.origin;
    target.postMessage({ type: 'tabcn:settings', settings }, origin);
    target.postMessage({ type: 'tabcn:theme', theme: settings.theme ?? 'tabcn' }, origin);
  }, [ready, settings]);

  return (
    <PhoneFrame className={className}>
      <div ref={box} className="absolute inset-0">
        {ready ? null : media.video ? (
          <DemoVideo src={media.video} poster={media.poster} title={media.title} play="auto" />
        ) : (
          <ScreenPlaceholder title={media.title} />
        )}
        {src && scale > 0 ? (
          <iframe
            key={src}
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
  );
}
