'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { designPath } from '@/lib/site';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { Arrow } from './arrow';
import { PhoneFrame } from './phone';

export interface ShowcaseItem {
  id: string;
  title: string;
  video: string;
  poster: string | null;
}

// The home page's phone: real recordings of a few designs, one after another. Each plays once and
// crossfades into the next; picking one from the list under the phone plays that one on a loop
// instead. Only the recording on screen (and the one fading out) is in the page. Under reduced
// motion nothing starts on its own: the poster shows, and a press plays it.
export function HeroShowcase({ items }: { items: ShowcaseItem[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  // The one fully shown. A new recording mounts hidden and fades in on the next frame, while the
  // last one fades out under it.
  const [shown, setShown] = useState(0);
  const [picked, setPicked] = useState(false);
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const videos = useRef(new Map<number, HTMLVideoElement>());

  // Off screen, the recording waits.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = videos.current.get(index);
    if (!el) return;
    if (inView && !reduced) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [index, inView, reduced]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(index));
    return () => cancelAnimationFrame(frame);
  }, [index]);

  // The one fading out leaves the page once the crossfade is over.
  useEffect(() => {
    if (previous === null) return;
    const timer = window.setTimeout(() => setPrevious(null), 450);
    return () => window.clearTimeout(timer);
  }, [previous]);

  const show = (next: number, byHand: boolean) => {
    if (byHand) setPicked(true);
    if (next === index) {
      const el = videos.current.get(index);
      if (el && reduced) el.play().catch(() => {});
      return;
    }
    setPrevious(index);
    setIndex(next);
  };

  const current = items[index];
  if (!current) return null;

  return (
    <div ref={root} className="flex flex-col items-center">
      <PhoneFrame className="w-[min(290px,72vw)]">
        {items.map((item, i) =>
          i === index || i === previous ? (
            <video
              key={item.id}
              ref={(el) => {
                if (el) videos.current.set(i, el);
                else videos.current.delete(i);
              }}
              src={item.video}
              poster={item.poster ?? undefined}
              muted
              playsInline
              loop={picked}
              preload="auto"
              aria-label={`${item.title} recording`}
              onEnded={() => {
                if (!picked) show((index + 1) % items.length, false);
              }}
              data-on={i === shown ? '' : undefined}
              className="hero-screen absolute inset-0 size-full object-cover"
            />
          ) : null,
        )}
      </PhoneFrame>

      <div className="mt-6 flex w-full max-w-[440px] flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-1">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={i === index}
              onClick={() => show(i, true)}
              className={cn(
                'h-8 touch-manipulation rounded-lg px-2.5 text-[13px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid motion-reduce:transition-none',
                i === index
                  ? 'bg-cell font-medium text-foreground'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
        <Link
          href={designPath(current.id)}
          className="group/open inline-flex items-center gap-1 rounded-sm text-[13px] text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none"
        >
          Open {current.title}
          <Arrow
            direction="right"
            className="size-3 transition-[translate] duration-150 ease-out group-hover/open:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </div>
  );
}
