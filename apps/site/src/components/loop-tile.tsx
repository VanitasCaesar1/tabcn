'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import {
  claim,
  finePointer,
  markBlocked,
  release,
  saveData,
  useLoopPlaying,
  watch,
} from './use-loop-player';

// A design's bar on its demo colour: the poster, and its loop over it while the card is the one
// playing (see use-loop-player.ts). The demo colour shows from the first paint, so the box has
// its final shape and colour before the poster fades in. The pictures are decoration: the
// card's title link names the design.
export function LoopTile({
  id,
  title,
  background,
  poster,
  loop,
  panel = false,
  variant = 'card',
}: {
  id: string;
  title: string;
  /** The demo screen's colour, `#rrggbb`. */
  background: string;
  poster: string | null;
  loop: string | null;
  /** A taller crop (804 x 460) showing the panel above its bar. */
  panel?: boolean;
  /** A catalogue card's tile, or a list row's thumbnail. */
  variant?: 'card' | 'row';
}) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const active = useLoopPlaying(id);
  const [loaded, setLoaded] = useState(false);
  const [instant, setInstant] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [near, setNear] = useState(false);
  const [touch, setTouch] = useState(false);
  const [lowData, setLowData] = useState(false);

  // Only a press plays: reduced motion, data saver on a touch screen, or a refused autoplay.
  const manual = reduced || blocked || (touch && lowData);
  const want = active && loop !== null && (!blocked || pressed);

  // A poster already in the cache shows at once; one still loading fades in.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) {
      setInstant(true);
      setLoaded(true);
    }
    setTouch(!finePointer());
    setLowData(saveData());
  }, []);

  // Hover and keyboard focus anywhere on the card play it; touch plays the card in view.
  useEffect(() => {
    const host = box.current?.closest('[data-loop-host]');
    if (!host || !loop) return;
    const onEnter = (e: Event) => {
      if ((e as PointerEvent).pointerType === 'touch') return;
      setNear(true);
      if (!manual) claim(id, true);
    };
    const onLeave = (e: Event) => {
      if ((e as PointerEvent).pointerType === 'touch') return;
      setNear(false);
      setPressed(false);
      release(id);
    };
    const onFocusIn = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.matches(':focus-visible')) return;
      setNear(true);
      if (!manual) claim(id);
    };
    const onFocusOut = (e: Event) => {
      if (host.contains((e as FocusEvent).relatedTarget as Node | null)) return;
      setNear(false);
      setPressed(false);
      release(id);
    };
    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('focusin', onFocusIn);
    host.addEventListener('focusout', onFocusOut);
    const unwatch = variant === 'card' && !manual ? watch(host, id) : undefined;
    return () => {
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('focusout', onFocusOut);
      unwatch?.();
    };
  }, [id, loop, manual, variant]);

  // The video joins the page the first time the card plays, and stays.
  useEffect(() => {
    if (want) setMounted(true);
  }, [want]);

  useEffect(() => {
    const el = video.current;
    if (!el || !mounted) return;
    if (!want) {
      el.pause();
      // Back to the poster at once: it is the loop's first frame, so the switch doesn't show.
      setShown(false);
      return;
    }
    el.currentTime = 0;
    el.play().catch((error: unknown) => {
      // Low-power mode or a site setting: keep the poster, and only a press plays it now.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setBlocked(true);
        setPressed(false);
        markBlocked(id);
      }
    });
  }, [want, mounted, id]);

  const toggle = () => {
    if (active) {
      setPressed(false);
      release(id);
      return;
    }
    setPressed(true);
    claim(id);
    // Inside the press, so a browser that refused to autoplay lets it start.
    video.current?.play().catch(() => {});
  };

  const card = variant === 'card';

  return (
    <div
      ref={box}
      className={cn(
        'relative shrink-0 overflow-hidden',
        card
          ? cn('specimen-tile rounded-[12px]', panel ? 'aspect-[804/460]' : 'aspect-[804/280]')
          : 'specimen-thumb h-[33px] w-24 rounded-[8px] sm:h-[46px] sm:w-[132px]',
      )}
      style={{ '--demo': background } as React.CSSProperties}
    >
      <div aria-hidden className="absolute inset-0">
        {poster && (
          // biome-ignore lint/performance/noImgElement: a static export of small, pre-sized JPGs.
          <img
            ref={img}
            src={poster}
            alt=""
            width={804}
            height={panel ? 460 : 280}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            draggable={false}
            onLoad={() => setLoaded(true)}
            data-loaded={loaded ? '' : undefined}
            data-instant={instant ? '' : undefined}
            className={cn(
              'loop-poster absolute inset-0 size-full object-cover',
              panel && 'object-bottom',
            )}
          />
        )}
        {mounted && loop && (
          <video
            ref={video}
            src={loop}
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="auto"
            onPlaying={() => setShown(true)}
            data-shown={shown ? '' : undefined}
            className="loop-video absolute inset-0 size-full object-cover"
          />
        )}
      </div>
      {card && manual && loop && (near || touch || pressed) && (
        <button
          type="button"
          onClick={toggle}
          aria-label={active ? `Pause ${title}` : `Play ${title}`}
          className="absolute right-2 bottom-2 z-10 grid size-7 place-items-center rounded-full bg-black/60 text-white outline-hidden backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-solid"
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
            {active ? (
              <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />
            ) : (
              <path d="M5 3.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 5 3.2Z" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
