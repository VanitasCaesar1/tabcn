import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Arrow } from './arrow';

export interface PagerEntry {
  href: string;
  title: string;
}

// Previous and next at the foot of a page: designs walk the sidebar's order, docs their own.
export function Pager({
  label,
  previous,
  next,
}: {
  label: string;
  previous?: PagerEntry | null;
  next?: PagerEntry | null;
}) {
  return (
    <nav aria-label={label} className="grid grid-cols-2 gap-3">
      {[
        { entry: previous, text: 'Previous', align: 'items-start' },
        { entry: next, text: 'Next', align: 'items-end text-right' },
      ].map(({ entry, text, align }) =>
        entry ? (
          <Link
            key={text}
            href={entry.href}
            className={cn(
              'group/pager flex flex-col gap-1 rounded-2xl border border-border p-4 outline-hidden transition-[background-color] duration-150 ease-out hover:bg-surface focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:bg-foreground/10 active:duration-100',
              align,
            )}
          >
            <span className="flex items-center gap-1 text-muted text-xs">
              {text === 'Previous' && (
                <Arrow
                  direction="left"
                  className="size-3 transition-[translate] duration-150 ease-out group-hover/pager:-translate-x-0.5 motion-reduce:transition-none"
                />
              )}
              {text}
              {text === 'Next' && (
                <Arrow
                  direction="right"
                  className="size-3 transition-[translate] duration-150 ease-out group-hover/pager:translate-x-0.5 motion-reduce:transition-none"
                />
              )}
            </span>
            <span className="truncate font-medium text-sm">{entry.title}</span>
          </Link>
        ) : (
          <span key={text} />
        ),
      )}
    </nav>
  );
}
