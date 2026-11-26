/**
 * Reply Stack's compose button: X's round button at the bar's end. At full size it floats above
 * the pill's end; as the bar minimizes it drops into the circle's row and shrinks to the circle's
 * size, on the same motion as the bar. It gives way to the reply row (a post's page has no compose
 * button in X).
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { I18nManager, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ReplyStackColors } from './reply-stack';
import { PlusIcon, type ReplyIconProps } from './reply-stack-icons';

/** The compose button. */
export interface ComposeConfig {
  /** Runs when it is pressed: open your composer. */
  onPress?: () => void;
  /** Screen-reader label. Default "Post". */
  label?: string;
  /** Draws the glyph. Default: a plus. */
  icon?: (props: ReplyIconProps) => ReactNode;
}

export function ComposeButton({
  compose,
  enabled,
  shown,
  hidden,
  colors,
  haptics,
  pillHeight,
  circle,
}: {
  compose: ComposeConfig;
  /** False while the reply row stands in for it: it takes no touches and isn't read. */
  enabled: boolean;
  /** The bar's minimize motion, 0 (full) to 1 (minimized). */
  shown: SharedValue<number>;
  /** 1 while the reply row is shown (the button gives way to it), 0 otherwise. */
  hidden: SharedValue<number>;
  colors: ReplyStackColors;
  haptics: boolean;
  pillHeight: number;
  /** The minimized circle's size: the button shrinks to it. */
  circle: number;
}) {
  const press = useSharedValue(1);
  // Full: its bottom edge GAP above the pill. Minimized: centred on the circle's row (the circle
  // sits on the pill's bottom edge).
  const fullCenter = -(GAP + SIZE / 2);
  const minCenter = pillHeight - circle / 2;
  const motion = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [
      { translateY: shown.value * (minCenter - fullCenter) },
      { scale: interpolate(shown.value, [0, 1], [1, circle / SIZE]) * press.value },
    ],
  }));
  const label = compose.label ?? 'Post';
  const Icon = compose.icon ?? PlusIcon;
  return (
    <Animated.View
      style={[styles.button, AT_END, { top: fullCenter - SIZE / 2 }, motion]}
      pointerEvents={enabled ? 'box-none' : 'none'}
      aria-hidden={!enabled}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          press.value = withTiming(0.9, PRESS_DOWN);
          if (haptics) Haptics.selectionAsync();
        }}
        onPressOut={() => {
          press.value = withSpring(1, PRESS_UP);
        }}
        onPress={compose.onPress}
        style={[
          styles.disc,
          { backgroundColor: colors.compose, boxShadow: `0 4px 14px ${colors.shadow}` },
        ]}
      >
        <Icon color={colors.composeIcon} size={ICON} />
      </Pressable>
    </Animated.View>
  );
}

/** Measured from X's clip against the pill: 58 pt across (0.8 of the pill's height), its bottom
 * edge 17 pt above the pill, its end on the pill's end. */
const SIZE = 58;
const GAP = 17;
const ICON = 26;

const PRESS_DOWN = {
  duration: 100,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const PRESS_UP = { duration: 320, dampingRatio: 0.7, reduceMotion: ReduceMotion.System };

/**
 * The pill's end, the right or the left in a right-to-left layout, written with physical sides:
 * React Native reads `left` as the start edge in a right-to-left layout unless the app turned that
 * swap off (as the web does), and then `start` and `end` stay physical too.
 */
const AT_END = I18nManager.isRTL
  ? (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 }
  : { right: 0 };

const styles = StyleSheet.create({
  button: { position: 'absolute', width: SIZE, height: SIZE },
  disc: {
    flex: 1,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
