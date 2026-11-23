'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { DOC_GROUPS, docs } from '@/lib/docs';

const trim = (path: string) => path.replace(/\/+$/, '');

// The docs at the top of the sidebar and the phone menu, above the design groups, the way
// shadcn's sidebar puts its guides above its components. The page you're on is marked as a
// design is.
export function SidebarDocs() {
  const pathname = trim(usePathname() ?? '');
  return (
    <div className="mb-5 flex flex-col gap-3">
      {DOC_GROUPS.map((group) => (
        <div key={group}>
          <p className="flex h-7 items-center px-2 font-medium text-[12px] text-muted">{group}</p>
          <ul className="flex flex-col">
            {docs
              .filter((page) => page.group === group)
              .map((page) => {
                const active = pathname === trim(page.href);
                return (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex h-8 items-center gap-2 rounded-lg px-2 text-[14px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
                        active
                          ? 'bg-cell font-medium text-accent'
                          : 'text-foreground/80 hover:bg-cell/60 hover:text-foreground',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{page.title}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
