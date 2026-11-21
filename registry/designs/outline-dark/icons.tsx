/**
 * Icons for the Outline Dark design, drawn from the Blank Spaces app's tab bar
 * (App Store iPad screenshots, 1.578 px/pt). The glyphs are SF Symbols-style:
 * an outline version for idle tabs and a filled one for the active tab, picked
 * by `focused`. They're drawn by hand from measurements: the screenshots are
 * too soft and noisy to trace. One unit is 0.6 pt at the design's 24 pt size.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Stroke width in units: 1.5 pt at 24 pt, as measured. */
const STROKE = 2.5;

/**
 * Apps: a 2x2 grid of rounded squares (SF `square.grid.2x2`). Measured: 18 pt
 * between the outer stroke centres, 7.3 pt squares, 3.8 pt pitch gap.
 */
export function AppsIcon({ color, size, focused }: TabIconProps) {
  const cells = [
    [5, 5],
    [23, 5],
    [5, 23],
    [23, 23],
  ] as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {cells.map(([x, y]) =>
        focused ? (
          <Rect
            key={`${x}-${y}`}
            x={x - STROKE / 2}
            y={y - STROKE / 2}
            width={12 + STROKE}
            height={12 + STROKE}
            rx={4.6}
            fill={color}
          />
        ) : (
          <Rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={12}
            height={12}
            rx={3.4}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
          />
        ),
      )}
    </Svg>
  );
}

/** Shackle: legs 8.2 pt apart (centre lines), arched top, running into the body. */
const SHACKLE = 'M 13.2 17.5 V 10.6 A 6.8 6.8 0 0 1 26.8 10.6 V 17.5';

/**
 * Lock: a padlock (SF `lock` / `lock.fill`). Measured on the active tab:
 * 14.6 x 21 pt overall, a 12.7 pt tall body, solid white when active.
 */
export function LockIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d={SHACKLE} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      {focused ? (
        <Rect x={7.85} y={16.3} width={24.3} height={21.2} rx={3.6} fill={color} />
      ) : (
        <Rect
          x={7.85 + STROKE / 2}
          y={16.3 + STROKE / 2}
          width={24.3 - STROKE}
          height={21.2 - STROKE}
          rx={2.6}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
        />
      )}
    </Svg>
  );
}

/**
 * Stats: three rising bars (SF `chart.bar`). Not in the Blank Spaces app's
 * bar; kept, in the same style, for apps that need a fourth tab.
 */
export function StatsIcon({ color, size, focused }: TabIconProps) {
  const bars = [
    [4, 22],
    [15.75, 13],
    [27.5, 4],
  ] as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {bars.map(([x, top]) =>
        focused ? (
          <Rect key={x} x={x} y={top} width={8.5} height={36 - top} rx={2.4} fill={color} />
        ) : (
          <Rect
            key={x}
            x={x + STROKE / 2}
            y={top + STROKE / 2}
            width={8.5 - STROKE}
            height={36 - top - STROKE}
            rx={1.6}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
          />
        ),
      )}
    </Svg>
  );
}

/** Head and shoulders, centred in the ring; the shoulders stop short of it. */
const HEAD = 'M 15.3 14.7 A 4.7 4.7 0 1 0 24.7 14.7 A 4.7 4.7 0 1 0 15.3 14.7 Z';
const SHOULDERS =
  'M 10.6 28.2 C 10.6 23.8 14.6 21 20 21 C 25.4 21 29.4 23.8 29.4 28.2 Q 29.4 29.6 28 29.6 H 12 Q 10.6 29.6 10.6 28.2 Z';
const DISC = 'M 2 20 A 18 18 0 1 0 38 20 A 18 18 0 1 0 2 20 Z';

/**
 * Profile: a person in a circle (SF `person.circle`). Measured: a 20 pt ring
 * (stroke centre line), a 5.7 pt head, 11 pt wide shoulders that end 4 pt
 * above the ring. Active: a solid disc with the person cut out.
 */
export function PersonIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path d={`${DISC} ${HEAD} ${SHOULDERS}`} fill={color} fillRule="evenodd" />
      ) : (
        <>
          <Circle cx={20} cy={20} r={16.7} fill="none" stroke={color} strokeWidth={STROKE} />
          <Path d={`${HEAD} ${SHOULDERS}`} fill={color} />
        </>
      )}
    </Svg>
  );
}
