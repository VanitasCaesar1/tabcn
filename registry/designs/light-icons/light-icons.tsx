/**
 * Light Icons: the Amble app's tab bar. Five icons straight on the near-black
 * screen: no labels, no surface of its own, no border, shadow, blur or
 * indicator. Docked and flush with the bottom, five equal columns across the
 * full width. Idle tabs are grey glyphs; the active tab crossfades to its white
 * glyph (filled for chat and profile, heavier for search: the app's stills show
 * only one active glyph, so these pairs are this design's choice). The record
 * tab is an ordinary tab drawn larger than the rest, and dimmer when idle.
 *
 * Motion: nothing in the bar moves. A tab change is a 200 ms crossfade of the
 * glyph (tabcnTiming), with no scale or press dim; the badge dot fades in and
 * out. Reduce motion makes both instant. The bar never minimizes on scroll.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
  /** The screen colour: the bar has no surface of its own. Measured #0e0e0c. */
  background: '#0e0e0e',
  /** Active glyph: measured pure white. */
  active: '#ffffff',
  /** Idle glyphs: thin strokes peak at #9b to #a1 through the photo's blur. */
  inactive: '#a6a6a6',
  /** The badge dot; it is ringed in `background`. */
  badge: '#ff453a',
};

export type LightIconsColors = typeof defaultColors;

export interface LightIconsProps {
  colors?: Partial<LightIconsColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function LightIcons({ colors: custom, haptics = true }: LightIconsProps) {
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
  colors: LightIconsColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // The active glyph fades in over the idle one, which stays opaque until the last stretch, so
  // the icon never dims half-way.
  const idle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));

  // The badge dot fades in and out (opacity only, no scale pop). It stays mounted so it can
  // fade out; reduce motion makes it instant (tabcnTiming).
  const hasBadge = tab.badge != null;
  const badgeOpacity = useSharedValue(hasBadge ? 1 : 0);
  useEffect(() => {
    badgeOpacity.value = withTiming(hasBadge ? 1 : 0, tabcnTiming);
  }, [hasBadge, badgeOpacity]);
  const badge = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));

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
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.badge,
            { backgroundColor: colors.badge, borderColor: colors.background },
            badge,
          ]}
        />
      </View>
    </TabButton>
  );
}

// Measured on the app's App Store screenshot 3 (a phone held in a hand) at about
// 1.65 px/pt on a 393 pt wide screen: the tab pitch is 130.3 px = 393/5 pt.
/** The icons' 40-unit box, in points: one unit is one point, so glyphs draw 25 to 36 pt. */
const ICON = 40;
/** Icon centres sit about 50 pt above the screen's bottom edge: 16 pt above the safe area. */
const CENTRE_ABOVE_INSET = 16;
/** The page content ends 23 pt above the icon tops, 37 pt above their centres. */
const BAR_HEIGHT = CENTRE_ABOVE_INSET + 37;

const styles = StyleSheet.create({
  bar: { height: BAR_HEIGHT },
  // Five equal columns across the full width, no side inset, as in the app.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  // The 40 pt box only has empty margin below its 36 pt record glyph, so it may hang 4 pt
  // into the safe area to put the centres where the app has them.
  iconBox: { width: ICON, height: ICON, marginBottom: CENTRE_ABOVE_INSET - ICON / 2 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
