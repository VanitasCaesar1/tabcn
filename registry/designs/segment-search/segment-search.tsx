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
  /** Top to bottom: a lighter band along the top edge, then the body colour. */
  gradient: ['#a4d2fe', '#86c1fb', '#86c1fb'] as const,
  text: '#ffffff',
  capsule: 'rgba(255, 255, 255, 0.2)',
  capsuleBorder: 'rgba(255, 255, 255, 0.55)',
  /** The soft grey shadow the pill and button sit in. */
  shadow: 'rgba(100, 120, 150, 0.34)',
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
      <View style={[styles.well, wellShadow(colors.shadow)]}>
        <LinearGradient colors={colors.gradient} locations={GRADIENT_STOPS} style={styles.pill}>
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: 0.3, y: 4.5 }}
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
      <View style={[styles.well, wellShadow(colors.shadow)]}>
        <PressableScale
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          onPressIn={
            haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
          }
        >
          <LinearGradient colors={colors.gradient} locations={GRADIENT_STOPS} style={styles.round}>
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
const GRADIENT_STOPS = [0, 0.45, 1] as const;

/** A soft shadow on every side, a little stronger below: the shapes look set into the page. */
function wellShadow(color: string) {
  return { boxShadow: `0 0 2px ${color}, 0 0 12px 3px ${color}, 0 5px 12px ${color}` };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 89 },
  well: { borderRadius: 999 },
  pill: { height: HEIGHT, borderRadius: 999, overflow: 'hidden' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: 5.2 },
  capsule: { borderRadius: 999, borderWidth: 0.8 },
  tab: { justifyContent: 'center', alignItems: 'center', width: 86 },
  label: { fontSize: 15, fontWeight: '500' },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  magnifier: { width: 18, height: 18 },
  lens: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.4,
  },
  handle: {
    position: 'absolute',
    left: 10.4,
    top: 12.6,
    width: 7.2,
    height: 2.6,
    borderRadius: 1.3,
    transform: [{ rotate: '45deg' }],
  },
});
