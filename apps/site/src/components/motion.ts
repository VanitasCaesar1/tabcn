// Timings for the site's moving parts, in milliseconds. The site moves the way the bars do:
// these follow the library's own motion in packages/tabcn/src/motion.ts. The curves themselves
// live in globals.css as --tabcn-spring and --tabcn-timing.

/** tabcnSpring (stiffness 420, damping 41: critically damped) settles in about 400 ms. */
export const SPRING_MS = 400;

/** tabcnTiming: 200 ms on bezier(0.25, 0.1, 0.25, 1), for crossfades and colour changes. */
export const TIMING_MS = 200;

/** A cut: the gallery's results fade out over CUT_OUT_MS, swap while hidden, and fade back in. */
export const CUT_OUT_MS = 120;
export const CUT_IN_MS = 200;

/** tabcnTiming as a curve for Motion (motion/react), which takes the four bezier numbers. */
export const TIMING_EASE = [0.25, 0.1, 0.25, 1] as const;
