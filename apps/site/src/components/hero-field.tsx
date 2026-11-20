'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

export interface HeroCard {
  src: string;
  /** Centre, in percent of the hero. */
  x: number;
  y: number;
  /** Width in pixels on wide screens; phones scale it down. */
  w: number;
  /** 0 is nearest, 1 is farthest: smaller, fainter and further back. */
  depth: number;
  /** Landscape cards crop to the bar; portrait ones show the whole still. */
  shape: 'wide' | 'tall';
  /** Shown on phones too; the rest only appear from `sm` up. */
  phone: boolean;
  seed: number;
}

// A small deterministic random, so the server HTML and every visit match.
function rand(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function motionVars(card: HeroCard) {
  const r = rand(card.seed);
  const between = (min: number, max: number) => min + (max - min) * r();
  const sign = () => (r() < 0.5 ? -1 : 1);
  const tilt = (span: number) => {
    const a = between(-span, span);
    return [a, a + sign() * between(span * 0.6, span * 1.4)] as const;
  };
  const [rx0, rx1] = tilt(9);
  const [ry0, ry1] = tilt(12);
  const [rz0, rz1] = tilt(7);
  const reach = 10 + 14 * (1 - card.depth);
  return {
    '--x': `${card.x}%`,
    '--y': `${card.y}%`,
    '--w': `${card.w}px`,
    '--o': (0.9 - card.depth * 0.55).toFixed(2),
    '--z': `${Math.round(-card.depth * 120)}px`,
    '--tx': `${Math.round(sign() * between(reach * 0.5, reach))}px`,
    '--ty': `${Math.round(sign() * between(reach * 0.5, reach))}px`,
    '--rx0': `${rx0.toFixed(1)}deg`,
    '--rx1': `${rx1.toFixed(1)}deg`,
    '--ry0': `${ry0.toFixed(1)}deg`,
    '--ry1': `${ry1.toFixed(1)}deg`,
    '--rz0': `${rz0.toFixed(1)}deg`,
    '--rz1': `${rz1.toFixed(1)}deg`,
    '--df': `${between(14, 24).toFixed(1)}s`,
    '--dt': `${between(19, 33).toFixed(1)}s`,
    '--delay': `${(-between(0, 30)).toFixed(1)}s`,
  } as React.CSSProperties;
}

// A few tab bar cards at the sides of the home headline, floating slowly. Purely decorative. CSS does
// the motion; this only pauses it while the hero is off screen or the tab is hidden.
export function HeroField({ cards }: { cards: HeroCard[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = true;
    const sync = () => el.toggleAttribute('data-paused', !onScreen || document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    });
    io.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="hero-field pointer-events-none absolute inset-0 -z-10">
      {cards.map((card) => (
        <div
          key={`${card.src}-${card.x}-${card.y}`}
          className={cn('hero-card', !card.phone && 'max-sm:hidden')}
          style={motionVars(card)}
        >
          <div
            className={cn(
              'overflow-hidden rounded-2xl bg-surface shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_10%,transparent),0_24px_48px_-16px_oklch(0_0_0/0.45)]',
              card.shape === 'wide' ? 'aspect-[3/2]' : 'aspect-[420/522]',
            )}
          >
            {/* biome-ignore lint/performance/noImgElement: a static export of small, pre-sized JPGs. */}
            <img
              src={card.src}
              alt=""
              width={420}
              height={522}
              decoding="async"
              draggable={false}
              className="size-full object-cover object-bottom"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
