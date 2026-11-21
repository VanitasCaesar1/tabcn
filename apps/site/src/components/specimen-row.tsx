import Link from 'next/link';
import type { Design } from '@/lib/designs';
import { designPath } from '@/lib/site';
import { LoopTile } from './loop-tile';
import { Facts, facts, SourceButton } from './specimen-card';

// One design in the catalogue's list view: a thumbnail of its bar, the title over its one-line
// description, the facts on wide screens, and the source button. Hovering the row plays the
// thumbnail's loop. On phones the description gives way to a short facts line.
export function SpecimenRow({ design }: { design: Design }) {
  const all = facts(design);
  const short = design.kind === 'panel' ? all : all.slice(0, 2);
  return (
    <li
      data-loop-host
      className="specimen-row relative grid h-16 grid-cols-[96px_minmax(0,1fr)_28px] items-center gap-3 px-2.5 sm:h-[60px] sm:grid-cols-[132px_minmax(0,1fr)_28px] sm:gap-4 @min-[1100px]/cat:grid-cols-[132px_minmax(0,1fr)_auto_28px]"
    >
      <LoopTile
        id={design.id}
        title={design.title}
        background={design.background}
        poster={design.loopPoster ?? design.fallbackPoster}
        loop={design.loop}
        panel={design.kind === 'panel' && !design.loop}
        variant="row"
      />
      <div className="min-w-0">
        <h3 className="truncate font-medium text-[14px] leading-5">
          <Link
            href={designPath(design.id)}
            aria-describedby={`${design.id}-row-about`}
            className="outline-hidden after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-foreground focus-visible:after:outline-solid focus-visible:after:-outline-offset-2"
          >
            {design.title}
          </Link>
        </h3>
        <p id={`${design.id}-row-about`} className="hidden text-[13px] text-muted sm:line-clamp-1">
          {design.description}
        </p>
        <p className="truncate text-[12px] text-muted tabular-nums sm:hidden">
          <Facts items={short} />
        </p>
      </div>
      <p className="hidden whitespace-nowrap text-right text-[13px] text-muted tabular-nums @min-[1100px]/cat:block">
        <Facts items={all} />
      </p>
      <SourceButton design={design} />
    </li>
  );
}
