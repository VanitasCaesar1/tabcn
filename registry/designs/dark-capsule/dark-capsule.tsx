/**
 * Dark Capsule: a dark bar with icons only; an outlined capsule slides behind
 * the active tab.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: '#0e0e10',
  capsule: '#1c1c1f',
  capsuleBorder: '#38383d',
  active: '#ffffff',
  inactive: '#8a8a90',
  badge: '#ff453a',
};

export type DarkCapsuleColors = typeof defaultColors;

export interface DarkCapsuleProps {
  colors?: Partial<DarkCapsuleColors>;
  haptics?: boolean;
}

export function DarkCapsule({ colors: custom, haptics = true }: DarkCapsuleProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 4, y: 9 }}
          style={[
            styles.capsule,
            { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
          ]}
        />
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
  colors: DarkCapsuleColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const inactive = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
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
        {tab.badge != null ? (
          <View
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

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  bar: { height: 62, borderRadius: 21 },
  capsule: { borderRadius: 999, borderWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 30, height: 30 },
  center: { alignItems: 'center', justifyContent: 'center' },
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
