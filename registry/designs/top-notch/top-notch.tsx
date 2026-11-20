/**
 * Top Notch: a white docked bar with icons and labels; a short pill slides along
 * the top edge to the active tab, and icon and label colours crossfade.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
  useTabIndicator,
} from 'tabcn';

const defaultColors = {
  background: '#f6f4ff',
  active: '#533ddf',
  inactive: '#b0a5ef',
  badge: '#ff3b30',
};

export type TopNotchColors = typeof defaultColors;

export interface TopNotchProps {
  colors?: Partial<TopNotchColors>;
  /** Label font, e.g. a heavy geometric sans. Default: system font, weight 800. */
  fontFamily?: string;
  /** Icon box size in points. Default 40. */
  iconSize?: number;
  haptics?: boolean;
}

export function TopNotch({
  colors: custom,
  fontFamily,
  iconSize = 38,
  haptics = true,
}: TopNotchProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
      <TabList style={[styles.card, { backgroundColor: colors.background }]}>
        <Notch color={colors.active} />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            colors={colors}
            fontFamily={fontFamily}
            iconSize={iconSize}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

const NOTCH_WIDTH = 47;

function Notch({ color }: { color: string }) {
  const { x, width, ready } = useTabIndicator();
  const style = useAnimatedStyle(() => ({
    opacity: ready.value ? 1 : 0,
    transform: [{ translateX: x.value + (width.value - NOTCH_WIDTH) / 2 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.notch, { backgroundColor: color }, style]} />
  );
}

function Tab({
  tab,
  colors,
  fontFamily,
  iconSize,
  haptics,
}: {
  tab: TabItem;
  colors: TopNotchColors;
  fontFamily?: string;
  iconSize: number;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.active]),
  }));
  const inactiveIcon = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={{ width: iconSize, height: iconSize }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: iconSize })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: iconSize })}
        </Animated.View>
        {tab.badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.badge }]} />
        ) : null}
      </View>
      <Animated.Text
        numberOfLines={1}
        style={[styles.label, fontFamily ? { fontFamily } : styles.systemWeight, label]}
      >
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 32,
    boxShadow: '0 -6px 24px rgba(30, 20, 120, 0.14)',
  },
  card: {
    height: 75,
    paddingHorizontal: 6,
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: NOTCH_WIDTH,
    height: 5,
    borderRadius: 3,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 11, gap: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, lineHeight: 14 },
  systemWeight: { fontWeight: '800' },
  badge: { position: 'absolute', top: 2, right: 0, width: 9, height: 9, borderRadius: 5 },
});
