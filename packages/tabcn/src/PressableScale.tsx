import type { ComponentProps, ComponentRef, ReactNode, Ref } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type AnimatedPressableProps = ComponentProps<typeof AnimatedPressable>;

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Scale while pressed. 1 turns press feedback off. Default 0.96. */
  scale?: number;
  /** Reanimated layout animation, e.g. `LinearTransition` when the button changes size. */
  layout?: AnimatedPressableProps['layout'];
  entering?: AnimatedPressableProps['entering'];
  exiting?: AnimatedPressableProps['exiting'];
  ref?: Ref<ComponentRef<typeof Pressable>>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
}

/** A pressable that dips slightly while pressed and eases back. Use it for action buttons. */
export function PressableScale({
  scale = 0.96,
  style,
  onPressIn,
  onPressOut,
  role = 'button',
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressed.value }] }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (scale !== 1) {
      pressed.value = withTiming(scale, {
        duration: 100,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
    }
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    if (scale !== 1) {
      // Eases back with no overshoot: no bounce.
      pressed.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.quad),
        reduceMotion: ReduceMotion.System,
      });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      role={role}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    />
  );
}
