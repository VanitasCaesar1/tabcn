/**
 * Frosted Media: a see-through pill that blurs whatever is behind it, with
 * white icons and labels; a raised glass capsule slides to the active tab.
 * Uses iOS liquid glass where available, blur everywhere else.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
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
  tint: 'rgba(120, 84, 56, 0.18)',
  border: 'rgba(255, 255, 255, 0.28)',
  capsule: 'rgba(255, 255, 255, 0.14)',
  capsuleBorder: 'rgba(255, 255, 255, 0.42)',
  foreground: '#ffffff',
};

export type FrostedMediaColors = typeof defaultColors;

export interface FrostedMediaProps {
  colors?: Partial<FrostedMediaColors>;
  /** Blur strength when liquid glass isn't available. Default 40. */
  intensity?: number;
  haptics?: boolean;
}

export function FrostedMedia({
  colors: custom,
  intensity = 60,
  haptics = true,
}: FrostedMediaProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const glass = isLiquidGlassAvailable();
  return (
    <TabBarRoot placement="floating">
      <View style={[styles.pill, { borderColor: colors.border }]}>
        {glass ? (
          <GlassView
            glassEffectStyle="clear"
            tintColor={colors.tint}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tint }]} />
        <TabList style={styles.list}>
          <TabIndicator
            inset={5}
            style={[
              styles.capsule,
              { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
            ]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} color={colors.foreground} haptics={haptics} />
          ))}
        </TabList>
      </View>
    </TabBarRoot>
  );
}

function Tab({ tab, color, haptics }: { tab: TabItem; color: string; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const content = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.82, 1]),
    // A small swell during the change only; both resting states are the reference's size.
    transform: [{ scale: 1 + 0.04 * Math.sin(Math.PI * progress.value) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.content, content]}>
        {tab.renderIcon?.({ focused: tab.focused, color, size: 24 })}
        <Text numberOfLines={1} style={[styles.label, { color }]}>
          {tab.label}
        </Text>
      </Animated.View>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
  },
  list: { padding: 4 },
  capsule: { borderRadius: 999, borderWidth: 1.2 },
  tab: { width: 84.5, height: 50, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 2 },
  label: { fontSize: 12, fontWeight: '600' },
});
