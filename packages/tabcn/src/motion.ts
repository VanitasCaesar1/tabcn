import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Default spring for indicators and panels: critically damped, so it glides into place in
 * about 350 ms. Overshoot is clamped too: a retarget mid-flight keeps the velocity already
 * heading for the new target, which would carry even a critically damped spring past it.
 * With "reduce motion" on, it finishes instantly.
 */
export const tabcnSpring: WithSpringConfig = {
  damping: 41,
  stiffness: 420,
  mass: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
};

/** Default timing for focus progress (label reveal, colour crossfade): quick, ease-out. */
export const tabcnTiming: WithTimingConfig = {
  duration: 200,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.System,
};
