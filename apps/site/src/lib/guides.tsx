// The guides under /docs/: how to use the foundation's parts beyond a plain tab bar. Each has
// its sections (for "On this page") and its content. Moved here from the README so the docs
// live on the site.
import { CodeBlock } from '@/components/code-block';
import { Code, DocSection, ProseLink } from '@/components/docs-page';
import { designPath } from './site';

interface Guide {
  sections: readonly { id: string; title: string }[];
  render: () => React.ReactNode;
}

const Design = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <ProseLink href={designPath(id)}>{children}</ProseLink>
);

const GESTURES = (
  <>
    It needs <Code>react-native-gesture-handler</Code> and a{' '}
    <Code>{'<GestureHandlerRootView style={{ flex: 1 }}>'}</Code> around the app in{' '}
    <Code>app/_layout.tsx</Code>.
  </>
);

export const guides: Record<string, Guide> = {
  panels: {
    sections: [
      { id: 'set-up', title: 'Set up' },
      { id: 'control-a-panel', title: 'Control a panel' },
      { id: 'peek-above-any-bar', title: 'Peek above any bar' },
      { id: 'replace-the-bar', title: 'Replace the bar' },
      { id: 'a-bar-built-on-a-panel', title: 'A bar built on a panel' },
      { id: 'take-the-bars-place', title: 'Take the bar’s place' },
      { id: 'dragging', title: 'Dragging' },
    ],
    render: () => (
      <>
        <DocSection section={{ id: 'set-up', title: 'Set up' }}>
          <p>
            <Design id="mini-player">Mini Player</Design> and{' '}
            <Design id="context-tray">Context Tray</Design> work with any tabcn bar.{' '}
            <Design id="quick-create">Quick Create</Design> slides out of the bar&rsquo;s +
            button, so it needs a bar that marks that button with{' '}
            <Code>usePanelAnchor(&apos;action&apos;)</Code>: Center CTA, Glow Glass, Labeled + Plus,
            Pill + Plus or Segment + Search.
          </p>
          <p>
            Put a <Code>TabBarProvider</Code> around the tabs navigator and declare the panel beside
            it, so it stays across tabs. Without a provider, the bar renders exactly as before.
          </p>
          <CodeBlock
            filename="app/(tabs)/_layout.tsx"
            code={`import { Tabs } from 'expo-router/js-tabs';
import { TabBarProvider } from 'react-native-tabcn';
import { tabBar } from 'react-native-tabcn/expo-router';
import { MiniPlayer } from '@/components/tabcn/mini-player';
import { SoftPill } from '@/components/tabcn/soft-pill';

export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs tabBar={tabBar(<SoftPill />)} screenOptions={{ headerShown: false }} />
      <MiniPlayer track={track} playing={playing} onPlayPause={toggle} onNext={next} />
    </TabBarProvider>
  );
}
`}
          />
        </DocSection>
        <DocSection section={{ id: 'control-a-panel', title: 'Control a panel' }}>
          <p>
            Any component under the provider controls a panel by name with{' '}
            <Code>useTabPanel(&apos;player&apos;)</Code>: <Code>peek()</Code>, <Code>open()</Code>,{' '}
            <Code>hide()</Code> and <Code>toggle()</Code>.
          </p>
        </DocSection>
        <DocSection section={{ id: 'peek-above-any-bar', title: 'Peek above any bar' }}>
          <p>
            A floating bar hides the bottom 16 pt of a panel behind its rounded ends; a docked bar
            hides none. <Code>usePanelOverlap()</Code> says which, so a peeking panel shows the same
            strip above either:
          </p>
          <CodeBlock
            filename="components/my-player.tsx"
            code={`const STRIP = 48;

function MyPlayer() {
  const overlap = usePanelOverlap(); // 16 floating, 0 docked
  return (
    <TabPanel id="player" peekHeight={STRIP + overlap}>
      <Strip style={{ height: STRIP }} />
      {/* tuck \`overlap\` under the strip, behind the bar */}
    </TabPanel>
  );
}
`}
          />
        </DocSection>
        <DocSection section={{ id: 'replace-the-bar', title: 'Replace the bar' }}>
          <p>
            A screen can put its own controls in the bar&rsquo;s place while it is focused, with{' '}
            <Code>{'useTabBarOverride(<ContextTray … />)'}</Code> from{' '}
            <Code>react-native-tabcn/expo-router</Code>.
          </p>
        </DocSection>
        <DocSection section={{ id: 'a-bar-built-on-a-panel', title: 'A bar built on a panel' }}>
          <p>
            <Design id="account-dock">Account Dock</Design> is a whole bar built on one panel: its
            chip folds the tabs away and opens a <Code>TabPanel</Code> anchored to the bar. The
            panel&rsquo;s state is the dock&rsquo;s open state, so Android back, Escape on the web
            and the screen-reader escape gesture fold it, with no handling of its own.
          </p>
          <p>
            Its fold animates only position, scale, opacity and colour. Reanimated can apply those
            without updating React Native&rsquo;s view tree on every frame, once your app turns on
            two of its build flags. Add them to your app&rsquo;s <Code>package.json</Code> and
            rebuild the native app; Expo Go ignores them. We haven&rsquo;t measured the gain yet.
          </p>
          <CodeBlock
            filename="package.json"
            code={`"reanimated": {
  "staticFeatureFlags": {
    "IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS": true,
    "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true
  }
}
`}
          />
          <p>
            For a switcher without changing your bar, put a chip against it with{' '}
            <Code>TabBarCompanion</Code> and open a <Design id="bar-sheet">Bar Sheet</Design> from
            it:
          </p>
          <CodeBlock
            filename="components/account-chip.tsx"
            code={`function AccountChip() {
  const sheet = useTabPanel('accounts');
  return (
    <TabBarCompanion position="above-end">
      <PressableScale
        onPress={sheet.toggle}
        accessibilityRole="button"
        accessibilityLabel="Switch account"
      >
        <Avatar />
      </PressableScale>
    </TabBarCompanion>
  );
}

// Beside <Tabs>, under the TabBarProvider:
// <AccountChip />
// <BarSheet id="accounts" title="Accounts"><AccountList /></BarSheet>
`}
          />
        </DocSection>
        <DocSection section={{ id: 'take-the-bars-place', title: 'Take the bar’s place' }}>
          <p>
            For a focused task, an open panel can take the bar&rsquo;s place. With{' '}
            <Code>coversBar</Code>, a floating bar slides away while the panel is open and the
            panel moves down into its place. <Code>backdrop</Code> is drawn over the whole screen
            behind the panel: a dim, or a blur from your own dependencies. It fades with the
            panel&rsquo;s slide, and a tap returns the panel to rest.{' '}
            <Design id="filter-chips">Filter Chips</Design> uses both.
          </p>
          <CodeBlock
            filename="components/filters-panel.tsx"
            code={`<TabPanel
  id="filters"
  peekHeight={60}
  initialState="peek"
  coversBar
  backdrop={<View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />}
>
  <Filters />
</TabPanel>
`}
          />
          <p>
            The bar&rsquo;s reported height doesn&rsquo;t change, so screens don&rsquo;t resize
            under it. <Code>coversBar</Code> needs a floating bar; under a docked bar it is
            ignored.
          </p>
        </DocSection>
        <DocSection section={{ id: 'dragging', title: 'Dragging' }}>
          <p>Dragging a panel uses <Code>react-native-tabcn/gestures</Code>. {GESTURES}</p>
        </DocSection>
      </>
    ),
  },

  sheets: {
    sections: [
      { id: 'bar-sheet', title: 'Bar Sheet' },
      { id: 'your-own-sheet', title: 'Your own sheet' },
    ],
    render: () => (
      <>
        <DocSection section={{ id: 'bar-sheet', title: 'Bar Sheet' }}>
          <p>
            Any panel given <Code>snapPoints</Code> is a sheet.{' '}
            <Design id="bar-sheet">Bar Sheet</Design> is one, ready to copy. It needs the{' '}
            <Code>TabBarProvider</Code>, and for dragging, a <Code>GestureHandlerRootView</Code>{' '}
            around the app.
          </p>
          <CodeBlock
            filename="app/(tabs)/_layout.tsx"
            code={`// Declared beside <Tabs>, so it stays across tabs
export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs tabBar={tabBar(<SoftPill />)} screenOptions={{ headerShown: false }} />
      <BarSheet title="Comments" subtitle="128 replies">
        <CommentList />
      </BarSheet>
    </TabBarProvider>
  );
}

// Anywhere under the provider
function CommentsButton() {
  const sheet = useBarSheet(); // useTabPanel('sheet')
  // open() goes to the lowest snap point and snapTo(1) to the next; sheet.snap says where it rests.
  return <Button title="Comments" onPress={sheet.open} />;
}
`}
          />
        </DocSection>
        <DocSection section={{ id: 'your-own-sheet', title: 'Your own sheet' }}>
          <p>
            Pass <Code>snapPoints</Code> (points or percentages of the screen, lowest first) to{' '}
            <Code>TabPanel</Code>. Put the header in <Code>PanelDragArea</Code> and the body in{' '}
            <Code>PanelScrollView</Code>, both from <Code>react-native-tabcn/gestures</Code>.
          </p>
          <p>
            The sheet is modal only at its highest snap point, and with a screen reader on it opens
            straight to it.
          </p>
          <p>
            A sheet with a single snap point is a card that rests above the bar, under docked and
            floating bars alike: <Design id="slider-sheet">Slider Sheet</Design> measures its card
            and uses its height as that snap point, with a <Code>backdrop</Code> that dims the
            screen behind it.
          </p>
        </DocSection>
      </>
    ),
  },

  'minimize-on-scroll': {
    sections: [
      { id: 'opt-in', title: 'Opt a screen in' },
      { id: 'side-rail', title: 'Side rail' },
    ],
    render: () => (
      <>
        <DocSection section={{ id: 'opt-in', title: 'Opt a screen in' }}>
          <p>
            Bars that support it, such as <Design id="split-search">Split Search</Design>, also
            come back when the screen reaches the top or the bar is tapped. It needs a{' '}
            <Code>TabBarProvider</Code> around the tabs navigator:
          </p>
          <CodeBlock
            filename="app/(tabs)/_layout.tsx"
            code={`export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs tabBar={tabBar(<SplitSearch />)} screenOptions={{ headerShown: false }} />
    </TabBarProvider>
  );
}
`}
          />
          <p>
            A screen opts in with <Code>useMinimizeOnScroll()</Code>:
          </p>
          <CodeBlock
            filename="app/(tabs)/index.tsx"
            code={`import Animated from 'react-native-reanimated';
import { useMinimizeOnScroll } from 'react-native-tabcn';

export default function Home() {
  const onScroll = useMinimizeOnScroll();
  return <Animated.FlatList data={items} renderItem={renderItem} onScroll={onScroll} />;
}
`}
          />
        </DocSection>
        <DocSection section={{ id: 'side-rail', title: 'Side rail' }}>
          <p>
            On tablets, <Design id="side-rail">Side Rail</Design> draws a rail on the left when the
            navigator&rsquo;s <Code>tabBarPosition</Code> is <Code>&apos;left&apos;</Code>, and a
            bottom bar otherwise.
          </p>
        </DocSection>
      </>
    ),
  },

  companions: {
    sections: [{ id: 'tab-bar-companion', title: 'TabBarCompanion' }],
    render: () => (
      <DocSection section={{ id: 'tab-bar-companion', title: 'TabBarCompanion' }}>
        <p>
          <Code>TabBarCompanion</Code> puts a small control against the bar without magic numbers.
          It follows the bar when it minimizes, slides away with it for the keyboard, rides above a
          peeking mini player, and fades while a panel is open.{' '}
          <Design id="companion-chip">Companion Chip</Design> is ready to put in it.
        </p>
        <CodeBlock
          filename="app/(tabs)/map.tsx"
          code={`// Shown while the Map screen is focused
function LocateButton() {
  const focused = useIsFocused();
  return (
    <TabBarCompanion position="above-end" visible={focused}>
      <CompanionChip
        variant="round"
        icon={LocateIcon}
        accessibilityLabel="Locate me"
        onPress={recenter}
      />
    </TabBarCompanion>
  );
}
`}
        />
        <p>
          <Code>position</Code> is <Code>&apos;above&apos;</Code>,{' '}
          <Code>&apos;above-start&apos;</Code> or <Code>&apos;above-end&apos;</Code>, or{' '}
          <Code>&apos;start&apos;</Code> and <Code>&apos;end&apos;</Code> beside a floating bar.
          Start and end mirror in right-to-left layouts.
        </p>
      </DocSection>
    ),
  },

  toasts: {
    sections: [{ id: 'use-tab-bar-inset', title: 'useTabBarInset' }],
    render: () => (
      <DocSection section={{ id: 'use-tab-bar-inset', title: 'useTabBarInset' }}>
        <p>
          <Code>useTabBarInset()</Code> is the distance from the screen&rsquo;s bottom edge to the
          top of what tabcn draws there: the bar and its gap, a peeking panel, and companions above
          the bar. It works anywhere under the <Code>TabBarProvider</Code>, so you can put the
          provider around your root stack and hand the number to your toast library:
        </p>
        <CodeBlock
          filename="app/_layout.tsx"
          code={`function Toasts() {
  return <Toaster bottomOffset={useTabBarInset() + 8} />;
}
`}
        />
        <p>
          It is 0 while the keyboard is up (your toast library adds the keyboard itself), for a
          side rail, and while a screen or modal covers the tabs.
        </p>
        <p>
          With the provider above the root stack, use one tab navigator per provider. Don&rsquo;t
          declare panels, companions or overrides from modals or pushed root-stack screens: they
          would reach the bar underneath.
        </p>
      </DocSection>
    ),
  },

  'sub-tabs': {
    sections: [{ id: 'hold-a-tab', title: 'Hold a tab' }],
    render: () => (
      <DocSection section={{ id: 'hold-a-tab', title: 'Hold a tab' }}>
        <p>
          <Code>TabButton</Code> takes <Code>onLongPress</Code>, which runs after the
          navigator&rsquo;s <Code>tabLongPress</Code> event and is offered to VoiceOver and TalkBack
          as a named action. <Design id="sub-tabs">Sub-Tabs</Design> uses it for a drawer that
          slides up from behind one tab. The tab spreads what <Code>useSubTabs(name)</Code>{' '}
          returns, and the drawer is declared beside the navigator:
        </p>
        <CodeBlock
          filename="components/tabcn/my-tab-bar.tsx"
          code={`function LibraryTab({ tab }: { tab: TabItem }) {
  const sub = useSubTabs('library', { width: 168 });
  return (
    <TabButton tab={tab} {...sub.tabProps}>
      <LibraryIcon />
      <View {...sub.anchorProps} />
    </TabButton>
  );
}
`}
        />
        <CodeBlock
          filename="app/(tabs)/_layout.tsx"
          code={`export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs tabBar={tabBar(<MyTabBar />)} screenOptions={{ headerShown: false }} />
      <SubTabs
        name="library"
        items={[
          { label: 'Albums', onPress: openAlbums },
          { label: 'Artists', onPress: openArtists },
        ]}
      />
    </TabBarProvider>
  );
}
`}
        />
      </DocSection>
    ),
  },

  'sheet-navigation': {
    sections: [{ id: 'section-sheet', title: 'Section Sheet' }],
    render: () => (
      <DocSection section={{ id: 'section-sheet', title: 'Section Sheet' }}>
        <p>
          <Design id="section-sheet">Section Sheet</Design> replaces the bar with one sheet over
          full-screen content, such as a map or a canvas, whose header holds the sections. It is
          still a real tab navigator, so deep links and Android back keep working. Each
          section&rsquo;s sheet body comes from <Code>sections</Code>, by route name:
        </p>
        <CodeBlock
          filename="app/(tabs)/_layout.tsx"
          code={`// Routes: index, guides and saved
export default function TabLayout() {
  return (
    <TabBarProvider>
      <Tabs
        backBehavior="history"
        tabBar={tabBar(
          <SectionSheet
            sections={{ index: <ExploreList />, guides: <GuideList />, saved: <SavedList /> }}
          />,
        )}
        screenOptions={{ headerShown: false }}
      />
    </TabBarProvider>
  );
}
`}
        />
        <p>
          Screens draw the content behind the sheet and pad their own controls with{' '}
          <Code>useBottomTabBarHeight()</Code>, which is the collapsed strip&rsquo;s height.
        </p>
      </DocSection>
    ),
  },

  scrubbing: {
    sections: [
      { id: 'tab-scrub', title: 'TabScrub' },
      { id: 'while-the-finger-is-down', title: 'While the finger is down' },
    ],
    render: () => (
      <>
        <DocSection section={{ id: 'tab-scrub', title: 'TabScrub' }}>
          <p>
            <Code>TabScrub</Code> from <Code>react-native-tabcn/gestures</Code> is a{' '}
            <Code>TabList</Code> you can press and slide along. The indicator follows the finger,{' '}
            <Code>onTabCross</Code> runs for each tab it passes (for a haptic), and lifting chooses
            the tab under it. A tap is still a tap, and a vertical swipe is left to the system.{' '}
            <Design id="scrub-pill">Scrub Pill</Design> uses it; in your own design, swap{' '}
            <Code>TabList</Code> for <Code>TabScrub</Code>:
          </p>
          <CodeBlock
            filename="components/tabcn/my-tab-bar.tsx"
            code={`export function MyTabBar() {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabScrub onTabCross={() => Haptics.selectionAsync()} style={styles.pill}>
        <TabIndicator style={styles.lens} />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} />
        ))}
      </TabScrub>
    </TabBarRoot>
  );
}
`}
          />
          <p>{GESTURES}</p>
        </DocSection>
        <DocSection section={{ id: 'while-the-finger-is-down', title: 'While the finger is down' }}>
          <p>
            <Code>onScrubStart(tab)</Code> and <Code>onScrubEnd(tab | null)</Code> bracket a scrub,
            so a design can show something while the finger is down.{' '}
            <Design id="composer-dock">Composer Dock</Design> names the tab under the finger in a
            small pill (updating it in <Code>onTabCross</Code>) and lets the screen preview it.
          </p>
          <p>
            <Code>onScrubEnd</Code> gets the tab the finger lifted on, or <Code>null</Code> when it
            lifted away from the bar or the system took the touch, and runs before that tab is
            pressed.
          </p>
        </DocSection>
      </>
    ),
  },

  'live-tabs': {
    sections: [{ id: 'use-live-tab', title: 'useLiveTab' }],
    render: () => (
      <DocSection section={{ id: 'use-live-tab', title: 'useLiveTab' }}>
        <p>
          <Code>useLiveTab(routeName)</Code> holds a tab&rsquo;s live values under the{' '}
          <Code>TabBarProvider</Code>: a <Code>progress</Code> shared value from 0 to 1 and a short{' '}
          <Code>text</Code>. A screen or a service writes them, and a design such as{' '}
          <Design id="live-tabs">Live Tabs</Design> draws them as a ring around the icon and a line
          in place of the label.
        </p>
        <CodeBlock
          filename="app/(tabs)/timer.tsx"
          code={`// In the Timer screen (or a component that follows your timer), once a second
const timer = useLiveTab('timer'); // the tab's route name
timer.progress.value = elapsed / duration; // fills the ring; 0 or 1 hides it
timer.setText(remaining > 0 ? format(remaining) : undefined); // shown in place of the label
`}
        />
        <p>
          Writing <Code>progress</Code> re-renders nothing. <Code>setText</Code> re-renders only
          what reads that tab&rsquo;s text, and screen readers hear it as the tab&rsquo;s value.
        </p>
      </DocSection>
    ),
  },
};
