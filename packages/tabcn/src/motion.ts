import { Platform } from 'react-native';
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

/**
 * How far the foundation fades something it keeps mounted while hidden: the bar under the
 * keyboard or a covering panel, the tabs under an override, companions while a panel is open.
 * On iOS it stops just above UIKit's cutoff for a hidden view (0.01): a Liquid Glass view whose
 * effect changes while any view above it is below the cutoff (`glassEffectStyle` from 'none' to
 * 'regular') never draws its glass again, even after the fade back (iOS 26.5, 2026-11-27).
 * 1.1% can't be seen; what is hidden also sets `pointerEvents` and the screen-reader flags.
 */
export const HIDDEN_OPACITY = Platform.OS === 'ios' ? 0.011 : 0;
