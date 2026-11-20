import { Catalogue } from '@/components/catalogue';
import { CodeBlock } from '@/components/code-block';
import { DesignCard } from '@/components/design-card';
import { DesignRow } from '@/components/design-row';
import { Hero } from '@/components/hero';
import { InstallCommand } from '@/components/install-command';
import { SiteHeader } from '@/components/site-header';
import { categories, designs, getDesign, ordered, usageSnippet } from '@/lib/designs';
import { registryUrl } from '@/lib/site';

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

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Hero />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-16 sm:px-6">
        <section id="designs" aria-labelledby="catalogue" className="scroll-mt-20">
          <h2 id="catalogue" className="font-medium text-[15px]">
            All designs
          </h2>
          <p className="mt-1 mb-5 max-w-xl text-pretty text-muted text-sm">
            Each tab bar in its different states. Open one to watch it move and install it.
          </p>
          <Catalogue
            categories={categories}
            entries={ordered.map(({ title, description, layout, layoutLabel }) => ({
              title,
              description,
              layout,
              layoutLabel,
            }))}
            rows={ordered.map((d) => <DesignRow key={d.id} design={d} />)}
            cards={ordered.map((d) => <DesignCard key={d.id} item={card(d)} />)}
          />
        </section>

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
