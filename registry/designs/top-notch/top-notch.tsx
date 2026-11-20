/**
 * Top Notch: a rounded card with icons and labels; a short bar slides along the
 * top edge to the active tab, and colours crossfade.
 * Built on tabcn: https://github.com/OWNER/tabcn
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
  active: '#4f3fd9',
  inactive: '#b4aaf0',
  badge: '#ff3b30',
};

export type TopNotchColors = typeof defaultColors;

export interface TopNotchProps {
  colors?: Partial<TopNotchColors>;
  haptics?: boolean;
}

export function TopNotch({ colors: custom, haptics = true }: TopNotchProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.card, { backgroundColor: colors.background }]}>
        <Notch color={colors.active} />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Notch({ color }: { color: string }) {
  const { x, width, ready } = useTabIndicator();
  const style = useAnimatedStyle(() => ({
    opacity: ready.value ? 1 : 0,
    width: width.value * 0.62,
    transform: [{ translateX: x.value + width.value * 0.19 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.notch, { backgroundColor: color }, style]} />
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: TopNotchColors; haptics: boolean }) {
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
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 28 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 28 })}
        </Animated.View>
        {tab.badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.badge }]} />
        ) : null}
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  card: {
    borderRadius: 22,
    paddingVertical: 12,
    boxShadow: '0 10px 30px rgba(60, 40, 160, 0.16)',
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 6 },
  iconBox: { width: 32, height: 32 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '700' },
  badge: { position: 'absolute', top: 0, right: -2, width: 9, height: 9, borderRadius: 5 },
});
