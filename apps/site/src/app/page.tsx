import { Catalogue } from '@/components/catalogue';
import { CodeBlock } from '@/components/code-block';
import { Hero } from '@/components/hero';
import { InstallCommand } from '@/components/install-command';
import { SiteHeader } from '@/components/site-header';
import { SpecimenCard } from '@/components/specimen-card';
import { SpecimenRow } from '@/components/specimen-row';
import { designs, getDesign, groups, ordered, usageSnippet } from '@/lib/designs';
import { registryUrl } from '@/lib/site';

const example = getDesign('sliding-capsule') ?? designs[0];

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
      <main id="content" tabIndex={-1} className="flex-1 outline-hidden">
        <Hero />
        <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-16 sm:px-6">
          <section
            id="designs"
            aria-labelledby="designs-title"
            className="@container/cat scroll-mt-20"
          >
            <Catalogue
              titleId="designs-title"
              groups={groups.map(({ id, label, note, items }) => ({
                id,
                label,
                note,
                count: items.length,
              }))}
              entries={ordered.map(({ id, title, description, layoutLabel, group }) => ({
                id,
                title,
                description,
                layoutLabel,
                group,
              }))}
              cards={ordered.map((d) => <SpecimenCard key={d.id} design={d} />)}
              rows={ordered.map((d) => <SpecimenRow key={d.id} design={d} />)}
            />
          </section>

          <section id="how" aria-labelledby="how-title" className="mt-24 scroll-mt-20">
            <h2 id="how-title" className="font-medium text-[15px]">
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
                  <p className="mt-1.5 text-pretty text-muted text-sm leading-relaxed">
                    {step.body}
                  </p>
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
                {example && (
                  <InstallCommand url={registryUrl(example.id)} title="Sliding Capsule" />
                )}
              </Step>
              <Step n={3} title="Pass it to your tabs">
                {example && (
                  <CodeBlock filename="app/(tabs)/_layout.tsx" code={usageSnippet(example)} />
                )}
              </Step>
            </div>
          </section>
        </div>
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
