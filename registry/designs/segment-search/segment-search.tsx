/**
 * Segment + Search: a gradient segment control of text tabs with a glass
 * capsule that slides between them, next to a separate round search button.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  gradient: ['#b1d8ff', '#7cb6ff'] as const,
  text: '#ffffff',
  capsule: 'rgba(255, 255, 255, 0.2)',
  capsuleBorder: 'rgba(255, 255, 255, 0.6)',
  halo: 'rgba(124, 182, 255, 0.18)',
};

export type SegmentSearchColors = typeof defaultColors;

export interface SegmentSearchProps {
  /** Runs when the round button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the round button. Default "Search". */
  actionLabel?: string;
  /** Content of the round button. Default: a magnifying glass. */
  actionIcon?: ReactNode;
  colors?: Partial<SegmentSearchColors>;
  haptics?: boolean;
}

export function SegmentSearch({
  onActionPress,
  actionLabel = 'Search',
  actionIcon,
  colors: custom,
  haptics = true,
}: SegmentSearchProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.row}>
      <View style={[styles.halo, { backgroundColor: colors.halo }]}>
        <LinearGradient
          colors={colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <TabList style={styles.list}>
            <TabIndicator
              inset={6}
              style={[
                styles.capsule,
                { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
              ]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} color={colors.text} haptics={haptics} />
            ))}
          </TabList>
        </LinearGradient>
      </View>
      <View style={[styles.halo, styles.roundHalo, { backgroundColor: colors.halo }]}>
        <PressableScale
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          onPressIn={
            haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
          }
        >
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.round}
          >
            {actionIcon ?? <Magnifier color={colors.text} />}
          </LinearGradient>
        </PressableScale>
      </View>
    </TabBarRoot>
  );
}

function Tab({ tab, color, haptics }: { tab: TabItem; color: string; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const label = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.96, 1]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.Text numberOfLines={1} style={[styles.label, { color }, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

function Magnifier({ color }: { color: string }) {
  return (
    <View style={styles.magnifier}>
      <View style={[styles.lens, { borderColor: color }]} />
      <View style={[styles.handle, { backgroundColor: color }]} />
    </View>
  );
}

const HEIGHT = 58;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 56 },
  halo: { padding: 6, borderRadius: 999 },
  roundHalo: { padding: 6 },
  pill: { height: HEIGHT, borderRadius: 999, boxShadow: '0 6px 18px rgba(80, 140, 230, 0.3)' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: 0 },
  capsule: { borderRadius: 999, borderWidth: 1.5 },
  tab: { justifyContent: 'center', alignItems: 'center', width: 91 },
  label: { fontSize: 15.5, fontWeight: '500' },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 18px rgba(80, 140, 230, 0.3)',
  },
  magnifier: { width: 24, height: 24 },
  lens: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2.6,
  },
  handle: {
    position: 'absolute',
    left: 15,
    top: 16.5,
    width: 8,
    height: 2.8,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});
