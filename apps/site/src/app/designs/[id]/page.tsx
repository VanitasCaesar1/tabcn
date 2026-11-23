import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CodeBlock } from '@/components/code-block';
import { DesignWorkbench } from '@/components/design-workbench';
import { InstallCommand } from '@/components/install-command';
import { OpenOnPhone } from '@/components/open-on-phone';
import { Pager } from '@/components/pager';
import { PropsTable } from '@/components/props-table';
import { SiteHeader } from '@/components/site-header';
import { designs, getDesign, neighbours, panelUISnippet, usageDesign } from '@/lib/designs';
import { guideFor } from '@/lib/docs';
import { absoluteUrl, designPath, registryUrl, site, sourceUrl } from '@/lib/site';

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return designs.map(({ id }) => ({ id }));
}

// Every id is known at build; any other is a plain 404.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const design = getDesign(id);
  if (!design) return {};
  const shareAlt = `The ${design.title} tab bar from tabcn`;
  const description =
    design.kind === 'panel'
      ? `${design.description} An animated panel for tabcn tab bars in React Native and Expo.`
      : `${design.description} An animated ${design.layoutLabel.toLowerCase()} tab bar for React Native and Expo, from tabcn.`;
  return {
    title: design.title,
    description,
    alternates: { canonical: absoluteUrl(designPath(id)) },
    openGraph: {
      type: 'article',
      siteName: site.name,
      locale: site.locale,
      url: absoluteUrl(designPath(id)),
      title: `${design.title} · ${site.name}`,
      description,
      images: [{ url: design.ogImage, width: 1200, height: 630, alt: shareAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      creator: `@${site.x}`,
      images: [{ url: design.ogImage, alt: shareAlt }],
    },
  };
}

export default async function DesignPage({ params }: Props) {
  const { id } = await params;
  const design = getDesign(id);
  if (!design) notFound();
  const { previous, next } = neighbours(design.id);
  const guide = guideFor(design.id);
  const panel = design.kind === 'panel';
  const maxTabs = design.controls.maxTabs ?? design.tabs ?? 5;
  const minTabs = Math.min(design.controls.minTabs ?? 2, maxTabs);

  return (
    <>
      <SiteHeader
        crumb={{
          title: design.title,
          section: panel
            ? { param: 'c', id: 'panels', label: 'Panels' }
            : { param: 's', id: design.style, label: design.styleLabel },
        }}
      />
      <main
        id="content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col px-4 pt-8 pb-4 outline-hidden sm:px-6 sm:pt-12 xl:pt-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0 max-w-[720px]">
            <h1 className="text-balance font-semibold text-[36px] leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
              {design.title}
            </h1>
            <p className="mt-3 text-pretty text-[16px] text-muted leading-relaxed">
              {design.description}
            </p>
          </div>
          <a
            href={sourceUrl(design.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-card px-3 font-medium text-[13px] text-foreground shadow-[inset_0_0_0_1px_var(--card-border)] outline-hidden transition-[background-color] duration-150 ease-out hover:bg-cell focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 sm:mt-3"
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
            Source on GitHub
          </a>
        </div>

        <div className="mt-6">
          <DesignWorkbench
            usage={usageDesign(design)}
            media={design}
            preview={design.preview}
            themed={design.themed}
            scheme={design.scheme}
            minTabs={minTabs}
            maxTabs={maxTabs}
            sources={design.sources}
            install={<InstallCommand url={registryUrl(design.id)} />}
            usageNotes={
              <>
                {design.kind === 'panel' ? (
                  <>
                    A panel needs a <code className="font-mono text-[13px]">TabBarProvider</code>{' '}
                    around the tabs navigator.{' '}
                    {design.id === 'quick-create' ? (
                      <>
                        It slides out of the bar&rsquo;s + button, so it needs a bar that marks that
                        button with{' '}
                        <code className="font-mono text-[13px]">
                          usePanelAnchor(&apos;action&apos;)
                        </code>
                        : Center CTA, Glow Glass, Labeled + Plus, Pill + Plus or Segment + Search.
                      </>
                    ) : design.id === 'sub-tabs' ? (
                      <>
                        It slides up from behind one tab, so that tab calls{' '}
                        <code className="font-mono text-[13px]">useSubTabs(name)</code> inside your
                        bar design: a few lines in a copy of any tabcn bar. Screen readers reach it
                        through the tab&rsquo;s &ldquo;Show sub-tabs&rdquo; action.
                      </>
                    ) : design.id === 'companion-chip' ? (
                      <>
                        <code className="font-mono text-[13px]">TabBarCompanion</code> places it
                        against any tabcn tab bar, and it moves with the bar when it minimizes or
                        slides away for the keyboard.
                      </>
                    ) : (
                      'It works with any tabcn tab bar.'
                    )}
                    {(design.id === 'mini-player' ||
                      design.id === 'bar-sheet' ||
                      design.id === 'slider-sheet') && (
                      <>
                        {' '}
                        Dragging it needs{' '}
                        <code className="font-mono text-[13px]">react-native-gesture-handler</code>{' '}
                        and a{' '}
                        <code className="font-mono text-[13px]">
                          {'<GestureHandlerRootView style={{ flex: 1 }}>'}
                        </code>{' '}
                        around the app in{' '}
                        <code className="font-mono text-[13px]">app/_layout.tsx</code>; without it
                        the panel throws in development.
                      </>
                    )}{' '}
                    Here it is with the bar it&rsquo;s shown with.
                  </>
                ) : (
                  <>
                    Pass it to Expo Router&rsquo;s tabs. Icons, labels and badges come from each
                    screen&rsquo;s options.
                    {design.id === 'side-rail' &&
                      ' It draws a rail when the navigator’s tabBarPosition is left, and a bottom bar otherwise.'}
                    {design.hasAction && ' The separate button runs onActionPress.'}
                    {design.id === 'section-sheet' &&
                      ' Each section is a route, and its sheet body comes from sections, by route name. It needs a TabBarProvider around the navigator and a GestureHandlerRootView around the app.'}
                    {design.id === 'scrub-pill' &&
                      ' Scrubbing needs react-native-gesture-handler and a GestureHandlerRootView around the app.'}
                    {design.id === 'live-tabs' &&
                      ' Screens write each tab’s live values with useLiveTab(routeName), which needs a TabBarProvider around the navigator.'}
                  </>
                )}
                {guide ? (
                  <>
                    {' '}
                    More in{' '}
                    <Link
                      href={guide.href}
                      className="rounded-sm text-foreground underline decoration-border underline-offset-4 outline-hidden transition-[text-decoration-color] duration-150 ease-out hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
                    >
                      {guide.title}
                    </Link>
                    .
                  </>
                ) : null}
              </>
            }
          />
        </div>

        <div className="mt-12 flex flex-col gap-12">
          {design.panelUI ? (
            <section aria-labelledby="panelui-heading">
              <h2 id="panelui-heading" className="font-semibold text-[20px] tracking-[-0.01em]">
                With PanelUI
              </h2>
              <p className="mt-2 mb-4 max-w-2xl text-pretty text-[14px] text-muted leading-relaxed">
                In an app with PanelUI&rsquo;s theme, add{' '}
                <Link
                  href="/docs/panelui/"
                  className="rounded-sm text-foreground underline decoration-border underline-offset-4 outline-hidden transition-[text-decoration-color] duration-150 ease-out hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2"
                >
                  PanelUI Colors
                </Link>{' '}
                and pass its colours, so the {design.kind === 'panel' ? 'panel' : 'bar'} follows
                Panel, Moon and Grass.
              </p>
              <CodeBlock filename="app/(tabs)/_layout.tsx" code={panelUISnippet(design)} />
            </section>
          ) : null}

          <section aria-labelledby="props-heading">
            <h2 id="props-heading" className="font-semibold text-[20px] tracking-[-0.01em]">
              Props
            </h2>
            <p className="mt-2 mb-4 max-w-2xl text-pretty text-[14px] text-muted leading-relaxed">
              Read from{' '}
              <code className="font-mono text-[13px]">
                {design.props.typeName ?? design.component}
              </code>{' '}
              in the design&rsquo;s source, so they match the file you copy.
            </p>
            <PropsTable props={design.props} source={sourceUrl(design.id)} />
          </section>

          <OpenOnPhone id={design.id} title={design.title} />

          {/* Walks the designs in the sidebar's and the gallery's order. */}
          <Pager
            label="More designs"
            previous={previous && { href: designPath(previous.id), title: previous.title }}
            next={next && { href: designPath(next.id), title: next.title }}
          />
        </div>
      </main>
    </>
  );
}
