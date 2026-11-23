'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { groupPath, stylePath } from '@/lib/site';
import { setParam } from './catalogue-url';

// A link to the gallery filtered to one style (`s`) or one layout group (`c`): the footer and the
// breadcrumb. Already on the home page, a navigation wouldn't reach the gallery (its filters live
// in the URL it reads itself), so the link sets the filter there and scrolls to it instead.
export function GroupLink({
  param = 'c',
  group,
  className,
  children,
}: {
  param?: 's' | 'c';
  group: string;
  className?: string;
  children: React.ReactNode;
}) {
  const home = usePathname() === '/';
  return (
    <Link
      href={param === 's' ? stylePath(group) : groupPath(group)}
      className={className}
      onClick={(e) => {
        if (!home || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        setParam(param === 's' ? 'c' : 's', null);
        setParam(param, group);
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
