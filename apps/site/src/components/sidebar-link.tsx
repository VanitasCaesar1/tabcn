'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { designPath } from '@/lib/site';

const trim = (path: string) => path.replace(/\/+$/, '');

// From ui lab's sidebar link (https://lab.xevrion.dev, MIT, see LICENSE-ui-lab).
export function SidebarLink({ id, title }: { id: string; title: string }) {
  const href = designPath(id);
  const active = trim(usePathname() ?? '') === trim(href);
  const ref = useRef<HTMLAnchorElement>(null);

  // Arriving on a design brings its row into the middle of the list. Only the list scrolls.
  useEffect(() => {
    const el = ref.current;
    const list = el?.closest('nav');
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
        'relative flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-foreground',
        active
          ? 'bg-surface font-medium text-foreground'
          : 'text-muted hover:bg-surface/60 hover:text-foreground',
      )}
    >
      {/* A short bar marks where you are. */}
      <span
        aria-hidden
        className={cn(
          'absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-foreground transition-[opacity,scale] duration-200 ease-out',
          active ? 'scale-y-100 opacity-100' : 'scale-y-50 opacity-0',
        )}
      />
      <span className="truncate">{title}</span>
    </Link>
  );
}
