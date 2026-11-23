import Link from 'next/link';
import { cn } from '@/lib/cn';
import type { Design } from '@/lib/designs';
import { SITE_GROUPS } from '@/lib/groups';
import { designPath } from '@/lib/site';
import { LoopTile } from './loop-tile';

/** The short layout name a card shows: Floating, Docked, With action, Rails or Panels. */
export function layoutTag(design: Design) {
  return SITE_GROUPS.find((g) => g.id === design.group)?.label ?? design.layoutLabel;
}

/** A small neutral tag: a design's style or layout. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-6 shrink-0 items-center rounded-md px-2 text-[12px] text-muted shadow-[inset_0_0_0_1px_var(--card-border)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

// One design in the gallery: one shared card, the design's bar playing in the foot of a phone on
// the card's stage, then its title and two tags (style and layout). The title is the card's one
// link, stretched over it; hovering or focusing the card darkens its hairline and plays the loop.
export function SpecimenCard({ design }: { design: Design }) {
  const panel = design.kind === 'panel';
  const descriptionId = `${design.id}-about`;
  return (
    <li
      data-loop-host
      className="specimen relative overflow-hidden rounded-2xl border border-card-border bg-card"
    >
      <LoopTile
        id={design.id}
        title={design.title}
        poster={design.loopPoster ?? design.fallbackPoster}
        loop={design.loop}
        panel={panel}
      />
      <div className="flex h-12 items-center gap-2 border-card-border border-t pr-3 pl-4">
        <h3 className="min-w-0 flex-1 truncate font-medium text-[14px] leading-5">
          <Link
            href={designPath(design.id)}
            aria-describedby={descriptionId}
            className="outline-hidden after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-foreground focus-visible:after:outline-solid focus-visible:after:-outline-offset-2"
          >
            {design.title}
          </Link>
        </h3>
        {design.isNew && <Tag className="text-foreground">New</Tag>}
        <Tag>{design.styleLabel}</Tag>
        <Tag className="max-[380px]:hidden">{layoutTag(design)}</Tag>
        <span id={descriptionId} className="sr-only">
          {design.description}
        </span>
      </div>
    </li>
  );
}
