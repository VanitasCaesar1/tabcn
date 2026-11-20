/**
 * Light Icons: a light grey bar with icons only. The active icon switches to
 * its filled version with a small spring pop.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#f3f2f7',
  active: '#111114',
  inactive: '#8e8e95',
  badge: '#ff3b30',
};

export type LightIconsColors = typeof defaultColors;

export interface LightIconsProps {
  colors?: Partial<LightIconsColors>;
  haptics?: boolean;
}

export function LightIcons({ colors: custom, haptics = true }: LightIconsProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
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
  colors: LightIconsColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (tab.focused) {
      pop.value = withSequence(
        withTiming(0.82, { duration: 90, reduceMotion: ReduceMotion.System }),
        withSpring(1, { damping: 9, stiffness: 260, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [tab.focused, pop]);
  const box = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const inactive = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.iconBox, box]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 30 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 30 })}
        </Animated.View>
        {tab.badge != null ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </Animated.View>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  bar: {
    height: 55,
    borderRadius: 18,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 34, height: 34 },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
