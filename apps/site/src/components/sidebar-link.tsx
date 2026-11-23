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
  isNew: boolean;
}

// One design in the sidebar: its title, in the accent colour while you're on its page. (From ui
// lab's sidebar link, https://lab.xevrion.dev, MIT, see LICENSE-ui-lab.)
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
        'relative flex h-8 items-center gap-2 rounded-lg px-2 text-[14px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
        active
          ? 'bg-cell font-medium text-accent'
          : 'text-foreground/80 hover:bg-cell/60 hover:text-foreground',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
      {item.isNew && (
        <span className="flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] text-muted shadow-[inset_0_0_0_1px_var(--card-border)]">
          New
        </span>
      )}
    </Link>
  );
}
