import Link from 'next/link';
import { groups } from '@/lib/designs';
import { SidebarLink } from './sidebar-link';

// The list itself, shared by the desktop column and the phone menu: every design, grouped by
// layout, with a count per group.
export function SidebarNav() {
  return (
    <div className="flex flex-col gap-7">
      {groups.map((g) => (
        <div key={g.id}>
          <p className="mb-1.5 flex items-baseline justify-between px-3 font-medium text-muted text-xs">
            {g.label}
            <span className="font-normal tabular-nums">{g.items.length}</span>
          </p>
          <ul className="flex flex-col">
            {g.items.map((d) => (
              <li key={d.id}>
                <SidebarLink id={d.id} title={d.title} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// A real column on wide screens: full height, its own scroll, one hairline between it and the
// page. (Layout from ui lab, https://lab.xevrion.dev, MIT.)
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-border border-r lg:flex">
      <Link
        href="/"
        className="flex h-14 shrink-0 items-baseline gap-2 border-border border-b px-6 pt-[19px] outline-hidden focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:-outline-offset-2"
      >
        <span className="font-semibold text-[15px] text-foreground tracking-tight">tabcn</span>
        <span className="text-[13px] text-muted">tab bars for Expo</span>
      </Link>
      <nav
        aria-label="All designs"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-6 pb-12 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-40px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <SidebarNav />
      </nav>
    </aside>
  );
}
