/**
 * Pill + Plus: one floating white capsule, centred, holding icon-only tabs and a grey
 * plus action at its end, as in the corner app. No labels and no indicator: the active
 * icon crossfades to near-black, the others stay light grey. The capsule is slightly
 * domed (a soft inner shade at its edge) and casts a wide, soft shadow.
 *
 * Measured on the app (App Store shot, 2.59 px/pt on a 402 pt screen), with three tabs:
 * the capsule is 247 x 54 pt, icon centres sit 39, 97, 155 and 209 pt from its left
 * edge, and the icons ride 1.5 pt below its middle.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
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
  background: '#fdfeff',
  active: '#1a1a1a',
  inactive: '#b8b9bb',
  /** The plus glyph: the same grey as the inactive icons in the app. */
  plus: '#b8b9bb',
};

export type PillPlusColors = typeof defaultColors;

export interface PillPlusProps {
  /** Runs when the plus is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus. Default "Create". */
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
    <TabBarRoot placement="floating">
      <View style={styles.raised}>
        <View style={[styles.pill, { backgroundColor: colors.background }]}>
          <TabList style={styles.list}>
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
          <PressableScale
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            onPressIn={
              haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
            }
            scale={1}
            style={styles.plusSlot}
          >
            <View style={[styles.plusBar, { backgroundColor: colors.plus }]} />
            <View
              style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.plus }]}
            />
          </PressableScale>
        </View>
      </View>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: PillPlusColors; haptics: boolean }) {
  const progress = useFocusProgress(tab);
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
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, lit]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
      </View>
    </TabButton>
  );
}

/** Capsule height; the ends are full half-circles. */
const HEIGHT = 54;
/** The icons' 40-unit box in points (the 27.2 pt avatar fills it top to bottom). */
const ICON = 28;
/** Each tab's slot: icon centres are 58 pt apart. */
const SLOT = 58;
/** The plus sits closer: its centre is 54 pt past the last tab's. */
const PLUS_SLOT = 50;
/** The plus: 18.6 pt tip to tip, 2.2 pt bars with round ends. */
const PLUS = 18.6;
const PLUS_STROKE = 2.2;
/** Domed white: a soft shade all round the inside edge, a little more along the bottom. */
const BEVEL = 'inset 0 0 5px rgba(30, 36, 48, 0.07), inset 0 -6px 6px -3px rgba(30, 36, 48, 0.1)';

const styles = StyleSheet.create({
  // A faint contact shadow under a wide soft one that darkens the page ~20 pt out.
  raised: {
    borderRadius: HEIGHT / 2,
    boxShadow:
      '0 0 2px rgba(30, 40, 60, 0.1), 0 1.5px 3px rgba(30, 40, 60, 0.08), 0 4px 18px rgba(30, 40, 60, 0.14)',
  },
  pill: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    // First icon centre 39 pt in (10 + SLOT / 2); the plus centre 38 pt from the right end.
    paddingLeft: 10,
    paddingRight: 13,
    // The icons sit 1.5 pt below the capsule's middle in the app.
    paddingTop: 3,
    boxShadow: BEVEL,
  },
  list: { alignItems: 'stretch' },
  tab: { width: SLOT, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON },
  center: { alignItems: 'center', justifyContent: 'center' },
  plusSlot: { width: PLUS_SLOT, alignItems: 'center', justifyContent: 'center' },
  plusBar: {
    position: 'absolute',
    width: PLUS,
    height: PLUS_STROKE,
    borderRadius: PLUS_STROKE / 2,
  },
  plusBarVertical: { transform: [{ rotate: '90deg' }] },
});
