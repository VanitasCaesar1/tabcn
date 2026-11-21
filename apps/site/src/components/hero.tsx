import Link from 'next/link';
import { buildBoard } from '@/lib/board';
import { designs, getDesign } from '@/lib/designs';
import { designPath, HERO_DESIGN } from '@/lib/site';
import { Arrow } from './arrow';
import { BarBoard } from './bar-board';
import { HeroInstall } from './hero-install';
import { ReleaseStatus } from './release-status';
import { Underline } from './underline';

const board = buildBoard(designs);
const latest = designs[designs.length - 1];
const barCount = designs.filter((d) => d.kind === 'bar').length;
const panelCount = designs.filter((d) => d.kind === 'panel').length;
const install = getDesign(HERO_DESIGN);

// The first screen: the headline over a patch of dots, one fixed install command with the
// release status under it, then the departure board of tab bars and the dock that drives it.
// The text fades in on CSS alone, so it shows before any script loads.
export function Hero() {
  return (
    <section className="hero @container/hero relative isolate overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_50%_55%_at_50%_30%,black,transparent)]"
      />
      <div className="mx-auto flex max-w-[760px] flex-col items-center px-4 pt-6 text-center sm:px-6 sm:pt-8">
        {latest && (
          <Link
            href={designPath(latest.id)}
            className="rise group/latest flex h-8 items-center gap-2 rounded-full bg-background pr-3 pl-1 text-[13px] text-muted shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
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
        <h1 className="rise mt-[18px] max-w-[720px] text-balance font-medium text-[clamp(34px,4.4cqi,52px)] leading-[1.1] tracking-[-0.035em] [--rise-delay:60ms] sm:leading-[1.04]">
          Animated tab bars you copy in and make your{' '}
          <span className="relative inline-block">
            own
            <Underline />
          </span>
        </h1>
        <p className="rise mt-3.5 max-w-[480px] text-pretty text-[15px] text-muted leading-[1.6] [--rise-delay:120ms]">
          {barCount} tab bars and {panelCount} panels for React Native and Expo. Each one is a
          single file you copy in with the shadcn CLI and change as you like.
        </p>
        {install && <HeroInstall id={install.id} title={install.title} />}
        <ReleaseStatus />
      </div>
      {board.items.length > 0 && (
        <BarBoard items={board.items} groups={board.groups} startIndex={board.startIndex} />
      )}
    </section>
  );
}
