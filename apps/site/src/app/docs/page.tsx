import type { Metadata } from 'next';
import { CodeBlock } from '@/components/code-block';
import { Code, DocSection, DocsPage, ProseLink } from '@/components/docs-page';
import { InstallCommand } from '@/components/install-command';
import { designs, getDesign, usageSnippet } from '@/lib/designs';
import { docs } from '@/lib/docs';
import { absoluteUrl, HERO_DESIGN, registryUrl, site } from '@/lib/site';

const page = docs[0] as (typeof docs)[number];

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: absoluteUrl(page.href) },
};

const SECTIONS = [
  { id: 'how-it-works', title: 'How it works' },
  { id: 'requirements', title: 'Requirements' },
  { id: 'install', title: 'Install' },
  { id: 'react-navigation', title: 'React Navigation' },
  { id: 'make-it-yours', title: 'Make it yours' },
] as const;
const [howItWorks, requirements, install, reactNavigation, makeItYours] = SECTIONS;

const REACT_NAVIGATION = `import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabBar } from 'react-native-tabcn/react-navigation';
import { SlidingCapsule } from '@/components/tabcn/sliding-capsule';

const Tab = createBottomTabNavigator();

export function Tabs() {
  return (
    <Tab.Navigator tabBar={tabBar(<SlidingCapsule />)} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="home" component={Home} options={{ tabBarIcon: HomeIcon }} />
      <Tab.Screen name="inbox" component={Inbox} options={{ tabBarIcon: InboxIcon }} />
    </Tab.Navigator>
  );
}
`;

const COLORS = `<SlidingCapsule colors={{ capsule: '#e8e3ff', foreground: '#2b1d6b' }} />
`;

export default function IntroductionPage() {
  const example = getDesign(HERO_DESIGN);
  const panels = designs.filter((d) => d.kind === 'panel').length;
  const bars = designs.length - panels;
  return (
    <DocsPage href={page.href} sections={SECTIONS}>
      <DocSection section={howItWorks}>
        <p>
          {site.name} has {bars} tab bars and {panels} panels that slide out from behind a bar. It
          comes in two parts, the way shadcn/ui does:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>
              <Code>react-native-tabcn</Code>
            </strong>
            , a small npm package. It handles the parts every tab bar needs and that are easy to get
            wrong: the navigator connection, tab state, safe areas, the animated highlight, badges,
            haptics, reduced motion and accessibility. Fixes reach you through an update.
          </li>
          <li>
            <strong>Designs</strong>, short source files built on that package. You copy one into
            your app with the shadcn CLI and own it from then on.
          </li>
        </ul>
        <p>
          Navigation stays with your navigator. A design is the <Code>tabBar</Code> of Expo
          Router&rsquo;s tabs or React Navigation&rsquo;s bottom tabs, so screens, deep links, the
          Android back button and screen-reader roles work as before.
        </p>
      </DocSection>

      <DocSection section={requirements}>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            React Native 0.81 or newer and React 19, with Reanimated 4 and react-native-worklets.
          </li>
          <li>
            Expo Router 58 or newer, or <Code>@react-navigation/bottom-tabs</Code> 7.
          </li>
          <li>
            react-native-gesture-handler for the panels you drag and for scrubbing the bar. Each
            design&rsquo;s page says when it needs it.
          </li>
        </ul>
        <p>
          The designs are made for iOS and Android. The previews on this site run in the browser so
          you can try them; glass, blur and haptics are closest on a phone, and every design opens
          in Expo Go from its page.
        </p>
      </DocSection>

      <DocSection section={install}>
        <p>Install the package and Reanimated:</p>
        <CodeBlock
          filename="Terminal"
          code="npx expo install react-native-tabcn react-native-reanimated react-native-worklets"
        />
        <p>
          Then add a design. This copies it and its icons into <Code>components/tabcn/</Code> (or{' '}
          <Code>src/components/tabcn/</Code>) and installs what it uses. No{' '}
          <Code>components.json</Code> or Tailwind is needed.
        </p>
        {example ? <InstallCommand url={registryUrl(example.id)} title={example.title} /> : null}
        <p>Pass it to your tabs. Icons, labels and badges come from each screen&rsquo;s options.</p>
        {example ? (
          <CodeBlock filename="app/(tabs)/_layout.tsx" code={usageSnippet(example)} />
        ) : null}
        <p>
          Floating bars report their height, so a screen can pad its list with{' '}
          <Code>useBottomTabBarHeight()</Code>.
        </p>
      </DocSection>

      <DocSection section={reactNavigation}>
        <p>
          Without Expo Router, import <Code>tabBar</Code> from{' '}
          <Code>react-native-tabcn/react-navigation</Code> instead. The design is the same file.
        </p>
        <CodeBlock filename="tabs.tsx" code={REACT_NAVIGATION} />
      </DocSection>

      <DocSection section={makeItYours}>
        <p>
          Every design takes a <Code>colors</Code> prop for its surfaces and ink, and props for
          fonts, haptics and its own options. Each design&rsquo;s page lists them.
        </p>
        <CodeBlock filename="app/(tabs)/_layout.tsx" code={COLORS} />
        <p>
          For anything a prop doesn&rsquo;t cover, edit the file: it&rsquo;s yours. In an app built
          with PanelUI, a design can take its colours from the theme instead; see{' '}
          <ProseLink href="/docs/panelui/">Using with PanelUI</ProseLink>.
        </p>
      </DocSection>
    </DocsPage>
  );
}
