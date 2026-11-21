'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { isSiteGroup, type SiteGroupId } from '@/lib/groups';
import { LayoutIcon } from './layout-icons';
import { TIMING_MS } from './motion';
import { type SidebarItem, SidebarLink } from './sidebar-link';

export interface SidebarGroup {
  id: SiteGroupId;
  label: string;
  count: number;
  layouts: { layout: string; label: string; items: SidebarItem[] }[];
}

const STORAGE_KEY = 'tabcn-sidebar-open';

function readStored(): SiteGroupId[] | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(value) ? value.filter((v): v is SiteGroupId => isSiteGroup(v)) : null;
  } catch {
    return null;
  }
}

function store(ids: SiteGroupId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

const plural = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`;

// The sidebar's list, shared by the desktop column and the phone menu: one row per group, named
// and counted, that opens to show that group's designs. Any number can be open. A design page
// opens its own group; the home page reopens the groups last left open, or Floating. The server
// renders the route's group open, so hydration agrees, and saved groups apply just after.
export function SidebarGroups({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname() ?? '';
  const baseId = useId();

  const routeId = pathname.match(/^\/designs\/([^/]+)/)?.[1];
  const routeGroup = routeId
    ? groups.find((g) => g.layouts.some((l) => l.items.some((d) => d.id === routeId)))?.id
    : undefined;
  const fallback = groups[0]?.id ?? 'floating';

  const [open, setOpen] = useState<SiteGroupId[]>([routeGroup ?? fallback]);
  const [lastRoute, setLastRoute] = useState(routeGroup);
  // Arriving on a design opens its group (and keeps the others as they were).
  if (routeGroup !== lastRoute) {
    setLastRoute(routeGroup);
    if (routeGroup && !open.includes(routeGroup)) setOpen([...open, routeGroup]);
  }

  // The home page reopens the groups last left open.
  useEffect(() => {
    if (routeGroup) return;
    const saved = readStored();
    if (saved) setOpen(saved);
  }, [routeGroup]);

  const toggle = (gid: SiteGroupId) => {
    const next = open.includes(gid) ? open.filter((o) => o !== gid) : [...open, gid];
    setOpen(next);
    store(next);
  };

  return (
    <div
      data-sidebar-scroll
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-10 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ '--timing-ms': `${TIMING_MS}ms` } as React.CSSProperties}
    >
      <ul className="flex flex-col gap-0.5">
        {groups.map((g) => {
          const isOpen = open.includes(g.id);
          const panelId = `${baseId}-${g.id}`;
          const here = g.id === routeGroup;
          return (
            <li key={g.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={`${g.label}, ${plural(g.count)}`}
                onClick={() => toggle(g.id)}
                className={cn(
                  'flex h-9 w-full touch-manipulation items-center gap-2.5 rounded-lg px-2 text-left text-[13px] outline-hidden transition-[background-color,color] duration-150 ease-out hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2 motion-reduce:transition-none',
                  isOpen || here ? 'text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface shadow-[inset_0_0_0_1px_var(--border)]">
                  <LayoutIcon group={g.id} className="size-4" />
                </span>
                <span className="flex-1 font-medium">{g.label}</span>
                <span className="text-[12px] text-muted tabular-nums">{g.count}</span>
                <Caret open={isOpen} />
              </button>
              <div id={panelId} className="side-fold" data-open={isOpen ? '' : undefined}>
                <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                  <div className="pt-0.5 pb-2 pl-3">
                    {g.layouts.map((l) => (
                      <div key={l.layout}>
                        {g.layouts.length > 1 && (
                          <p className="mt-2 mb-0.5 flex items-baseline justify-between px-2 text-[11px] text-muted">
                            {l.label}
                            <span className="tabular-nums">{l.items.length}</span>
                          </p>
                        )}
                        <ul className="flex flex-col">
                          {l.items.map((d) => (
                            <li key={d.id}>
                              <SidebarLink item={d} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
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
    <svg aria-hidden viewBox="0 0 12 12" fill="none" className="size-3 shrink-0 text-muted">
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
