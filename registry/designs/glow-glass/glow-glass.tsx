/**
 * Glow Glass: a dark glass pill with icons and labels. A warm glow sits behind
 * the active tab inside a glass capsule, and both slide together. A separate
 * round button with its own label runs an action; it is marked with
 * `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 *
 * Motion: the capsule and glow slide on tabcnSpring (no overshoot), icons and labels
 * crossfade in colour. Presses give haptics only, with no scale or lift.
 *
 * Tabs keep their measured 62 pt where the row fits; on a narrow screen (or with many tabs)
 * they narrow to fit, down to 40 pt. The glow is a radial gradient: `experimental_backgroundImage`
 * on iOS and Android, CSS `backgroundImage` on the web.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
  useTabIndicator,
} from 'react-native-tabcn';

const defaultColors = {
  /** The tint over the blur of the pill and the round button. */
  background: 'rgba(28, 30, 38, 0.72)',
  /** The 1 pt edge of the pill and the round button. */
  border: 'rgba(255, 255, 255, 0.14)',
  /** The glass capsule behind the active tab. */
  capsule: 'rgba(255, 255, 255, 0.13)',
  /** The warm glow behind the active icon: any hex or rgb()/rgba() colour. */
  glow: '#9c5d18',
  /** Active icon and label. */
  active: '#fff4df',
  /** Inactive labels. */
  inactive: '#8a8b91',
  /** Inactive icons, a shade darker than their labels. */
  inactiveIcon: '#76777c',
  /** Badge fill (the app shows none; iOS system red). */
  badge: '#ff453a',
  /** The count on a badge. */
  badgeText: '#ffffff',
};

export type GlowGlassColors = typeof defaultColors;

export interface GlowGlassProps {
  /** Runs when the round button is pressed. */
  onActionPress: () => void;
  /** Label under the round button's icon. Default "Spend". */
  actionLabel?: string;
  /**
   * Icon inside the round button, such as
   * `<SpendIcon focused={false} color="#76777c" size={21.5} />` from this design's icons.
   * Pass a function to get the colour (`inactiveIcon`) and size (21.5 pt) from the design, so
   * the icon follows `colors`: `({ color, size }) => <SpendIcon focused={false} color={color} size={size} />`.
   */
  actionIcon?: ReactNode | ((props: { color: string; size: number }) => ReactNode);
  colors?: Partial<GlowGlassColors>;
  /**
   * The blur's material under `background`: `dark` as in the app; `light` when `background` is
   * a light colour (a light theme). Default `dark`.
   */
  tint?: 'light' | 'dark';
  /** Selection haptic on tabs, a light impact on the round button. Default true. */
  haptics?: boolean;
}

export function GlowGlass({
  onActionPress,
  actionLabel = 'Spend',
  actionIcon,
  colors: custom,
  tint = 'dark',
  haptics = true,
}: GlowGlassProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const anchor = usePanelAnchor('action');
  // The measured 62 pt per tab where it fits; narrower where it doesn't, down to MIN_TAB only
  // as a last resort (the row may then run past the screen's edges).
  const room = window.width - insets.left - insets.right - EDGE * 2;
  const fixed = LIST_PADDING * 2 + BORDER * 2 + GAP + HEIGHT;
  const tabWidth = Math.max(MIN_TAB, Math.min(TAB, (room - fixed) / Math.max(1, tabs.length)));
  return (
    <TabBarRoot placement="floating" style={styles.row}>
      <View
        style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <BlurView intensity={30} tint={tint} style={StyleSheet.absoluteFill} />
        <TabList style={styles.list}>
          <Capsule colors={colors} />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} width={tabWidth} haptics={haptics} />
          ))}
        </TabList>
      </View>
      <PressableScale
        {...anchor}
        // No press scale: haptics are the only press feedback, as on the pill's tabs.
        scale={1}
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={
          haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
        }
        style={[styles.round, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        <BlurView intensity={30} tint={tint} style={[StyleSheet.absoluteFill, styles.roundBlur]} />
        {typeof actionIcon === 'function'
          ? actionIcon({ color: colors.inactiveIcon, size: ACTION_ICON })
          : actionIcon}
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, { color: colors.inactive }]}
        >
          {actionLabel}
        </Text>
      </PressableScale>
    </TabBarRoot>
  );
}

/** Glass capsule with a glow at the icon's position; follows the active tab. */
function Capsule({ colors }: { colors: GlowGlassColors }) {
  const { style } = useTabIndicator({ inset: { x: -4, y: 3.75 } });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.capsule, { backgroundColor: colors.capsule }, style]}
    >
      <View style={[styles.glow, glowImage(colors.glow)]} />
    </Animated.View>
  );
}

/**
 * The glow: a radial gradient of `color` fading out at its edge. The web takes it as CSS
 * `backgroundImage`; React Native as `experimental_backgroundImage`.
 */
function glowImage(color: string) {
  const image = `radial-gradient(circle closest-side, ${withAlpha(color, 230 / 255)} 0%, ${withAlpha(color, 196 / 255)} 58%, ${withAlpha(color, 92 / 255)} 74%, ${withAlpha(color, 0)} 100%)`;
  return Platform.OS === 'web'
    ? ({ backgroundImage: image } as object)
    : { experimental_backgroundImage: image };
}

/** `color` with its opacity multiplied by `alpha`. Hex and rgb()/rgba(); others unchanged. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color)?.[1];
  let rgb: number[];
  let own = 1;
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    rgb = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    if (full.length === 8) own = Number.parseInt(full.slice(6, 8), 16) / 255;
  } else {
    const parts = /^rgba?\(([^)]+)\)$/i
      .exec(color)?.[1]
      ?.split(/[\s,/]+/)
      .filter(Boolean);
    if (!parts || parts.length < 3 || parts.some((p) => p.endsWith('%'))) return color;
    rgb = parts.slice(0, 3).map(Number);
    if (parts[3] !== undefined) own = Number(parts[3]);
  }
  return `rgba(${rgb.join(', ')}, ${Math.round(own * alpha * 1000) / 1000})`;
}

function Tab({
  tab,
  colors,
  width,
  haptics,
}: {
  tab: TabItem;
  colors: GlowGlassColors;
  width: number;
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
      style={[styles.tab, { width }]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, dim]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactiveIcon, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, lit]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
}

/**
 * A badge on the icon's top right: a dot for an empty badge, a count otherwise. The tab's
 * accessibility label already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: GlowGlassColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  const fill = { backgroundColor: colors.badge };
  if (text === '') return <View pointerEvents="none" style={[styles.dot, fill]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, fill]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

const HEIGHT = 58.5;
/** Each tab's measured width, and the least it narrows to on a small screen. */
const TAB = 62;
const MIN_TAB = 40;
/** The gap between the pill and the round button. */
const GAP = 8.5;
/** The pill's inner padding at each end, and its border. */
const LIST_PADDING = 6.8;
const BORDER = 1;
/** Space kept from each screen edge when the row has to shrink. */
const EDGE = 16;
/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 20.3;
/** The round button's icon, as measured. */
const ACTION_ICON = 21.5;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  pill: { height: HEIGHT, borderRadius: 999, borderWidth: BORDER, overflow: 'hidden' },
  list: { flex: 1, alignItems: 'stretch', paddingHorizontal: LIST_PADDING },
  capsule: { borderRadius: 999, overflow: 'hidden', alignItems: 'center' },
  // Centred on the icon, not the capsule.
  glow: { marginTop: -10, width: 58, height: 58 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconBox: { width: ICON, height: ICON },
  center: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9.2, fontWeight: '400' },
  dot: { position: 'absolute', top: -2, right: -3, width: 7, height: 7, borderRadius: 3.5 },
  count: {
    position: 'absolute',
    top: -5,
    left: ICON - 7,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9.5, lineHeight: 12, fontWeight: '700', includeFontPadding: false },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    overflow: 'hidden',
  },
  roundBlur: { borderRadius: HEIGHT / 2 },
});
