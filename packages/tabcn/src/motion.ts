import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Default spring for indicators: close to critically damped, so the indicator glides
 * into place in about 350 ms and settles without a visible overshoot or wobble.
 * With "reduce motion" on, it finishes instantly.
 */
export const tabcnSpring: WithSpringConfig = {
  damping: 40,
  stiffness: 420,
  mass: 1,
  reduceMotion: ReduceMotion.System,
};

/** Default timing for focus progress (label reveal, colour crossfade): quick, ease-out. */
export const tabcnTiming: WithTimingConfig = {
  duration: 200,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.System,
};
