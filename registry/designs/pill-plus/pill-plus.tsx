/**
 * Pill + Plus: a raised white pill of icon-only tabs beside a matching round
 * plus button. The active icon turns dark and lifts; the others stay grey.
 * Built on tabcn: https://github.com/OWNER/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  active: '#111114',
  inactive: '#9a9a9f',
  plus: '#acacac',
};

export type PillPlusColors = typeof defaultColors;

export interface PillPlusProps {
  /** Runs when the plus button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus button. Default "Create". */
  actionLabel?: string;
  colors?: Partial<PillPlusColors>;
  haptics?: boolean;
}

export function PillPlus({
  onActionPress,
  actionLabel = 'Create',
  colors: custom,
  haptics = true,
}: PillPlusProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="floating" style={styles.row}>
      <View style={styles.raised}>
        <View style={[styles.pill, { backgroundColor: colors.background }]}>
          <TabList style={styles.list}>
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
        </View>
      </View>
      <PressableScale
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={
          haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
        }
        style={styles.raised}
      >
        <View style={[styles.round, { backgroundColor: colors.background }]}>
          <View style={[styles.plusBar, { backgroundColor: colors.plus }]} />
          <View
            style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.plus }]}
          />
        </View>
      </PressableScale>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: PillPlusColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const dim = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const lit = useAnimatedStyle(() => ({ opacity: progress.value }));
  const box = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -1]) }],
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.iconBox, box]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, dim]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, lit]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
      </Animated.View>
    </TabButton>
  );
}

const HEIGHT = 53;
/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 24.6;
/** A white, slightly domed surface: a soft bevel darkens the bottom edge. */
const BEVEL = 'inset 0 -6px 6px -3px rgba(30, 36, 48, 0.16)';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  // A tight contact shadow plus a short soft one: the pill sits just above the page.
  raised: {
    borderRadius: HEIGHT / 2,
    boxShadow:
      '0 0 3px rgba(30, 40, 60, 0.14), 0 1.5px 2px rgba(30, 40, 60, 0.2), 0 4px 9px rgba(30, 40, 60, 0.1)',
  },
  pill: {
    width: 200,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    paddingHorizontal: 18,
    boxShadow: BEVEL,
  },
  list: { flex: 1, alignItems: 'stretch' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 27, height: 27 },
  center: { alignItems: 'center', justifyContent: 'center' },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: BEVEL,
  },
  plusBar: { position: 'absolute', width: 15.2, height: 1.6, borderRadius: 1 },
  plusBarVertical: { transform: [{ rotate: '90deg' }] },
});
