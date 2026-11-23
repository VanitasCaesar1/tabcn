/**
 * Pill + Plus: one floating white capsule, centred, holding icon-only tabs and a grey
 * plus action at its end, as in the corner app. No labels and no indicator: the active
 * icon fades from light grey to near-black (a near-black copy fades in over the grey one,
 * which never fades, so the colour change is linear and a photo avatar never dims), the
 * others stay light grey. Nothing moves or scales; with reduce motion the change is instant.
 * The plus is marked with `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 * The capsule is slightly domed (a soft inner shade at its edge) and casts a wide, soft
 * shadow.
 * The light grey of the inactive icons and the plus is kept as the app has it (low contrast).
 *
 * Measured on the app (App Store shot, 2.59 px/pt on a 402 pt screen), with three tabs:
 * the capsule is 247 x 54 pt, icon centres sit 39, 97, 155 and 209 pt from its left
 * edge, and the icons ride 1.5 pt below its middle.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { processColor, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The capsule's white. */
  background: '#fdfeff',
  /** Active icon. */
  active: '#1a1a1a',
  /** Inactive icons. */
  inactive: '#b8b9bb',
  /** The plus glyph: the same grey as the inactive icons in the app. */
  plus: '#b8b9bb',
  /**
   * The wide soft shadow under the capsule. Its faint contact shadow is drawn from it at
   * lower opacity.
   */
  shadow: 'rgba(30, 40, 60, 0.14)',
  /** The soft inner shade along the capsule's edge that makes it look domed. */
  bevel: 'rgba(30, 36, 48, 0.1)',
};

export type PillPlusColors = typeof defaultColors;

export interface PillPlusProps {
  /** Runs when the plus is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus. Default "Create". */
  actionLabel?: string;
  colors?: Partial<PillPlusColors>;
  /** Selection haptic on tabs, a light impact on the plus. Default true. */
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
  const anchor = usePanelAnchor('action');
  return (
    <TabBarRoot placement="floating">
      <View style={[styles.raised, { boxShadow: raisedShadow(colors.shadow) }]}>
        <View
          style={[
            styles.pill,
            { backgroundColor: colors.background, boxShadow: bevelShadow(colors.bevel) },
          ]}
        >
          <TabList style={styles.list}>
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
          <PressableScale
            {...anchor}
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
  // The near-black copy fades in over the grey one, which stays at full opacity until the
  // last stretch, so the icon passes through a true colour mix and a photo avatar (drawn the
  // same in both) barely dips. The grey copy then drops out so the active glyph rests alone.
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const lit = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
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
/** A faint contact shadow under a wide soft one that darkens the page ~20 pt out. */
function raisedShadow(color: string) {
  return `0 0 2px ${fade(color, 0.1 / 0.14)}, 0 1.5px 3px ${fade(color, 0.08 / 0.14)}, 0 4px 18px ${color}`;
}

/** Domed white: a soft shade all round the inside edge, a little more along the bottom. */
function bevelShadow(color: string) {
  return `inset 0 0 5px ${fade(color, 0.07 / 0.1)}, inset 0 -6px 6px -3px ${color}`;
}

/**
 * A colour's red, green, blue (0-255) and alpha (0-1), read by React Native's own parser, so
 * named colours, hsl() and every hex form work; null for what it can't read (PlatformColor).
 */
function channels(color: string): [number, number, number, number] | null {
  const value = processColor(color);
  if (typeof value !== 'number') return null;
  return [(value >>> 16) & 255, (value >>> 8) & 255, value & 255, ((value >>> 24) & 255) / 255];
}

/** `color` with its opacity multiplied by `factor`; colours it can't read are returned as they are. */
function fade(color: string, factor: number): string {
  const c = channels(color);
  if (!c) return color;
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.round(c[3] * factor * 1000) / 1000})`;
}

const styles = StyleSheet.create({
  raised: {
    borderRadius: HEIGHT / 2,
  },
  pill: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    // First icon centre 39 pt in (10 + SLOT / 2); the plus centre 38 pt from the right end.
    paddingStart: 10,
    paddingEnd: 13,
    maxWidth: '100%',
    // The icons sit 1.5 pt below the capsule's middle in the app.
    paddingTop: 3,
  },
  list: { alignItems: 'stretch' },
  // Full slots where they fit; with many tabs they share the screen's width.
  tab: { width: SLOT, flexShrink: 1, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
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
