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
  const { style } = useTabIndicator({ inset: 6 });
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
          { backgroundColor: colors.glow, boxShadow: `0 0 26px 14px ${colors.glow}88` },
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
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: 28 })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, lit]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: 28 })}
        </Animated.View>
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

const HEIGHT = 74;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { height: HEIGHT, borderRadius: 999, borderWidth: 1, overflow: 'hidden' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: 2 },
  capsule: { borderRadius: 999, borderWidth: 1, overflow: 'hidden', alignItems: 'center' },
  glow: { marginTop: 14, width: 18, height: 18, borderRadius: 9, opacity: 0.9 },
  tab: {
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  iconBox: { width: 30, height: 30 },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '500' },
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
