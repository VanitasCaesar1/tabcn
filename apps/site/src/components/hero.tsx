import Link from 'next/link';
import { designs, getDesign } from '@/lib/designs';
import { designPath, HERO_DESIGN, HERO_SHOWCASE } from '@/lib/site';
import { Arrow } from './arrow';
import { HeroInstall } from './hero-install';
import { HeroShowcase, type ShowcaseItem } from './hero-showcase';
import { ReleaseStatus } from './release-status';

const latest = designs[designs.length - 1];
const barCount = designs.filter((d) => d.kind === 'bar').length;
const panelCount = designs.filter((d) => d.kind === 'panel').length;
const install = getDesign(HERO_DESIGN);
const showcase: ShowcaseItem[] = HERO_SHOWCASE.flatMap((id) => {
  const d = getDesign(id);
  return d?.video ? [{ id: d.id, title: d.title, video: d.video, poster: d.poster }] : [];
});

// The first screen: the headline, the install command and the release status on the left; real
// recordings playing in the phone on the right. The text fades in on CSS alone, so it shows before
// any script loads.
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl overflow-x-clip px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10 xl:gap-16">
        <div className="min-w-0">
          {latest && (
            <Link
              href={designPath(latest.id)}
              className="rise group/latest inline-flex h-8 items-center gap-2 rounded-[10px] bg-card pr-3 pl-1 text-[13px] text-muted shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden transition-[color] duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
            >
              <span className="flex h-6 items-center rounded-[7px] bg-foreground px-2 font-medium text-[12px] text-background">
                New
              </span>
              <span className="font-medium text-foreground">{latest.title}</span>
              <Arrow
                direction="right"
                className="size-3 transition-[translate] duration-150 ease-out group-hover/latest:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          )}
          <h1 className="rise mt-6 max-w-[620px] text-balance font-semibold text-[clamp(36px,5vw,56px)] leading-[1.04] tracking-[-0.035em] [--rise-delay:60ms]">
            Animated tab bars you copy in and make your own
          </h1>
          <p className="rise mt-5 max-w-[500px] text-pretty text-[17px] text-muted leading-[1.55] [--rise-delay:120ms]">
            {barCount} tab bars and {panelCount} panels for React Native and Expo. Each one is a
            single file you copy in with the shadcn CLI and change as you like.
          </p>
          {install && <HeroInstall id={install.id} title={install.title} />}
          <ReleaseStatus />
        </div>
        {showcase.length > 0 && (
          <div className="rise relative isolate flex justify-center [--rise-delay:180ms]">
            {/* A soft pool of light under the phone, in the page's own greys. */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-[38%] left-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--foreground)_7%,transparent),transparent)]"
            />
            <HeroShowcase items={showcase} />
          </div>
        )}
      </div>
    </section>
  );
}
