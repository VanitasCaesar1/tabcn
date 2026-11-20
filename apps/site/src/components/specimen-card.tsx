import Link from 'next/link';
import type { Design } from '@/lib/designs';
import { designPath, sourceUrl } from '@/lib/site';
import { LoopTile } from './loop-tile';

/** The facts under a title: layout, tab count, action button; a panel names its bar. */
export function facts(design: Design) {
  if (design.kind === 'panel') {
    return [design.layoutLabel, ...(design.pairedBar ? [`with ${design.pairedBar}`] : [])];
  }
  return [
    design.layoutLabel,
    ...(design.tabs ? [`${design.tabs} tabs`] : []),
    ...(design.hasAction ? ['Action button'] : []),
  ];
}

export function Facts({ items }: { items: string[] }) {
  return items.map((item, i) => (
    <span key={item}>
      {i > 0 && (
        <span aria-hidden className="text-border">
          {' · '}
        </span>
      )}
      {item}
    </span>
  ));
}

/** The source button on cards and rows: above the stretched title link, so it's its own target. */
export function SourceButton({ design }: { design: Design }) {
  return (
    <a
      href={sourceUrl(design.id)}
      target="_blank"
      rel="noreferrer"
      className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-muted outline-hidden transition-[background-color,color] duration-150 ease-out hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid active:bg-foreground/10 active:duration-100 motion-reduce:transition-none"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5" />
      </svg>
      <span className="sr-only">Source of {design.title} on GitHub</span>
    </a>
  );
}

// One design in the catalogue's grid: its bar on the demo colour, then the title and a line of
// facts. The title is the card's one link, stretched over the card; hovering or focusing the
// card outlines the tile, as the hero marks its bar in focus, and plays its loop.
export function SpecimenCard({ design }: { design: Design }) {
  const panel = design.kind === 'panel';
  const descriptionId = `${design.id}-about`;
  return (
    <li
      data-loop-host
      className="specimen relative rounded-[18px] bg-background p-1.5 shadow-raised"
    >
      <LoopTile
        id={design.id}
        title={design.title}
        background={design.background}
        poster={design.loopPoster ?? design.fallbackPoster}
        loop={design.loop}
        panel={panel}
      />
      <div className="px-2.5 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 truncate font-medium text-[14px] leading-5">
            <Link
              href={designPath(design.id)}
              aria-describedby={descriptionId}
              className="outline-hidden after:absolute after:inset-0 after:rounded-[18px]"
            >
              {design.title}
            </Link>
          </h3>
          {design.isNew && (
            <span className="flex h-5 shrink-0 items-center rounded-full bg-foreground px-1.5 font-medium text-[11px] text-background">
              New
            </span>
          )}
          <span className="ml-auto" />
          <SourceButton design={design} />
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted tabular-nums">
          <Facts items={facts(design)} />
        </p>
        <span id={descriptionId} className="sr-only">
          {design.description}
        </span>
      </div>
    </li>
  );
}
