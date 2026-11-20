'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { isSiteGroup, type SiteGroupId } from '@/lib/groups';
import { LayoutIcon } from './layout-icons';
import { CUT_IN_MS, CUT_OUT_MS, SPRING_MS, TIMING_MS } from './motion';
import { type SidebarItem, SidebarLink } from './sidebar-link';
import { useCut } from './use-cut';

export interface SidebarGroup {
  id: SiteGroupId;
  label: string;
  count: number;
  layouts: { layout: string; label: string; items: SidebarItem[] }[];
}

const STORAGE_KEY = 'tabcn-sidebar-group';

function readStored(): SiteGroupId | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && isSiteGroup(value) ? value : null;
  } catch {
    return null;
  }
}

function store(id: SiteGroupId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

const plural = (n: number) => `${n} ${n === 1 ? 'design' : 'designs'}`;

// The sidebar's list, shared by the desktop column and the phone menu: a small dock of the five
// groups (a tab bar, like the hero's), then the chosen group's designs. A design page opens on
// its own group; the home page on the group last picked, or Floating. The server renders that
// route's group, so hydration agrees, and a saved pick applies just after.
export function SidebarGroups({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname() ?? '';
  const id = useId();
  const listId = `${id}-list`;
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const pressed = useRef(false);

  const routeId = pathname.match(/^\/designs\/([^/]+)/)?.[1];
  const routeGroup = routeId
    ? groups.find((g) => g.layouts.some((l) => l.items.some((d) => d.id === routeId)))?.id
    : undefined;

  const [picked, setPicked] = useState<SiteGroupId | null>(null);
  const [lastRoute, setLastRoute] = useState(routeGroup);
  // Arriving on a design shows its group.
  if (routeGroup !== lastRoute) {
    setLastRoute(routeGroup);
    setPicked(null);
  }

  // The home page reopens the group last picked.
  useEffect(() => {
    if (routeGroup) return;
    const saved = readStored();
    if (saved) setPicked(saved);
  }, [routeGroup]);

  const fallback = groups[0]?.id ?? 'floating';
  const selected = picked ?? routeGroup ?? fallback;
  const index = Math.max(
    0,
    groups.findIndex((g) => g.id === selected),
  );
  const { shown, hidden } = useCut(selected, (g) => g, { animate: () => pressed.current });
  const group = groups.find((g) => g.id === shown) ?? groups[0];
  const current = groups[index];

  const choose = (i: number, focus = false) => {
    const g = groups[i];
    if (!g) return;
    pressed.current = true;
    setPicked(g.id);
    store(g.id);
    if (focus) tabs.current[i]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = groups.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    choose(next, true);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={
        {
          '--spring-ms': `${SPRING_MS}ms`,
          '--timing-ms': `${TIMING_MS}ms`,
          '--cut-out-ms': `${CUT_OUT_MS}ms`,
          '--cut-in-ms': `${CUT_IN_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div className="shrink-0 px-3 pt-4">
        <div
          role="tablist"
          aria-label="Design groups"
          onKeyDown={onKeyDown}
          className="relative grid h-10 rounded-full bg-surface p-1 shadow-raised"
          style={
            {
              gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
              '--g': index,
              '--n': groups.length,
            } as React.CSSProperties
          }
        >
          <span aria-hidden className="dock-capsule side-capsule" />
          {groups.map((g, i) => {
            const on = i === index;
            return (
              <button
                key={g.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={listId}
                aria-label={`${g.label}, ${plural(g.count)}`}
                tabIndex={on ? 0 : -1}
                onClick={() => choose(i)}
                className={cn(
                  'seg relative grid min-w-0 touch-manipulation place-items-center rounded-full outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2',
                  on ? 'text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                <LayoutIcon group={g.id} className="size-4" />
              </button>
            );
          })}
        </div>
        {current && (
          <p className="mt-2 flex items-baseline justify-between px-2 text-[12px]">
            <span className="font-medium text-foreground">{current.label}</span>
            <span className="text-muted tabular-nums">{current.count}</span>
          </p>
        )}
      </div>

      <div
        data-sidebar-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-10 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-32px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          id={listId}
          role="tabpanel"
          aria-label={group?.label}
          className="sidebar-list"
          data-cut={hidden ? '' : undefined}
        >
          {group?.layouts.map((l) => (
            <div key={l.layout}>
              {group.layouts.length > 1 && (
                <p className="mt-3 mb-1 flex items-baseline justify-between px-2 font-medium text-[12px] text-muted">
                  {l.label}
                  <span className="font-normal tabular-nums">{l.items.length}</span>
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
  );
}
