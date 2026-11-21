'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { docs } from '@/lib/docs';

const trim = (path: string) => path.replace(/\/+$/, '');

// The docs at the top of the sidebar and the phone menu, above the design groups, the way
// shadcn's sidebar puts its guides above its components. The page you're on is marked as a
// design is.
export function SidebarDocs() {
  const pathname = trim(usePathname() ?? '');
  return (
    <div className="mb-3">
      <p className="mb-1 px-2 font-medium text-[11px] text-muted">Docs</p>
      <ul className="flex flex-col">
        {docs.map((page) => {
          const active = pathname === trim(page.href);
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-8 items-center gap-2.5 rounded-[10px] px-2 text-[13px] outline-hidden transition-[color,background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
                  active
                    ? 'bg-surface font-medium text-foreground'
                    : 'text-muted hover:bg-surface/60 hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-foreground transition-[opacity] duration-200 ease-out motion-reduce:transition-none',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{page.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 px-2 font-medium text-[11px] text-muted">Designs</p>
    </div>
  );
}
