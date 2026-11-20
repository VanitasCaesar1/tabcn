'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { designPath, sourceUrl } from '@/lib/site';
import { Arrow } from './arrow';
import { DesignPhone, type ScreenMedia } from './phone';

export interface CardItem extends ScreenMedia {
  id: string;
  description: string;
  layoutLabel: string;
}

// An index card whose recording plays while it's hovered or focused, and on phones while it's
// mostly on screen. (ui lab's lab card, MIT.) The preview shows the lower part of the phone,
// where the tab bar is.
export function DesignCard({ item }: { item: CardItem }) {
  const [play, setPlay] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia('(hover: none)').matches) return;
    const io = new IntersectionObserver(([entry]) => setPlay(entry?.isIntersecting ?? false), {
      threshold: 0.6,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="group/card relative rounded-[20px] bg-background p-2 shadow-raised transition-[background-color] duration-150 ease-out hover:bg-surface"
      onPointerEnter={(e) => e.pointerType !== 'touch' && setPlay(true)}
      onPointerLeave={(e) => e.pointerType !== 'touch' && setPlay(false)}
      onFocus={() => setPlay(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPlay(false);
      }}
    >
      <div
        inert
        className="flex h-56 items-end justify-center overflow-hidden rounded-xl bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px)] bg-surface [background-size:16px_16px] transition-[background-color] duration-150 ease-out [content-visibility:auto] group-hover/card:bg-background"
      >
        {/* The lower half of the phone, fading out at the top, so the tab bar is what you see. */}
        <div className="absolute inset-x-2 top-2 flex h-56 items-end justify-center overflow-hidden rounded-xl [mask-image:linear-gradient(to_bottom,transparent_8%,black_55%)]">
          <DesignPhone
            media={item}
            play={play}
            className="w-[190px] -translate-y-3 transition-[translate] duration-300 ease-out group-hover/card:-translate-y-4 motion-reduce:transition-none"
          />
        </div>
      </div>
      <div className="px-2 pt-3 pb-1">
        <p className="pr-20 font-medium text-sm">
          {/* The title is the card's link, stretched over the whole card by its ::after. */}
          <Link
            href={designPath(item.id)}
            className="outline-hidden after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-foreground focus-visible:after:outline-solid focus-visible:after:outline-offset-2"
          >
            {item.title}
          </Link>
        </p>
        <p className="mt-0.5 text-muted text-sm">{item.layoutLabel}</p>
      </div>
      {/* Above the stretched link, so it stays its own target. */}
      <a
        href={sourceUrl(item.id)}
        target="_blank"
        rel="noreferrer"
        aria-label={`View source of ${item.title} on GitHub`}
        className="group/link absolute top-[242px] right-3 z-10 inline-flex items-center gap-0.5 px-1.5 py-1 text-muted text-xs transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96] group-hover/card:text-foreground motion-reduce:transition-none"
      >
        <span className="relative">
          source
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-current transition-[scale] duration-200 ease-out group-hover/link:scale-x-100 motion-reduce:transition-none"
          />
        </span>
        <Arrow
          direction="up-right"
          className="size-3 transition-[translate] duration-150 ease-out group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
        />
      </a>
    </li>
  );
}
