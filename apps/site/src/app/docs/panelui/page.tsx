import type { Metadata } from 'next';
import { CodeBlock } from '@/components/code-block';
import { Code, DocSection, DocsPage, ProseLink } from '@/components/docs-page';
import { InstallCommand } from '@/components/install-command';
import { designs } from '@/lib/designs';
import { docs } from '@/lib/docs';
import { absoluteUrl, designPath, registryUrl, site } from '@/lib/site';

const page = docs.find((d) => d.href === '/docs/panelui/') as (typeof docs)[number];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: absoluteUrl(page.href) },
};

const SECTIONS = [
  { id: 'before-you-start', title: 'Before you start' },
  { id: 'add-panelui-colors', title: 'Add PanelUI Colors' },
  { id: 'use-it', title: 'Use it' },
  { id: 'change-a-mapping', title: 'Change a mapping' },
  { id: 'designs-it-leaves-alone', title: 'Designs it leaves alone' },
] as const;
const [before, add, use, change, leftAlone] = SECTIONS;

const GLOBAL_CSS = `@import 'tailwindcss';
@import 'uniwind';
@import 'panelui-native/theme.css';
`;

const USAGE = `import { Tabs } from 'expo-router/js-tabs';
import { tabBar } from 'react-native-tabcn/expo-router';
import { SoftPill } from '@/components/tabcn/soft-pill';
import { usePanelUIColors } from '@/components/tabcn/panelui-colors';

export default function TabLayout() {
  const colors = usePanelUIColors('soft-pill');
  return <Tabs tabBar={tabBar(<SoftPill colors={colors} />)} screenOptions={{ headerShown: false }} />;
}
`;

const MAPPING = `'soft-pill': {
  background: 'surface',
  capsule: 'surface-tertiary',
  foreground: 'foreground',
},
'glass-expand': {
  background: ['card', 0.7], // the card colour at 70%
  // ...
},
`;

export default function PanelUIPage() {
  const unmapped = designs.filter((d) => !d.panelUI);
  return (
    <DocsPage href={page.href} sections={SECTIONS}>
      <DocSection section={before}>
        <p>
          <ProseLink href="https://panelui.dev">PanelUI</ProseLink> is a component library for Expo
          built on Uniwind&rsquo;s semantic colour tokens. {site.name} fills in the tab bar, and
          PanelUI Colors connects the two: a tabcn design reads the running PanelUI theme and
          changes with it, across Panel, Moon and Grass, in light and dark.
        </p>
        <p>
          Your app needs PanelUI&rsquo;s theme set up first, as in its{' '}
          <ProseLink href="https://panelui.dev/docs/customization/theming">theming guide</ProseLink>
          : Uniwind in <Code>metro.config.js</Code> and the theme in your global CSS.
        </p>
        <CodeBlock filename="global.css" code={GLOBAL_CSS} />
        <p>
          {site.name} is an independent project, not affiliated with PanelUI. Designs don&rsquo;t
          depend on it: without PanelUI, leave this page&rsquo;s file out and nothing changes.
        </p>
      </DocSection>

      <DocSection section={add}>
        <p>
          Add the file next to your designs. It goes to{' '}
          <Code>components/tabcn/panelui-colors.ts</Code> and needs only Uniwind, which PanelUI
          already installed.
        </p>
        <InstallCommand url={registryUrl('panelui-colors')} title="PanelUI Colors" />
      </DocSection>

      <DocSection section={use}>
        <p>
          Call <Code>usePanelUIColors</Code> with the design&rsquo;s name and pass the result as its{' '}
          <Code>colors</Code>:
        </p>
        <CodeBlock filename="app/(tabs)/_layout.tsx" code={USAGE} />
        <p>
          It reads the tokens with Uniwind&rsquo;s <Code>useCSSVariable</Code>, so the bar
          re-renders when the theme switches and stays put in between. Panels work the same way:{' '}
          <Code>{"<MiniPlayer colors={usePanelUIColors('mini-player')} />"}</Code>.
        </p>
        <p>Every design page with a mapping has a theme switch under its preview to try it.</p>
      </DocSection>

      <DocSection section={change}>
        <p>
          The file maps each design&rsquo;s colour slots to PanelUI tokens. A slot takes a token, or
          a token and an opacity:
        </p>
        <CodeBlock filename="components/tabcn/panelui-colors.ts" code={MAPPING} />
        <p>
          Edit it like any copied file. A slot you leave out keeps the design&rsquo;s own colour,
          and so does a slot whose token your theme doesn&rsquo;t define. Badges use PanelUI&rsquo;s
          solid destructive style; point them at another token to change that.
        </p>
      </DocSection>

      <DocSection section={leftAlone}>
        <p>
          These designs draw over photos or a fixed gradient, so their colours are the design.
          PanelUI Colors has no mapping for them:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {unmapped.map((d) => (
            <li key={d.id}>
              <ProseLink href={designPath(d.id)}>{d.title}</ProseLink>
            </li>
          ))}
        </ul>
        <p>
          Orbs and Gradient Stickers take only the theme&rsquo;s badge colour, for the same reason.
        </p>
      </DocSection>
    </DocsPage>
  );
}
