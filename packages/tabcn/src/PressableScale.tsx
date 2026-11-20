import type { ComponentProps, ComponentRef, ReactNode, Ref } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type AnimatedPressableProps = ComponentProps<typeof AnimatedPressable>;

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Scale while pressed. 1 turns press feedback off. Default 0.94. */
  scale?: number;
  /** Reanimated layout animation, e.g. `LinearTransition` when the button changes size. */
  layout?: AnimatedPressableProps['layout'];
  entering?: AnimatedPressableProps['entering'];
  exiting?: AnimatedPressableProps['exiting'];
  ref?: Ref<ComponentRef<typeof Pressable>>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
}

/** A pressable that shrinks slightly while pressed. Use it for action buttons. */
export function PressableScale({
  scale = 0.94,
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
      pressed.value = withTiming(scale, { duration: 90, reduceMotion: ReduceMotion.System });
    }
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    if (scale !== 1) {
      pressed.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
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
