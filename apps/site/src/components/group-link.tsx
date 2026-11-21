'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteGroupId } from '@/lib/groups';
import { groupPath } from '@/lib/site';
import { setParam } from './catalogue-url';

// A link to the catalogue showing one group (footer, breadcrumb). Already on the home page, a
// navigation wouldn't reach the catalogue (its group lives in the URL it reads itself), so the
// link sets the group there and scrolls to it instead.
export function GroupLink({
  group,
  className,
  children,
}: {
  group: SiteGroupId;
  className?: string;
  children: React.ReactNode;
}) {
  const home = usePathname() === '/';
  return (
    <Link
      href={groupPath(group)}
      className={className}
      onClick={(e) => {
        if (!home || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setParam('c', group);
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        document
          .getElementById('designs')
          ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }}
    >
      {children}
    </Link>
  );
}
