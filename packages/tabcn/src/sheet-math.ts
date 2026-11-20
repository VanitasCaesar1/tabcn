/**
 * Sheet maths shared by the drag gestures ('tabcn/gestures') and their tests. Internal: not
 * exported from any entry point.
 */

/** Release speed (points per second) above which a flick moves to the next stop. */
const FLICK_VELOCITY = 800;
/** Points within which a sheet counts as resting at a stop. */
export const AT_STOP = 0.5;

/**
 * The stop a drag released at `position` with `velocity` (points per second, negative is up)
 * settles on: a flick moves to the next stop in its direction; otherwise the nearest stop.
 */
export function settleStop(stops: readonly number[], position: number, velocity: number): number {
  'worklet';
  if (stops.length === 0) return 0;
  if (Math.abs(velocity) > FLICK_VELOCITY) {
    if (velocity < 0) {
      for (let i = 0; i < stops.length; i++) {
        if ((stops[i] ?? 0) > position + AT_STOP) return i;
      }
      return stops.length - 1;
    }
    for (let i = stops.length - 1; i >= 0; i--) {
      if ((stops[i] ?? 0) < position - AT_STOP) return i;
    }
    return 0;
  }
  let best = 0;
  for (let i = 1; i < stops.length; i++) {
    if (Math.abs((stops[i] ?? 0) - position) < Math.abs((stops[best] ?? 0) - position)) best = i;
  }
  return best;
}
