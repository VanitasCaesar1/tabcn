/**
 * Scrub Pill: a floating pill of icons and labels with a soft tinted lens behind the active
 * tab. Tap a tab, or press and slide along the pill: the lens follows the finger, a light
 * haptic marks each tab it crosses, and lifting chooses the tab under the finger. The
 * chosen tab's icon and label take the accent colour.
 *
 * Scrubbing comes from `TabScrub` in 'react-native-tabcn/gestures', so this design needs
 * `react-native-gesture-handler` and a `GestureHandlerRootView` around the app. A tap is
 * still a tap; a vertical swipe (the home indicator) is left to the system; lifting far
 * above or below the pill, or on the active tab, changes nothing. Pass `scrub={false}` for
 * a plain pill.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<ScrubPill />)} screenOptions={{ headerShown: false }} />
 * ```
 *
 * The lens glides on tabcnSpring (critically damped, so it trails the finger and never
 * passes it); colours change instantly; nothing scales, bounces or turns. With "reduce
 * motion" on, the lens moves tab by tab instead of following the finger, and lands without
 * animating. Screen readers select tabs as usual.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import 'react-native-gesture-handler';
import { StyleSheet, Text } from 'react-native';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, useTabBar } from 'react-native-tabcn';
import { TabScrub } from 'react-native-tabcn/gestures';

const defaultColors = {
  /** The pill. */
  background: 'rgba(250, 250, 252, 0.97)',
  /** Hairline edge of the pill. */
  border: 'rgba(0, 0, 0, 0.06)',
  /** The lens behind the active tab (and under the finger while scrubbing). */
  lens: 'rgba(10, 100, 214, 0.12)',
  /** The active tab's icon and label. */
  accent: '#0a64d6',
  /** The other tabs' icons and labels. */
  muted: 'rgba(21, 21, 23, 0.62)',
};

export type ScrubPillColors = typeof defaultColors;

export interface ScrubPillProps {
  colors?: Partial<ScrubPillColors>;
  /** A selection haptic for each tab the finger crosses, and on tap. Default true. */
  haptics?: boolean;
  /** Press and slide along the pill to move through the tabs. Default true. */
  scrub?: boolean;
}

export function ScrubPill({ colors: custom, haptics = true, scrub = true }: ScrubPillProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabScrub
        enabled={scrub}
        onTabCross={haptics ? () => Haptics.selectionAsync() : undefined}
        style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <TabIndicator inset={LENS_INSET} style={[styles.lens, { backgroundColor: colors.lens }]} />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabScrub>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: ScrubPillColors;
  haptics: boolean;
}) {
  const color = tab.focused ? colors.accent : colors.muted;
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color, size: ICON })}
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {tab.label}
      </Text>
    </TabButton>
  );
}

const ICON = 22;
/** The lens sits a little inside each tab's frame. */
const LENS_INSET = { x: 2, y: 2 };

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    padding: 4,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
  },
  lens: {
    borderRadius: 999,
    borderCurve: 'continuous',
  },
  tab: {
    width: 68,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
