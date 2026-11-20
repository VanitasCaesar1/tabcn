/**
 * Outline Dark: a black bar with outline icons. The active icon brightens and
 * lifts slightly; the others dim.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  background: '#000000',
  icon: '#ffffff',
  badge: '#ff453a',
};

export type OutlineDarkColors = typeof defaultColors;

export interface OutlineDarkProps {
  colors?: Partial<OutlineDarkColors>;
  haptics?: boolean;
}

export function OutlineDark({ colors: custom, haptics = true }: OutlineDarkProps) {
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
  colors: OutlineDarkColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const icon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.42, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -2]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.08]) },
    ],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={icon}>
        {tab.renderIcon?.({ focused: false, color: colors.icon, size: 27 })}
      </Animated.View>
      {tab.badge != null ? (
        <View
          style={[styles.badge, { backgroundColor: colors.badge, borderColor: colors.background }]}
        />
      ) : null}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { alignSelf: 'stretch', paddingHorizontal: 16 },
  bar: { height: 64, borderRadius: 20 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 16,
    right: '30%',
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
