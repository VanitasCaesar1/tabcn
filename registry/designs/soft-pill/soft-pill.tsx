/**
 * Soft Pill: a white pill with icons and labels. The active tab's grey capsule
 * fades and swells in place (it doesn't slide), and the label turns bold.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  capsule: '#e9e9ec',
  foreground: '#151517',
};

export type SoftPillColors = typeof defaultColors;

export interface SoftPillProps {
  colors?: Partial<SoftPillColors>;
  haptics?: boolean;
}

export function SoftPill({ colors: custom, haptics = true }: SoftPillProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating">
      <TabList style={[styles.pill, { backgroundColor: colors.background }]}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: SoftPillColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const capsule = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.capsule,
          { backgroundColor: colors.capsule },
          capsule,
        ]}
      />
      {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: 18 })}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: colors.foreground, fontWeight: tab.focused ? '700' : '500' },
        ]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    padding: 5,
    boxShadow: '0 10px 28px rgba(60, 40, 20, 0.14)',
  },
  capsule: { borderRadius: 999 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 64,
    height: 48.5,
  },
  label: { fontSize: 10.5 },
});
