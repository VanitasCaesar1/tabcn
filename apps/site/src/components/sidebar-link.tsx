'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { designPath } from '@/lib/site';

const trim = (path: string) => path.replace(/\/+$/, '');

export interface SidebarItem {
  id: string;
  title: string;
  thumb: string | null;
  background: string;
  isNew: boolean;
}

// One design in the sidebar: a thumbnail of its bar on the demo colour, then its title. (From
// ui lab's sidebar link, https://lab.xevrion.dev, MIT, see LICENSE-ui-lab.)
export function SidebarLink({ item }: { item: SidebarItem }) {
  const href = designPath(item.id);
  const active = trim(usePathname() ?? '') === trim(href);
  const ref = useRef<HTMLAnchorElement>(null);

  // Arriving on a design brings its row into the middle of the list. Only the list scrolls.
  useEffect(() => {
    const el = ref.current;
    const list = el?.closest<HTMLElement>('[data-sidebar-scroll]');
    if (!active || !el || !list) return;
    const top = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
    if (
      el.offsetTop < list.scrollTop + 40 ||
      el.offsetTop > list.scrollTop + list.clientHeight - 80
    )
      list.scrollTo({ top });
  }, [active]);

  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-8 items-center gap-2.5 rounded-[10px] px-2 text-[13px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
        active
          ? 'bg-surface font-medium text-foreground'
          : 'text-muted hover:bg-surface/60 hover:text-foreground',
      )}
    >
      {/* A short bar marks where you are. */}
      <span
        aria-hidden
        className={cn(
          'absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-foreground transition-[opacity] duration-200 ease-out motion-reduce:transition-none',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span
        aria-hidden
        className="relative h-4 w-[46px] shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_var(--tile-ring)]"
        style={{ backgroundColor: item.background }}
      >
        {item.thumb && (
          // biome-ignore lint/performance/noImgElement: a static export of tiny, pre-sized JPGs.
          <img
            src={item.thumb}
            alt=""
            width={138}
            height={48}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-cover"
          />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.isNew && (
        <span className="size-1.5 shrink-0 rounded-full bg-foreground">
          <span className="sr-only">New</span>
        </span>
      )}
    </Link>
  );
}
