/**
 * Outline Dark: the Blank Spaces app's tab bar. A row of icons straight on the
 * black screen: no labels, no container, border, blur or indicator. Idle tabs
 * are grey outline glyphs; the active tab crossfades to the white filled glyph
 * (outline lock to solid lock, as in the app). Docked and flush with the
 * bottom; the outer icons sit 70 pt in from the edges and the rest are spread
 * evenly between them.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The screen colour: the bar has no surface of its own. */
  background: '#000000',
  /** Active glyph. */
  icon: '#ffffff',
  /** Idle glyphs: measured about #8e8e8e to #919191 (the system grey). */
  inactive: '#8e8e93',
  /** The badge dot; it is ringed in `background`. */
  badge: '#ff453a',
};

export type OutlineDarkColors = typeof defaultColors;

export interface OutlineDarkProps {
  colors?: Partial<OutlineDarkColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function OutlineDark({ colors: custom, haptics = true }: OutlineDarkProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: OutlineDarkColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // The active glyph fades in over the idle one, which stays opaque until the last stretch, so
  // the icon never dims half-way.
  const idle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, idle]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.icon, size: ICON })}
        </Animated.View>
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            pointerEvents="none"
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
    </TabButton>
  );
}

// The badge dot fades in and out on tabcnTiming, with no pop; instant with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

// Measured on the app's iPad screenshots at 1.578 px/pt (an 834 pt wide screen).
/** The icons' 40-unit box, in points: glyphs draw about 20 to 22 pt, as in the app. */
const ICON = 24;
/** Icon centres sit 40 pt above the bottom safe area and 56 pt below the content. */
const BAR_HEIGHT = 80;
/** Tap target width of each tab; tabs narrow to share the row when they don't fit at this width. */
const TAB_WIDTH = 64;
/** The outer icon centres sit 70 pt from the screen edges. */
const EDGE_TO_CENTRE = 70;

const styles = StyleSheet.create({
  // Side padding lives on the row: TabBarRoot sets the dock's left/right padding to the safe area.
  bar: {
    height: BAR_HEIGHT,
    paddingHorizontal: EDGE_TO_CENTRE - TAB_WIDTH / 2,
    justifyContent: 'space-between',
  },
  // Up to 64 pt each, spread between the outer centres; on a narrow screen or with more tabs
  // they share the row instead of running past its end.
  tab: { flex: 1, maxWidth: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON },
  badge: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
