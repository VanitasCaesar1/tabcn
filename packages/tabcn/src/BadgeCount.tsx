/**
 * A numeric badge whose digits roll when the number changes.
 * Spec: docs/designs/motion-and-rail.md.
 */
import { useEffect, useRef, useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const roll = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};

/**
 * Renders `value`; above `max` (default 99) it shows `max+`. When the value changes, each
 * changed digit slides out vertically and the new one slides in (up when the number grows,
 * down when it shrinks), 180 ms ease-out with no overshoot. It clips its own height, so the
 * layout doesn't jump. With "reduce motion" on, digits swap instantly.
 *
 * It is hidden from screen readers: inside a `TabButton` it would be a separate stop
 * (Android) or never read (iOS). `TabButton`'s default label includes the tab's `badge`, so
 * render the tab's own `tab.badge` here, or give the button an `accessibilityLabel`.
 */
export function BadgeCount({
  value,
  max = 99,
  style,
  textStyle,
}: {
  value: number;
  max?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const over = value > max;
  const text = String(over ? max : value);
  // Direction of the latest change: 1 when the number grew, -1 when it shrank.
  const [change, setChange] = useState({ value, direction: 1 });
  if (change.value !== value) {
    setChange({ value, direction: value > change.value ? 1 : -1 });
  }
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  // Slots are counted from the right, so the ones digit keeps its slot when the count grows.
  // The `+` of `max+` sits outside the slots: it is not a digit and never rolls.
  const slots = text.split('').map((char, i) => ({ char, slot: text.length - 1 - i }));
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {slots.map(({ char, slot }) => (
        <Digit
          key={slot}
          char={char}
          direction={change.direction}
          enter={mounted.current}
          textStyle={textStyle}
        />
      ))}
      {over ? (
        <Text maxFontSizeMultiplier={BADGE_TEXT_MAX} style={[styles.digit, textStyle]}>
          +
        </Text>
      ) : null}
    </View>
  );
}

function Digit({
  char,
  direction,
  enter,
  textStyle,
}: {
  char: string;
  direction: number;
  /** True when the slot appears after the badge mounted: the digit rolls in. */
  enter: boolean;
  textStyle?: StyleProp<TextStyle>;
}) {
  const [shown, setShown] = useState<{ char: string; previous: string | null; direction: number }>(
    () => ({ char, previous: enter ? '' : null, direction }),
  );
  if (shown.char !== char) setShown({ char, previous: shown.char, direction });
  const [height, setHeight] = useState(0);
  const measured = height > 0;
  const progress = useSharedValue(shown.previous === null ? 1 : 0);

  // The roll starts once the slot is measured: before that the incoming digit has no
  // distance to travel and would show in place first.
  useEffect(() => {
    if (shown.previous === null || !measured) return;
    const clear = () => setShown((s) => ({ ...s, previous: null }));
    progress.value = 0;
    progress.value = withTiming(1, roll, (finished) => {
      'worklet';
      if (finished) runOnJS(clear)();
    });
  }, [shown, measured, progress]);

  const dir = shown.direction;
  const incoming = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * dir * height }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * dir * height }],
  }));

  return (
    <View style={styles.slot} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <Animated.Text
        maxFontSizeMultiplier={BADGE_TEXT_MAX}
        style={[
          styles.digit,
          textStyle,
          incoming,
          !measured && shown.previous !== null ? styles.unmeasured : null,
        ]}
      >
        {shown.char}
      </Animated.Text>
      {shown.previous ? (
        <>
          {/* Holds the slot at the wider of the two digits, so neither is clipped. */}
          <Text
            maxFontSizeMultiplier={BADGE_TEXT_MAX}
            style={[styles.digit, textStyle, styles.spacer]}
          >
            {shown.previous}
          </Text>
          <Animated.Text
            maxFontSizeMultiplier={BADGE_TEXT_MAX}
            style={[styles.digit, styles.previous, textStyle, outgoing]}
          >
            {shown.previous}
          </Animated.Text>
        </>
      ) : null}
    </View>
  );
}

/**
 * Badges are a fixed height in every design, so their digits stop growing with the system text
 * size at 1.3x, as the designs' labels do; larger, they would be clipped.
 */
const BADGE_TEXT_MAX = 1.3;

const styles = StyleSheet.create({
  slot: { overflow: 'hidden', alignItems: 'center' },
  digit: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  previous: { position: 'absolute', top: 0, left: 0, right: 0 },
  spacer: { height: 0, opacity: 0 },
  unmeasured: { opacity: 0 },
});
