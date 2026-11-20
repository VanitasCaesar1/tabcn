import Link from 'next/link';
import { designs } from '@/lib/designs';
import { designPath, site } from '@/lib/site';
import { Arrow } from './arrow';
import { GitHubIcon } from './github-icon';
import { type HeroCard, HeroField } from './hero-field';
import { Underline } from './underline';

// Where the cards sit, in percent of the hero, with a width and a depth: two loose columns at
// the sides, clear of the headline. Phones keep the two at the top.
const SPOTS: { x: number; y: number; w: number; d: number; p?: boolean }[] = [
  { x: 7, y: 18, w: 124, d: 0.3, p: true },
  { x: 15, y: 42, w: 96, d: 0.6 },
  { x: 6, y: 66, w: 112, d: 0.2 },
  { x: 14, y: 88, w: 88, d: 0.7 },
  { x: 93, y: 14, w: 104, d: 0.5, p: true },
  { x: 85, y: 36, w: 120, d: 0.15 },
  { x: 94, y: 60, w: 92, d: 0.65 },
  { x: 86, y: 84, w: 116, d: 0.3 },
];

// One still per spot, cycling through the designs (with a stride, so neighbours differ) and
// through each design's tab states.
function heroCards(): HeroCard[] {
  const withStills = designs.filter((d) => d.stills.length > 0);
  if (withStills.length === 0) return [];
  return SPOTS.map((spot, i) => {
    const stills = withStills[(i * 7) % withStills.length]?.stills ?? [];
    return {
      src: stills[i % stills.length] ?? '',
      x: spot.x,
      y: spot.y,
      w: spot.w,
      depth: spot.d,
      shape: i % 3 === 1 ? ('tall' as const) : ('wide' as const),
      phone: spot.p ?? false,
      seed: i * 7919 + 17,
    };
  }).filter((c) => c.src);
}

const latest = designs[designs.length - 1];

const buttonPrimary =
  'flex h-10 items-center rounded-full bg-foreground px-5 font-medium text-background text-sm outline-hidden transition-[scale,opacity] duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]';
const buttonSecondary =
  'flex h-10 items-center gap-2 rounded-full bg-surface px-4 font-medium text-foreground text-sm shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[scale,background-color] duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]';

// The first screen: the headline over a dotted grid, with a few of the tab bars floating at the
// sides.
export function Hero() {
  return (
    <section className="relative isolate flex flex-col items-center overflow-hidden px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
      <HeroField cards={heroCards()} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_50%_55%_at_50%_40%,black,transparent)]"
      />
      {latest && (
        <Link
          href={designPath(latest.id)}
          className="group/latest flex h-8 items-center gap-2 rounded-full bg-background pr-3 pl-1 text-[13px] text-muted shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[color,scale] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]"
        >
          <span className="flex h-6 items-center rounded-full bg-foreground px-2 font-medium text-[12px] text-background">
            New
          </span>
          <span className="font-medium text-foreground">{latest.title}</span>
          <Arrow
            direction="right"
            className="size-3 transition-[translate] duration-150 ease-out group-hover/latest:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      )}
      <h1 className="mt-6 max-w-2xl text-balance font-semibold text-[34px] leading-[1.1] tracking-tight sm:text-[50px]">
        Animated tab bars you copy in and make your{' '}
        <span className="relative inline-block">
          own
          <Underline />
        </span>
      </h1>
      <p className="mt-5 max-w-md text-pretty text-[15px] text-muted leading-relaxed">
        {designs.length} tab bars for React Native and Expo. A small package does the hard parts;
        each design is one file you install with the shadcn CLI and change as you like.
      </p>
      <div className="mt-8 flex items-center gap-2">
        <a href="#designs" className={buttonPrimary}>
          Browse designs
        </a>
        <a href={site.repo} target="_blank" rel="noreferrer" className={buttonSecondary}>
          <GitHubIcon />
          GitHub
        </a>
      </div>
    </section>
  );
}
