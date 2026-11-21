import Link from 'next/link';
import { groups } from '@/lib/designs';
import { site } from '@/lib/site';
import { Arrow } from './arrow';
import { Logomark } from './logomark';
import type { SidebarGroup } from './sidebar-groups';
import { SidebarGroups } from './sidebar-groups';

/** The groups as the sidebar's client list needs them (shared with the phone menu). */
export const sidebarGroups: SidebarGroup[] = groups.map((g) => ({
  id: g.id,
  label: g.label,
  count: g.items.length,
  layouts: g.layouts.map((l) => ({
    layout: l.layout,
    label: l.label,
    items: l.items.map(({ id, title, thumb, background, isNew }) => ({
      id,
      title,
      thumb,
      background,
      isNew,
    })),
  })),
}));

/** The mark, the name and the pre-release chip: the sidebar's and the phone menu's top row. */
export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
    >
      <Logomark />
      <span className="font-semibold text-[15px] text-foreground tracking-tight">tabcn</span>
      <span className="flex h-5 items-center rounded-full px-1.5 font-mono text-[11px] text-muted shadow-[inset_0_0_0_1px_var(--border)]">
        pre-release
      </span>
    </Link>
  );
}

const footLink =
  'inline-flex items-center gap-0.5 rounded-sm outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 motion-reduce:transition-none';

// A real column on wide screens: full height, one hairline between it and the page. The brand on
// top lines up with the header; under it, the design groups, each opening to its designs; links
// to the quick start and the design docs at the foot. (Layout from ui lab,
// https://lab.xevrion.dev, MIT.)
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-border border-r lg:flex">
      <div className="flex h-14 shrink-0 items-center border-border border-b px-5">
        <Brand />
      </div>
      <nav aria-label="Designs" className="flex min-h-0 flex-1 flex-col">
        <SidebarGroups groups={sidebarGroups} />
      </nav>
      <div className="flex h-11 shrink-0 items-center gap-4 border-border border-t px-5 text-[12px] text-muted">
        <Link href="/#quick-start" className={footLink}>
          Quick start
        </Link>
        <a
          href={`${site.repo}/tree/main/docs/designs`}
          target="_blank"
          rel="noreferrer"
          className={footLink}
        >
          Docs
          <Arrow direction="up-right" className="size-3" />
        </a>
      </div>
    </aside>
  );
}
