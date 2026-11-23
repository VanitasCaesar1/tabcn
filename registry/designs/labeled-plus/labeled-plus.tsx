/**
 * Labeled + Plus: the ElevenLabs tab bar, which is iOS 26's own floating tab bar. A
 * full-width glass pill holds the labelled tabs; a translucent grey capsule glides to the
 * active one, whose icon and label turn near-black while the others stay grey. Beside it
 * sits a round glass button with a thin grey plus that runs an action instead of switching
 * tabs. The pair spans the screen with 20 pt side margins and sits 21 pt above the bottom
 * edge of the screen, inside the home-indicator area, as the system bar does. Where there is
 * no home indicator (Android navigation bars), it keeps 8 pt clear of the system area.
 * The light greys of the inactive tabs and the plus are kept as the app has them (low
 * contrast).
 *
 * Motion: the capsule glides on tabcnSpring with no overshoot or stretch, and icons and labels
 * crossfade grey to near-black; nothing scales or lifts. The plus dims at once on touch and
 * fades back on release. Reduce motion makes all of it instant. The plus is marked with
 * `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS and on
 * the web, and a translucent light tint on Android (no blur there). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Platform, processColor, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The fill over the blur (older iOS), or the whole surface where there's no blur (Android). */
  background: 'rgba(250, 250, 250, 0.86)',
  /** Tint of the Liquid Glass (iOS 26+). */
  glassTint: 'rgba(255, 255, 255, 0.78)',
  /** Hairline edge of the blur and tint surfaces (Liquid Glass draws its own). */
  border: 'rgba(0, 0, 0, 0.07)',
  /** The 1 pt bright line along the top inside edge of the blur and tint surfaces. */
  sheen: 'rgba(255, 255, 255, 0.9)',
  /** The soft drop shadow under the pill and the plus button. */
  shadow: 'rgba(0, 0, 0, 0.08)',
  /** The capsule behind the active tab. */
  capsule: 'rgba(0, 0, 0, 0.065)',
  /** Active icon and label. */
  foreground: '#1a1a1a',
  /** Inactive icons and labels. */
  inactive: '#aaaaaa',
  /** The plus glyph. */
  action: '#b9b9b9',
  /** The dot drawn for a tab's badge. */
  badge: '#ff3b30',
};

export type LabeledPlusColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: translucent fill, no blur. */
export type LabeledPlusMaterial = 'auto' | 'glass' | 'blur' | 'tint';
type Surface = Exclude<LabeledPlusMaterial, 'auto'>;

export interface LabeledPlusProps {
  /** Runs when the plus button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus button. Default "Create". */
  actionLabel?: string;
  colors?: Partial<LabeledPlusColors>;
  /** Default `auto`: glass where available, blur on older iOS and the web, tint on Android. */
  material?: LabeledPlusMaterial;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on the app's App Store screenshot (iPhone at 402 pt, 2.21 px per pt): pill and
 * circle 62 pt tall, 8 pt apart, 20 pt from the screen sides and 21 pt above its bottom edge.
 * The capsule is 54 pt tall, 4 pt inside the pill, and 8 pt wider than its tab, so it reaches
 * 4 pt from the pill's end; tab centres sit 77 pt in from each end. Icons 22 pt with their
 * centre 23.5 pt below the pill top; 10 pt semibold labels with the baseline at 49 pt.
 * The plus is 16 x 2 pt.
 */
const BAR = 62;
const SIDE = 20;
const BOTTOM = 21;
const GAP = 8;
const ICON = 22;
const PLUS = 16;
/** Plus glyph opacity while held. */
const PRESSED_OPACITY = 0.6;
/** The badge fades on tabcnTiming's ease-out curve. */
const BADGE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

function resolveMaterial(material: LabeledPlusMaterial): Surface {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'android' ? 'tint' : 'blur';
}

export function LabeledPlus({
  onActionPress,
  actionLabel = 'Create',
  colors: custom,
  material = 'auto',
  haptics = true,
}: LabeledPlusProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets } = useTabBar();
  const shadow = { boxShadow: `0 4px 24px ${colors.shadow}` };
  const anchor = usePanelAnchor('action');
  // The plus dims at once on touch (as a UIButton highlight does) and fades back on release.
  const glyphOpacity = useSharedValue(1);
  const glyph = useAnimatedStyle(() => ({ opacity: glyphOpacity.value }));

  // The app's bar sits 21 pt above the screen edge, inside the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(BOTTOM, Platform.OS === 'ios' ? insets.bottom - 13 : insets.bottom + 8);

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot placement="floating" offset={bottom - insets.bottom} style={styles.row}>
      <View style={[styles.pill, shadow]}>
        <Glass surface={surface} colors={colors} />
        <TabList style={styles.list}>
          <TabIndicator
            inset={{ x: -4, y: 4 }}
            style={[styles.capsule, { backgroundColor: colors.capsule }]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
          ))}
        </TabList>
      </View>
      <PressableScale
        {...anchor}
        scale={1}
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={() => {
          glyphOpacity.value = PRESSED_OPACITY;
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          glyphOpacity.value = withTiming(1, tabcnTiming);
        }}
        style={[styles.action, shadow]}
      >
        <Glass surface={surface} colors={colors} />
        <Animated.View style={[styles.plus, glyph]}>
          <View style={[styles.plusBar, { backgroundColor: colors.action }]} />
          <View
            style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.action }]}
          />
        </Animated.View>
      </PressableScale>
    </TabBarRoot>
  );
}

/** The surface behind the pill and the plus button: fills its parent, clipped round. */
function Glass({ surface, colors }: { surface: Surface; colors: LabeledPlusColors }) {
  if (surface === 'glass') {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme="light"
        tintColor={colors.glassTint}
        style={[StyleSheet.absoluteFill, styles.round]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.round, styles.clip]}>
        {surface === 'blur' ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      </View>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.round,
          styles.rim,
          { borderColor: colors.border, boxShadow: `inset 0 1px 0 ${colors.sheen}` },
        ]}
      />
    </View>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: LabeledPlusColors;
  haptics: boolean;
}) {
  // Grey to near-black crossfade; nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The grey copy stays opaque under the near-black one until the last stretch (no dip in
  // ink), then drops out so the active glyph rests alone with no outline or fringe under it.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.foreground]),
  }));

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.foreground, size: ICON })}
        </Animated.View>
        {tab.badge != null ? (
          <Animated.View
            entering={FadeIn.duration(160).easing(BADGE_EASING)}
            exiting={FadeOut.duration(120).easing(BADGE_EASING)}
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: opaque(colors.background) },
            ]}
          />
        ) : null}
      </View>
      <Animated.Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
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

/** The bar's colour without its translucency, for the badge's ring (red would show through). */
function opaque(color: string): string {
  const c = channels(color);
  return c ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : color;
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    marginHorizontal: SIDE,
    gap: GAP,
  },
  pill: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
  },
  list: {
    flex: 1,
    paddingHorizontal: 8,
  },
  round: {
    borderRadius: BAR / 2,
  },
  clip: {
    overflow: 'hidden',
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  capsule: {
    borderRadius: 999,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 23.5 - ICON / 2,
    gap: 5.3,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  badge: {
    position: 'absolute',
    // Clear of the burst's top-right ray, with a ring in the bar's colour.
    top: -4,
    right: -6.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  action: {
    width: BAR,
    height: BAR,
    borderRadius: BAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    width: PLUS,
    height: PLUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: PLUS,
    height: 2,
    borderRadius: 1,
  },
  plusBarVertical: {
    transform: [{ rotate: '90deg' }],
  },
});
