import {
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/** Default spring for indicators. With "reduce motion" on, it finishes instantly. */
export const tabcnSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 280,
  mass: 1,
  reduceMotion: ReduceMotion.System,
};

/** Default timing for focus progress (label reveal, colour crossfade). */
export const tabcnTiming: WithTimingConfig = {
  duration: 220,
  reduceMotion: ReduceMotion.System,
};
