import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CodeBlock } from '@/components/code-block';
import { InstallCommand } from '@/components/install-command';
import { LivePhone } from '@/components/live-phone';
import { OpenOnPhone } from '@/components/open-on-phone';
import { Pager } from '@/components/pager';
import { DesignPhone } from '@/components/phone';
import { PropsTable } from '@/components/props-table';
import { SiteHeader } from '@/components/site-header';
import {
  designs,
  getDesign,
  groupLabel,
  neighbours,
  panelUISnippet,
  usageSnippet,
} from '@/lib/designs';
import { guideFor } from '@/lib/docs';
import { absoluteUrl, designPath, groupPath, registryUrl, site, sourceUrl } from '@/lib/site';

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

  return (
    <>
      <SiteHeader
        crumb={{
          title: design.title,
          group: design.group,
          groupLabel: groupLabel(design.group),
          thumb: design.thumb,
          background: design.background,
        }}
      />
      <main
        id="content"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-4 pb-4 outline-hidden sm:px-6 sm:pt-6"
      >
        {/* The stage: a quiet dotted canvas the phone sits on, so every design is shown the
            same way. (ui lab, MIT.) */}
        <div className="flex items-center justify-center overflow-x-clip rounded-3xl border border-border bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1px)] [background-size:18px_18px] px-4 py-8 sm:py-12">
          {design.preview ? (
            <LivePhone
              media={design}
              preview={design.preview}
              themed={design.themed}
              className="w-[230px] sm:w-[270px]"
            />
          ) : (
            <DesignPhone media={design} className="w-[230px] sm:w-[270px]" />
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-balance font-semibold text-2xl tracking-tight">{design.title}</h1>
            <p className="mt-2 max-w-xl text-pretty text-[15px] text-muted">{design.description}</p>
            <Link
              href={groupPath(design.group)}
              className="mt-3 inline-flex h-7 items-center rounded-full bg-surface px-3 font-medium text-muted text-xs outline-hidden transition-[color,background-color] duration-150 ease-out hover:bg-foreground/10 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid"
            >
              {design.layoutLabel}
            </Link>
          </div>
          <a
            href={sourceUrl(design.id)}
            target="_blank"
            rel="noreferrer"
            aria-label={`View source of ${design.title} on GitHub`}
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-full bg-foreground px-4 font-medium text-background text-sm outline-hidden transition-[opacity] duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-solid focus-visible:outline-offset-2 active:opacity-80 active:duration-100"
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m5.5 4.5-3.5 3.5 3.5 3.5M10.5 4.5l3.5 3.5-3.5 3.5" />
            </svg>
            View source
          </a>
        </div>

        <InstallCommand url={registryUrl(design.id)} />

        <section aria-labelledby="usage-heading">
          <h2 id="usage-heading" className="pl-1 font-medium text-[13px]">
            Usage
          </h2>
          <p className="mt-1 mb-2.5 pl-1 text-pretty text-muted text-sm">
            {design.kind === 'panel' ? (
              <>
                A panel needs a <code className="font-mono text-[13px]">TabBarProvider</code> around
                the tabs navigator.{' '}
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
                    <code className="font-mono text-[13px]">useSubTabs(name)</code> inside your bar
                    design: a few lines in a copy of any tabcn bar. Screen readers reach it through
                    the tab&rsquo;s &ldquo;Show sub-tabs&rdquo; action.
                  </>
                ) : design.id === 'companion-chip' ? (
                  <>
                    <code className="font-mono text-[13px]">TabBarCompanion</code> places it against
                    any tabcn tab bar, and it moves with the bar when it minimizes or slides away
                    for the keyboard.
                  </>
                ) : (
                  'It works with any tabcn tab bar.'
                )}
                {(design.id === 'mini-player' || design.id === 'bar-sheet') && (
                  <>
                    {' '}
                    Dragging it needs{' '}
                    <code className="font-mono text-[13px]">react-native-gesture-handler</code> and
                    a{' '}
                    <code className="font-mono text-[13px]">
                      {'<GestureHandlerRootView style={{ flex: 1 }}>'}
                    </code>{' '}
                    around the app in <code className="font-mono text-[13px]">app/_layout.tsx</code>
                    ; without it the panel throws in development.
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
          </p>
          <CodeBlock filename="app/(tabs)/_layout.tsx" code={usageSnippet(design)} />
        </section>

        {design.panelUI ? (
          <section aria-labelledby="panelui-heading">
            <h2 id="panelui-heading" className="pl-1 font-medium text-[13px]">
              With PanelUI
            </h2>
            <p className="mt-1 mb-2.5 pl-1 text-pretty text-muted text-sm">
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
          <h2 id="props-heading" className="pl-1 font-medium text-[13px]">
            Props
          </h2>
          <p className="mt-1 mb-2.5 pl-1 text-pretty text-muted text-sm">
            Read from{' '}
            <code className="font-mono text-[13px]">
              {design.props.typeName ?? design.component}
            </code>{' '}
            in the design&rsquo;s source, so they match the file you copy.
          </p>
          <PropsTable props={design.props} source={sourceUrl(design.id)} />
        </section>

        <OpenOnPhone id={design.id} title={design.title} />

        {/* Walks the designs in the sidebar's and the catalogue's order. */}
        <Pager
          label="More designs"
          previous={previous && { href: designPath(previous.id), title: previous.title }}
          next={next && { href: designPath(next.id), title: next.title }}
        />
      </main>
    </>
  );
}
