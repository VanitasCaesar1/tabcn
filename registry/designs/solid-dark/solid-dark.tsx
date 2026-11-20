/**
 * Solid Dark: a black bar with icons only. Each tab crossfades from its outline
 * icon to its filled one, and a small dot settles under the active tab.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
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
  background: '#0b0b0d',
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
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <Dot color={colors.active} />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/** A 4 pt dot that follows the active tab along the bottom edge. */
function Dot({ color }: { color: string }) {
  const { x, width, ready } = useTabIndicator();
  const style = useAnimatedStyle(() => ({
    opacity: ready.value ? 1 : 0,
    transform: [{ translateX: x.value + width.value / 2 - 2 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.dot, { backgroundColor: color }, style]} />
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
  const outline = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const filled = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.85, 1]) }],
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, outline]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 26 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, filled]}>
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
  outer: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  bar: {
    height: 60,
    borderRadius: 18,
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
  dot: {
    position: 'absolute',
    left: 0,
    bottom: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
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
