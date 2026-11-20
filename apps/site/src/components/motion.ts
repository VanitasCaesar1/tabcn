// Timings for the home page's moving parts, in milliseconds. The site moves the way the bars do:
// these follow the library's own motion in packages/tabcn/src/motion.ts. The curves themselves
// live in globals.css as --tabcn-spring and --tabcn-timing.

/** tabcnSpring (stiffness 420, damping 41: critically damped) settles in about 400 ms. */
export const SPRING_MS = 400;

/** tabcnTiming: 200 ms on bezier(0.25, 0.1, 0.25, 1), for crossfades and colour changes. */
export const TIMING_MS = 200;

/** The board's first step comes this long after the hero is first on screen. */
export const BOARD_FIRST_MS = 2400;

/** Then one step every this long. */
export const BOARD_DWELL_MS = 4500;

/** On automatic steps, each row starts this much after the one above it. */
export const ROW_STAGGER_MS = 90;

/** A jump to another group slides when it's this many bars or fewer away. */
export const JUMP_SLIDE_MAX = 2;

/**
 * A longer jump is a cut instead: the rows fade out over CUT_OUT_MS, move while hidden, and fade
 * back in over CUT_IN_MS. A long slide would run past the edge of the drawn slots and show bare
 * track.
 */
export const CUT_OUT_MS = 120;
export const CUT_IN_MS = 200;

/** A second press inside this long is ignored, so a step or jump always finishes. */
export const PRESS_LOCK_MS = 400;

/** tabcnTiming as a curve for Motion (motion/react), which takes the four bezier numbers. */
export const TIMING_EASE = [0.25, 0.1, 0.25, 1] as const;
