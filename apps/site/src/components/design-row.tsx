import Link from 'next/link';
import type { Design } from '@/lib/designs';
import { designPath, sourceUrl } from '@/lib/site';
import { Arrow } from './arrow';

// One design in the catalogue's row view: its facts on the left, and the tab bar in each of its
// states (cropped to the bar) on the dotted stage to the right, scrolling sideways on narrow
// screens. Both halves open the design.
export function DesignRow({ design }: { design: Design }) {
  const href = designPath(design.id);
  const facts = [
    ...(design.tabs ? [['Tabs', String(design.tabs)]] : []),
    ['Layout', design.layoutLabel],
    design.kind === 'panel'
      ? ['Needs', 'TabBarProvider']
      : ['Action button', design.hasAction ? 'Yes' : 'No'],
  ];
  return (
    <li className="group/row grid gap-2 rounded-[20px] bg-background p-2 shadow-raised transition-[background-color] duration-150 ease-out hover:bg-surface md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="relative flex min-w-0 flex-col px-2 pt-2 pb-1 md:py-3">
        <h3 className="font-medium text-[15px]">
          {/* The title is the link, stretched over this half by its ::after. */}
          <Link
            href={href}
            className="outline-hidden after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-foreground focus-visible:after:outline-solid"
          >
            {design.title}
          </Link>
        </h3>
        <p className="mt-1 text-pretty text-muted text-sm leading-relaxed">{design.description}</p>
        <dl className="mt-4 flex flex-col gap-1.5 text-[13px] md:mt-auto md:pt-4">
          {facts.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">{label}</dt>
              <dd className="text-right tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <a
          href={sourceUrl(design.id)}
          target="_blank"
          rel="noreferrer"
          aria-label={`View source of ${design.title} on GitHub`}
          className="relative z-10 mt-3 inline-flex items-center gap-0.5 self-start rounded-sm text-muted text-xs outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
        >
          source
          <Arrow direction="up-right" className="size-3" />
        </a>
      </div>

      {/* A second, hidden way into the same page, so it stays out of the tab order and the
          screen reader's list; the title is the link people find. */}
      <div className="min-w-0 overflow-x-auto rounded-xl bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px)] bg-surface [background-size:16px_16px] [scrollbar-width:none] transition-[background-color] duration-150 ease-out group-hover/row:bg-background [&::-webkit-scrollbar]:hidden">
        <Link href={href} tabIndex={-1} aria-hidden className="flex w-max gap-2 p-3 outline-hidden">
          {design.stills.length === 0 && (
            // Shown until the design's stills land in public/stills/.
            <span className="grid aspect-[4/3] h-[150px] place-items-center rounded-lg bg-background text-muted text-xs shadow-raised md:h-[176px]">
              Stills coming soon
            </span>
          )}
          {design.stills.map((src) => (
            // biome-ignore lint/performance/noImgElement: a static export of small, pre-sized JPGs.
            <img
              key={src}
              src={src}
              alt=""
              width={420}
              height={522}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="aspect-[4/3] h-[150px] w-auto rounded-lg object-cover object-bottom shadow-raised md:h-[176px]"
            />
          ))}
        </Link>
      </div>
    </li>
  );
}
