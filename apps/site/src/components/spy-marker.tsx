'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { SPRING_MS, TIMING_MS } from './motion';

// The docs are pages of their own; the other links go to sections of the home page.
const LINKS = [
  { id: 'docs', label: 'Docs', href: '/docs/' },
  { id: 'designs', label: 'Designs' },
  { id: 'how', label: 'How it works' },
  { id: 'quick-start', label: 'Quick start' },
] as const;

type Id = (typeof LINKS)[number]['id'];
const SECTIONS = LINKS.filter((l) => !('href' in l));

// The header's links to the home page's sections, with a 2 px marker under the one you're
// reading. A section counts as read while it crosses a thin band a little above the middle of
// the window. In the gap between two sections the one above stays marked, so the marker glides
// from link to link; only while the band is above the first section (the hero) is no link marked.
export function SpyNav() {
  const pathname = usePathname() ?? '';
  const home = pathname === '/';
  const inDocs = pathname.startsWith('/docs');
  const nav = useRef<HTMLElement>(null);
  const [active, setActive] = useState<Id | null>(null);
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!home) {
      setActive(inDocs ? 'docs' : null);
      return;
    }
    const inBand = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const crossing = SECTIONS.find((l) => inBand.has(l.id))?.id;
        if (crossing) {
          setActive(crossing);
          return;
        }
        // Nothing in the band: the last section whose top is above it, if any.
        const bandTop = document.documentElement.clientHeight * 0.4;
        const above = SECTIONS.filter(
          ({ id }) =>
            (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) < bandTop,
        );
        setActive(above.at(-1)?.id ?? null);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [home, inDocs]);

  // Measures the active link. A marker that was off takes its place first and fades in on the
  // next frame, so it never glides in from where it was last.
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    const link = nav.current?.querySelector<HTMLElement>(`[data-spy="${active}"]`);
    if (!link) return;
    setMarker({ left: link.offsetLeft, width: link.offsetWidth });
    const frame = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <nav
      ref={nav}
      aria-label="Site"
      className="relative flex items-center gap-5 self-stretch"
      style={
        { '--spring-ms': `${SPRING_MS}ms`, '--timing-ms': `${TIMING_MS}ms` } as React.CSSProperties
      }
    >
      {LINKS.map((l) => (
        <Link
          key={l.id}
          href={'href' in l ? l.href : `/#${l.id}`}
          data-spy={l.id}
          aria-current={active === l.id ? ('href' in l ? 'page' : 'location') : undefined}
          className={cn(
            'rounded-sm font-medium text-[13px] outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-4 motion-reduce:transition-none',
            active === l.id ? 'text-foreground' : 'text-muted',
          )}
        >
          {l.label}
        </Link>
      ))}
      <span
        aria-hidden
        className="spy-marker absolute bottom-[-1px] h-0.5 rounded-full bg-foreground"
        data-on={on ? '' : undefined}
        style={{
          left: marker?.left ?? 0,
          width: marker?.width ?? 0,
          opacity: on ? 1 : 0,
        }}
      />
    </nav>
  );
}
