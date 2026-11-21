'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { BoardItem } from '@/lib/board';
import { designPath } from '@/lib/site';

/** One bar on the board (built on the server by lib/board.ts). */
export type BarItem = BoardItem;

/**
 * Which tiles in a row may play their loop: those inside the row's clear middle (wide screens),
 * only the one in focus (phones and tablets), or none (the rows that show posters).
 */
export type PlayPolicy = 'visible' | 'focus-only' | 'none';

// One tab bar on the board: its poster, its loop over the poster once that is playing, and a
// veil that dims every tile but the one in focus. The whole tile links to the design, but out of
// the tab order and hidden from screen readers: the caption's title is the way in for both. In
// the lead row, a tile beside the focus steps the board to it instead of opening its page.
export function BarTile({
  item,
  slot,
  focus,
  policy,
  live,
  eager,
  manualPlay,
  rowRef,
  onStep,
  onBlocked,
  onUnblocked,
}: {
  item: BarItem;
  /** The tile's place on the row's track; it sets the tile's left edge. */
  slot: number;
  /** The tile under the caption, in the top row. */
  focus: boolean;
  policy: PlayPolicy;
  /** The board allows playback: on screen, tab shown, not paused, motion allowed. */
  live: boolean;
  /** Load the poster straight away (near the middle) rather than lazily. */
  eager: boolean;
  /** Show a play button on this tile: reduced motion, or the browser refused to autoplay. */
  manualPlay: boolean;
  /** The row's masked box, which decides what counts as in view. */
  rowRef: React.RefObject<HTMLDivElement | null>;
  /** Set on the lead row's other tiles: a click brings this tile into focus. */
  onStep?: () => void;
  onBlocked: () => void;
  onUnblocked: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [shown, setShown] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Set when someone presses this tile's play button; cleared when focus moves on.
  const [chosen, setChosen] = useState(false);
  const hasVideo = policy !== 'none';

  // In view means inside the row's clear middle, not under its faded edges.
  useEffect(() => {
    const el = box.current;
    const root = rowRef.current;
    if (!el || !root || !hasVideo) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
      root,
      rootMargin: '0px -8% 0px -8%',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [rowRef, hasVideo]);

  useEffect(() => {
    if (!focus) setChosen(false);
  }, [focus]);

  const autoplay = live && (policy === 'visible' ? inView : policy === 'focus-only' && focus);
  const want = hasVideo && (manualPlay ? chosen && focus : autoplay);

  // Plays or pauses to match. When this tile takes the focus, its loop starts from the top.
  const wasFocus = useRef(focus);
  useEffect(() => {
    const el = video.current;
    const gained = focus && !wasFocus.current;
    wasFocus.current = focus;
    if (!el) return;
    if (!want) {
      el.pause();
      return;
    }
    if (gained) el.currentTime = 0;
    el.play().catch((error: unknown) => {
      // A refusal (low-power mode, data saver) leaves the poster; the focus tile then offers a
      // play button. Other errors come from a pause cutting a play short and mean nothing.
      if (focus && error instanceof DOMException && error.name === 'NotAllowedError') onBlocked();
    });
  }, [want, focus, onBlocked]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (playing) {
      setChosen(false);
      el.pause();
      return;
    }
    setChosen(true);
    // Called inside the press, so a browser that refused autoplay accepts it.
    el.play().then(onUnblocked, () => setChosen(false));
  };

  return (
    <div
      ref={box}
      className="bar-tile"
      data-focus={focus ? '' : undefined}
      style={{ '--i': slot } as React.CSSProperties}
    >
      <Link
        href={designPath(item.id)}
        prefetch={false}
        tabIndex={-1}
        aria-hidden
        draggable={false}
        onClick={
          onStep
            ? (e) => {
                e.preventDefault();
                onStep();
              }
            : undefined
        }
        className="absolute inset-0 outline-hidden"
      >
        {/* biome-ignore lint/performance/noImgElement: a static export of small, pre-sized JPGs. */}
        <img
          src={item.poster}
          alt=""
          width={804}
          height={280}
          decoding="async"
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={focus ? 'high' : undefined}
          className="absolute inset-0 size-full object-cover"
        />
        {hasVideo && (
          <video
            ref={video}
            src={item.video}
            muted
            loop
            playsInline
            disablePictureInPicture
            preload={inView || focus ? 'auto' : 'none'}
            onPlaying={() => setShown(true)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="loop-video absolute inset-0 size-full object-cover"
            data-shown={shown ? '' : undefined}
          />
        )}
      </Link>
      {manualPlay && focus && hasVideo && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${item.title}` : `Play ${item.title}`}
          className="absolute right-2.5 bottom-2.5 z-10 grid size-8 place-items-center rounded-full bg-black/60 text-white outline-hidden backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-solid"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            {playing ? (
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
