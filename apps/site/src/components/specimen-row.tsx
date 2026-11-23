import Link from 'next/link';
import type { Design } from '@/lib/designs';
import { designPath } from '@/lib/site';
import { LoopTile } from './loop-tile';
import { layoutTag, Tag } from './specimen-card';

// One design in the gallery's list view: a crop of its bar, the title over its one-line
// description, and its style and layout on wide screens. Hovering the row plays the crop's loop.
export function SpecimenRow({ design }: { design: Design }) {
  return (
    <li
      data-loop-host
      className="specimen-row relative grid h-16 grid-cols-[96px_minmax(0,1fr)] items-center gap-3 px-3 sm:h-[68px] sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-4 @min-[880px]/cat:grid-cols-[132px_minmax(0,1fr)_auto]"
    >
      <LoopTile
        id={design.id}
        title={design.title}
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
        <p id={`${design.id}-row-about`} className="truncate text-[13px] text-muted">
          {design.description}
        </p>
      </div>
      <div className="hidden items-center gap-2 @min-[880px]/cat:flex">
        <Tag>{design.styleLabel}</Tag>
        <Tag>{layoutTag(design)}</Tag>
      </div>
    </li>
  );
}
