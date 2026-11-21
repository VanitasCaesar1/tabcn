/**
 * Solid Dark: a black bar with icons only. On focus the active (filled) icon fades in over
 * the inactive one, which stays put underneath so the glyph never dims mid-change. Nothing
 * moves or scales: there is no indicator, and a press only gives a haptic tick.
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
  background: '#131313',
  active: '#ffffff',
  inactive: 'rgba(255, 255, 255, 0.55)',
  badge: '#ff453a',
};

export type SolidDarkColors = typeof defaultColors;

export interface SolidDarkProps {
  colors?: Partial<SolidDarkColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function SolidDark({ colors: custom, haptics = true }: SolidDarkProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();

  return (
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
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
  colors: SolidDarkColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // The inactive icon stays fully opaque under the active one while it fades in, so the glyph
  // never dips in brightness halfway (a symmetric 1 - p / p crossfade would). It drops out only
  // over the last stretch, once the active icon covers it: invisible for this design's icons,
  // which share one shape, and it keeps an outline that sticks out past a filled icon from
  // lingering. Reduce motion makes the whole change instant (tabcnTiming).
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));

  // The badge dot fades in and out (no scale pop). It stays mounted so it can fade out.
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
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 26 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 26 })}
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

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
  },
  bar: {
    height: 45,
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 30,
    height: 30,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
