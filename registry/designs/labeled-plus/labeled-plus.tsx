/**
 * Labeled + Plus: the ElevenLabs tab bar, which is iOS 26's own floating tab bar. A
 * full-width glass pill holds the labelled tabs; a translucent grey capsule glides to the
 * active one, whose icon and label turn near-black while the others stay grey. Beside it
 * sits a round glass button with a thin grey plus that runs an action instead of switching
 * tabs. The pair spans the screen with 20 pt side margins and sits 21 pt above the bottom
 * edge of the screen, inside the home-indicator area, as the system bar does.
 *
 * The glass is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS, and a
 * translucent light tint on Android (no blur there). Force one with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';
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
  /** The fill over the blur (older iOS), or the whole surface where there's no blur (Android). */
  background: 'rgba(250, 250, 250, 0.86)',
  /** Tint of the Liquid Glass (iOS 26+). */
  glassTint: 'rgba(255, 255, 255, 0.78)',
  /** Hairline edge of the blur and tint surfaces (Liquid Glass draws its own). */
  border: 'rgba(0, 0, 0, 0.07)',
  shadow: 'rgba(0, 0, 0, 0.08)',
  capsule: 'rgba(0, 0, 0, 0.065)',
  /** Active icon and label. */
  foreground: '#1a1a1a',
  /** Inactive icons and labels. */
  inactive: '#aaaaaa',
  /** The plus glyph. */
  action: '#b9b9b9',
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
  /** Default `auto`: glass where available, blur on older iOS, tint on Android. */
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

function resolveMaterial(material: LabeledPlusMaterial): Surface {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'ios' ? 'blur' : 'tint';
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

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot placement="floating" offset={BOTTOM - insets.bottom} style={styles.row}>
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
        scale={1}
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={
          haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
        }
        style={[styles.action, shadow]}
      >
        {({ pressed }) => (
          <>
            <Glass surface={surface} colors={colors} />
            <View style={[styles.plus, pressed && styles.pressed]}>
              <View style={[styles.plusBar, { backgroundColor: colors.action }]} />
              <View
                style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.action }]}
              />
            </View>
          </>
        )}
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
        style={[StyleSheet.absoluteFill, styles.round, styles.rim, { borderColor: colors.border }]}
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
        {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.foreground, size: ICON })}
        </Animated.View>
        {tab.badge != null ? (
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(120)}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          />
        ) : null}
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, label]}>
        {tab.label}
      </Animated.Text>
    </TabButton>
  );
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
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
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
    top: -1,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
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
  pressed: {
    opacity: 0.6,
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
