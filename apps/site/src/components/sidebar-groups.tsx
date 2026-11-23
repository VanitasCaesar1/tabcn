'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { TIMING_MS } from './motion';
import { SidebarDocs } from './sidebar-docs';
import { type SidebarItem, SidebarLink } from './sidebar-link';

export interface SidebarGroup {
  /** A style id, or 'panels'. */
  id: string;
  label: string;
  count: number;
  items: SidebarItem[];
}

/** The sections someone closed (everything else stays open). */
const STORAGE_KEY = 'tabcn-sidebar-closed';

function readStored(valid: Set<string>): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(value) ? value.filter((v): v is string => valid.has(v)) : [];
  } catch {
    return [];
  }
}

function store(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

const plural = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`;

// The sidebar's list, shared by the desktop column and the phone menu: the docs, then the designs
// by style and the panels, one section each, all open until someone closes one. Closed sections
// are remembered; a design page always opens its own. The server renders every section open, so
// hydration agrees, and the saved choice applies just after.
export function SidebarGroups({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname() ?? '';
  const baseId = useId();

  const routeId = pathname.match(/^\/designs\/([^/]+)/)?.[1];
  const routeGroup = routeId
    ? groups.find((g) => g.items.some((d) => d.id === routeId))?.id
    : undefined;

  const [closed, setClosed] = useState<string[]>([]);

  useEffect(() => {
    const saved = readStored(new Set(groups.map((g) => g.id)));
    setClosed(saved.filter((id) => id !== routeGroup));
  }, [groups, routeGroup]);

  const toggle = (gid: string) => {
    const next = closed.includes(gid) ? closed.filter((c) => c !== gid) : [...closed, gid];
    setClosed(next);
    store(next);
  };

  return (
    <div
      data-sidebar-scroll
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-4 pb-10 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ '--timing-ms': `${TIMING_MS}ms` } as React.CSSProperties}
    >
      <SidebarDocs />
      <ul className="flex flex-col gap-3">
        {groups.map((g) => {
          const isOpen = !closed.includes(g.id);
          const panelId = `${baseId}-${g.id}`;
          return (
            <li key={g.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={`${g.label}, ${plural(g.count)}`}
                onClick={() => toggle(g.id)}
                className="group/head flex h-7 w-full touch-manipulation items-center gap-2 rounded-md px-2 text-left text-[12px] text-muted outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2 motion-reduce:transition-none"
              >
                <span className="flex-1 font-medium">{g.label}</span>
                <span className="tabular-nums">{g.count}</span>
                <Caret open={isOpen} />
              </button>
              <div id={panelId} className="side-fold" data-open={isOpen ? '' : undefined}>
                <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                  <ul className="flex flex-col pt-0.5">
                    {g.items.map((d) => (
                      <li key={d.id}>
                        <SidebarLink item={d} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Down when open, right when closed: the two glyphs crossfade (nothing turns). */
function Caret({ open }: { open: boolean }) {
  const path =
    'stroke-current transition-opacity duration-150 ease-out motion-reduce:transition-none';
  return (
    <svg aria-hidden viewBox="0 0 12 12" fill="none" className="size-3 shrink-0">
      <path
        d="m4.5 3 3 3-3 3"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(path, open ? 'opacity-0' : 'opacity-100')}
      />
      <path
        d="m3 4.5 3 3 3-3"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(path, open ? 'opacity-100' : 'opacity-0')}
      />
    </svg>
  );
}
