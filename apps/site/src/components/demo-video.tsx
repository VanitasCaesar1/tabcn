'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

// A muted, looping screen recording. `play="auto"` plays it while it's on screen; a boolean
// lets the caller decide (a card on hover, the showcase's current item). With reduced motion
// it never starts on its own: the poster shows with a play button.
export function DemoVideo({
  src,
  poster,
  title,
  play = 'auto',
}: {
  src: string;
  poster: string | null;
  title: string;
  play?: 'auto' | boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const [inView, setInView] = useState(false);
  // Set once someone presses play under reduced motion.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || play !== 'auto') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  const wanted = chosen ?? (reduceMotion ? false : play === 'auto' ? inView : play);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (wanted) el.play().catch(() => {});
    else el.pause();
  }, [wanted]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload={play === 'auto' ? 'auto' : 'none'}
        aria-label={`${title} recording`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {reduceMotion && play === 'auto' && (
        <button
          type="button"
          onClick={() => setChosen(!playing)}
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          className="absolute right-[5cqw] bottom-[5cqw] z-10 grid size-[14cqw] place-items-center rounded-full bg-black/60 text-white outline-hidden backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-solid"
        >
          <svg viewBox="0 0 16 16" className="size-[6cqw]" fill="currentColor" aria-hidden>
            {playing ? (
              <path d="M4.5 3h2.5v10H4.5zM9 3h2.5v10H9z" />
            ) : (
              <path d="M5 3.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 5 3.2Z" />
            )}
          </svg>
        </button>
      )}
    </>
  );
}
