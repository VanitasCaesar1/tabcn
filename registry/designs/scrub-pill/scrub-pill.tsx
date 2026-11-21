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
import { StyleSheet, Text, View } from 'react-native';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  useTabBar,
} from 'react-native-tabcn';
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
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
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
      {tab.renderIcon ? (
        <View>
          {tab.renderIcon({ focused: tab.focused, color, size: ICON })}
          <Badge badge={tab.badge} colors={colors} />
        </View>
      ) : null}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>
        {tab.label}
      </Text>
    </TabButton>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: ScrubPillColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) return <View style={[styles.dot, { backgroundColor: colors.badge }]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

const ICON = 22;
/** The lens sits a little inside each tab's frame. */
const LENS_INSET = { x: 2, y: 2 };

const styles = StyleSheet.create({
  pill: {
    // Fits the screen when the tabs' full width doesn't: they shrink instead.
    maxWidth: '100%',
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
    flexShrink: 1,
    minWidth: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  dot: { position: 'absolute', top: -1, right: -3, width: 8, height: 8, borderRadius: 4 },
  count: {
    position: 'absolute',
    top: -5,
    left: ICON - 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
});
