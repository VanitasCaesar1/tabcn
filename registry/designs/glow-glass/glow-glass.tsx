/**
 * Glow Glass: a dark glass pill with icons and labels. A warm glow sits behind
 * the active tab inside a glass capsule, and both slide together. A separate
 * round button with its own label runs an action.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
  useTabIndicator,
} from 'tabcn';

const defaultColors = {
  background: 'rgba(28, 30, 38, 0.72)',
  border: 'rgba(255, 255, 255, 0.14)',
  capsule: 'rgba(255, 255, 255, 0.08)',
  capsuleBorder: 'rgba(255, 255, 255, 0.16)',
  glow: '#ff8a1f',
  active: '#ffffff',
  inactive: '#9a9aa6',
};

export type GlowGlassColors = typeof defaultColors;

export interface GlowGlassProps {
  /** Runs when the round button is pressed. */
  onActionPress: () => void;
  /** Label under the round button's icon. Default "Spend". */
  actionLabel?: string;
  /** Icon inside the round button. */
  actionIcon?: ReactNode;
  colors?: Partial<GlowGlassColors>;
  haptics?: boolean;
}

export function GlowGlass({
  onActionPress,
  actionLabel = 'Spend',
  actionIcon,
  colors: custom,
  haptics = true,
}: GlowGlassProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.row}>
      <View
        style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <TabList style={styles.list}>
          <Capsule colors={colors} />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
          ))}
        </TabList>
      </View>
      <PressableScale
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={
          haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
        }
        style={[styles.round, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, styles.roundBlur]} />
        {actionIcon}
        <Text style={[styles.label, { color: colors.inactive }]}>{actionLabel}</Text>
      </PressableScale>
    </TabBarRoot>
  );
}

/** Glass capsule with a glow at the icon's position; follows the active tab. */
function Capsule({ colors }: { colors: GlowGlassColors }) {
  const { style } = useTabIndicator({ inset: { x: 0, y: 5 } });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.capsule,
        { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
        style,
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            experimental_backgroundImage: `radial-gradient(circle, ${colors.glow}cc 0%, ${colors.glow}55 38%, ${colors.glow}00 70%)`,
          },
        ]}
      />
    </Animated.View>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: GlowGlassColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.active]),
  }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const lit = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, dim]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 21 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, lit]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 21 })}
        </Animated.View>
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

const HEIGHT = 58.5;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8.5 },
  pill: { height: HEIGHT, borderRadius: 999, borderWidth: 1, overflow: 'hidden' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: 2 },
  capsule: { borderRadius: 999, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  glow: { marginTop: -8, width: 66, height: 66, borderRadius: 33 },
  tab: {
    width: 65,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBox: { width: 22, height: 22 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9.5, fontWeight: '500' },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  roundBlur: { borderRadius: HEIGHT / 2 },
});
