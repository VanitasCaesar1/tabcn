import Link from 'next/link';
import { Arrow } from '@/components/arrow';
import { CodeBlock } from '@/components/code-block';
import { DesignCard } from '@/components/design-card';
import { DesignGrid } from '@/components/design-grid';
import { GitHubIcon } from '@/components/github-icon';
import { InstallCommand } from '@/components/install-command';
import { Showcase } from '@/components/showcase';
import { SiteHeader } from '@/components/site-header';
import { Underline } from '@/components/underline';
import { categories, designs, getDesign, ordered, usageSnippet } from '@/lib/designs';
import { designPath, registryUrl, site } from '@/lib/site';

// The catalog appends, so the last design is the newest.
const latest = designs[designs.length - 1];
// The reel above the grid, newest first.
const fresh = designs.slice(-6).reverse();
const example = getDesign('sliding-capsule') ?? designs[0];

const card = (d: (typeof designs)[number]) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  layoutLabel: d.layoutLabel,
  video: d.video,
  poster: d.poster,
});

const HOW = [
  {
    title: 'The tabcn package',
    body: 'A small npm package holds the parts every tab bar needs: connecting to the navigator, tab state, safe-area spacing, the animated highlight, press feedback, badges, haptics, reduced motion and accessibility. Fixes reach you with an update.',
  },
  {
    title: 'Designs you copy in',
    body: 'Each design is one short file built on that package. The shadcn CLI copies it into your project and from then on it is yours: change icons, labels and colours through props, or edit the file to change the look and motion.',
  },
  {
    title: 'Your navigator stays',
    body: "Pass the design as the tabBar of Expo Router's Tabs or React Navigation's bottom tabs. Screens, deep links, the Android back button and screen-reader roles keep working as before.",
  },
];

const buttonPrimary =
  'flex h-10 items-center rounded-full bg-foreground px-5 font-medium text-background text-sm outline-hidden transition-[scale,opacity] duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]';
const buttonSecondary =
  'flex h-10 items-center gap-2 rounded-full bg-surface px-4 font-medium text-foreground text-sm shadow-[inset_0_0_0_1px_var(--border)] outline-hidden transition-[scale,background-color] duration-150 ease-out hover:bg-background focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:scale-[0.96]';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-16 pb-16 sm:px-6 sm:pt-20">
        <section className="relative isolate mb-16 flex flex-col items-center text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[440px] bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_11%,transparent)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_50%_55%_at_50%_40%,black,transparent)]"
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
          <h1 className="mt-6 max-w-2xl text-balance font-semibold text-[34px] leading-[1.1] tracking-tight sm:text-[46px]">
            Animated tab bars you copy in and make your{' '}
            <span className="relative inline-block">
              own
              <Underline />
            </span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-[15px] text-muted leading-relaxed">
            {designs.length} tab bars for React Native and Expo. A small package does the hard
            parts; each design is one file you install with the shadcn CLI and change as you like.
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

        <Showcase items={fresh.map(card)} />

        <div id="designs" className="scroll-mt-20" />
        <DesignGrid
          categories={categories}
          entries={ordered.map(({ title, description, layout, layoutLabel }) => ({
            title,
            description,
            layout,
            layoutLabel,
          }))}
        >
          {ordered.map((d) => (
            <DesignCard key={d.id} item={card(d)} />
          ))}
        </DesignGrid>

        <section aria-labelledby="how" className="mt-24">
          <h2 id="how" className="font-medium text-[15px]">
            How it works
          </h2>
          <p className="mt-1 max-w-xl text-pretty text-muted text-sm">
            In the style of shadcn/ui: a foundation you update, and designs you own.
          </p>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {HOW.map((step, i) => (
              <li key={step.title} className="rounded-[20px] bg-surface p-5 shadow-raised">
                <span className="grid size-7 place-items-center rounded-full bg-background font-medium font-mono text-muted text-xs shadow-[inset_0_0_0_1px_var(--border)]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-medium text-[15px]">{step.title}</h3>
                <p className="mt-1.5 text-pretty text-muted text-sm leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="quick-start" aria-labelledby="quick" className="mt-24 scroll-mt-20">
          <h2 id="quick" className="font-medium text-[15px]">
            Quick start
          </h2>
          <p className="mt-1 max-w-xl text-pretty text-muted text-sm">
            tabcn is in pre-release: the npm package is not published yet. These are the steps it
            will take.
          </p>
          <div className="mt-6 flex flex-col gap-8">
            <Step n={1} title="Install the foundation">
              <CodeBlock
                filename="Terminal"
                code="npx expo install tabcn react-native-reanimated react-native-worklets"
              />
            </Step>
            <Step n={2} title="Add a design">
              {example && <InstallCommand url={registryUrl(example.id)} title="Sliding Capsule" />}
            </Step>
            <Step n={3} title="Pass it to your tabs">
              {example && (
                <CodeBlock filename="app/(tabs)/_layout.tsx" code={usageSnippet(example)} />
              )}
            </Step>
          </div>
        </section>
      </main>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div className="flex items-center gap-3 md:items-start md:pt-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface font-medium font-mono text-muted text-xs shadow-[inset_0_0_0_1px_var(--border)]">
          {n}
        </span>
        <h3 className="font-medium text-sm md:pt-1">{title}</h3>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
