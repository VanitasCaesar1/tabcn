/**
 * A pressable that dips as the finger lands (to 97% in 90 ms) and springs back as it lifts, on
 * the UI thread. For cards and posters; PanelUI's buttons bring their own press feedback.
 */
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function Press({
  children,
  style,
  contentStyle,
  scale = 0.97,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  /** The pressable's own layout (size, margins, flex). */
  style?: StyleProp<ViewStyle>;
  /** The content's layout (gap, padding, clipping); it is what dips. */
  contentStyle?: StyleProp<ViewStyle>;
  scale?: number;
}) {
  const s = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={style}
      onPressIn={(e) => {
        s.value = withTiming(scale, DOWN);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, UP);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[contentStyle, motion]}>{children}</Animated.View>
    </Pressable>
  );
}

const DOWN = { duration: 90, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
const UP = { stiffness: 320, damping: 22, mass: 1, reduceMotion: ReduceMotion.System };
