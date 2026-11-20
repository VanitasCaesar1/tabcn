/**
 * Icons for the Light Icons design, drawn from the Amble app's tab bar (App Store
 * screenshot 3, about 1.65 px/pt). One unit is one point at the design's 40 pt
 * size, so each glyph draws at the app's size: route 25x30, search 29, record 36
 * (deliberately the largest), chat 27, person 22x27 pt.
 *
 * The route glyph is traced (from reference image 14, whose glyph shapes match the
 * app); the rest are simple geometric outlines drawn by hand from measurements, as
 * the photo is too soft to trace. Idle tabs get the outline; with `focused` the
 * chat bubble and person fill in and the search stroke gets heavier.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

/** Outline stroke in points (search, chat, person), measured about 2.4 to 2.6 pt. */
const STROKE = 2.4;

/**
 * Route: two interlocking hooks, a "?" over a reversed "c", drawn solid in both
 * states. The trace spans 28.7x33.3 units; the wider viewBox scales it to the
 * app's 26x30 pt.
 */
export function RouteIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="-2.2 -2.2 44.4 44.4">
      <Path
        d="M 15.2 3.4 c -0.6 0 -1.1 0.2 -1.4 0.3 -0.1 0 -0.3 0.1 -0.4 0.1 -0.1 0 -0.4 0.1 -0.6 0.2 -0.2 0.1 -0.4 0.2 -0.5 0.2 -0.1 0 -1 0.5 -1.1 0.6 -0.1 0.1 -0.2 0.1 -0.3 0.2 -0.1 0.1 -0.3 0.2 -0.4 0.3 -0.1 0.1 -0.3 0.2 -0.5 0.3 -0.5 0.4 -2 2 -2.3 2.5 0 0.1 -0.1 0.2 -0.2 0.3 -0.1 0.1 -0.1 0.2 -0.2 0.3 0 0.1 -0.1 0.3 -0.2 0.4 -0.1 0.1 -0.2 0.4 -0.3 0.5 0 0.1 -0.1 0.3 -0.2 0.4 -0.1 0.1 -0.2 0.3 -0.2 0.5 0 0.1 -0.1 0.3 -0.2 0.4 -0.1 0.1 -0.1 0.3 -0.1 0.5 0 0.2 -0.1 0.6 -0.2 1 -0.1 0.8 -0.2 2.2 -0.1 2.7 0 0.1 0.1 0.6 0.2 1 0.1 0.5 0.1 0.8 0.2 0.9 0.1 0.1 0.1 0.3 0.2 0.5 0 0.2 0.1 0.5 0.2 0.6 0.1 0.2 0.2 0.3 0.2 0.4 0.1 0.2 0.4 0.8 0.7 1.2 0.1 0.2 0.3 0.4 0.4 0.5 0.4 0.5 0.7 0.9 1.4 1.4 0.9 0.8 1 0.9 1.1 0.9 0.1 0 0.2 0.1 0.3 0.2 0.1 0.1 0.2 0.2 0.2 0.2 0 0 0.1 0.1 0.2 0.2 0.1 0.1 0.1 0.2 0.2 0.2 0 0 0.2 0.1 0.5 0.2 0.9 0.5 2.2 0.4 3.1 -0.1 0.8 -0.4 1.4 -1 1.9 -2 0.3 -0.6 0.3 -0.8 0.3 -2 0 -0.7 0 -0.7 -0.2 -1.2 -0.2 -0.5 -0.6 -1.1 -0.9 -1.2 -0.1 0 -0.1 -0.1 -0.2 -0.1 0 -0.1 -0.6 -0.4 -1.2 -0.8 -0.6 -0.3 -1 -0.7 -1.1 -1 -0.1 -0.2 -0.2 -0.4 -0.3 -0.4 -0.2 -0.4 -0.3 -1.5 -0.2 -2.2 0.2 -0.8 0.8 -1.7 1.4 -1.8 0.1 0 0.3 -0.1 0.4 -0.2 0.5 -0.4 2.6 -0.3 3.2 0 0.1 0.1 0.3 0.2 0.4 0.2 0.1 0 0.2 0.1 0.3 0.2 0.1 0.1 0.2 0.2 0.4 0.3 0.2 0.2 1 1.2 1.2 1.6 0.1 0.2 0.2 0.4 0.2 0.4 0.1 0.1 0.1 0.3 0.2 0.5 0.1 0.2 0.2 0.5 0.2 0.6 0.1 0.1 0.1 0.4 0.2 0.7 0 0.2 0.1 0.6 0.1 0.8 0.1 0.6 -0.1 2.3 -0.4 2.9 -0.1 0.1 -0.1 0.3 -0.1 0.3 0 0 -0.1 0.2 -0.1 0.3 -0.1 0.1 -0.2 0.3 -0.2 0.4 -0.1 0.2 -0.5 1 -0.8 1.5 -0.1 0.2 -0.3 0.4 -0.3 0.6 -0.1 0.2 -0.2 0.4 -0.3 0.5 -0.1 0.1 -0.2 0.2 -0.2 0.3 0 0 -0.1 0.2 -0.2 0.4 -0.1 0.2 -0.2 0.4 -0.2 0.5 0 0.1 -0.1 0.3 -0.2 0.5 -0.2 0.4 -0.3 1.2 -0.3 1.9 0 0.7 0 0.7 0.1 0.7 0.2 0 0.4 -0.1 0.7 -0.4 0.1 -0.1 0.3 -0.3 0.5 -0.4 0.2 -0.1 0.4 -0.3 0.5 -0.4 0.1 -0.1 0.3 -0.3 0.4 -0.3 0.1 -0.1 0.2 -0.1 0.2 -0.2 0 0 0.2 -0.2 0.4 -0.3 0.2 -0.2 0.4 -0.3 0.5 -0.4 0 0 0.2 -0.2 0.4 -0.4 0.3 -0.3 0.7 -0.5 2 -1.6 0.1 -0.1 0.3 -0.3 0.4 -0.3 0.1 0 0.2 -0.2 0.3 -0.2 0.1 -0.1 0.2 -0.2 0.4 -0.3 0.1 -0.1 0.4 -0.3 0.7 -0.6 0.3 -0.2 0.6 -0.5 0.7 -0.5 0.2 -0.1 0.4 -0.4 0.4 -0.7 0.4 -1.5 0.4 -1.7 0.4 -3 0 -1.1 0 -1.3 -0.1 -1.8 -0.1 -0.3 -0.2 -0.8 -0.2 -1.1 -0.1 -0.3 -0.2 -0.6 -0.2 -0.8 -0.1 -0.1 -0.1 -0.4 -0.2 -0.6 0 -0.2 -0.2 -0.6 -0.3 -0.8 -0.1 -0.2 -0.2 -0.4 -0.2 -0.5 0 -0.1 -0.1 -0.2 -0.2 -0.3 -0.1 -0.1 -0.2 -0.3 -0.2 -0.4 -0.1 -0.2 -0.1 -0.4 -0.6 -1.1 -0.1 -0.1 -0.2 -0.4 -0.3 -0.5 -0.3 -0.7 -1.8 -2.4 -2.5 -2.8 -0.1 -0.1 -0.3 -0.2 -0.4 -0.3 -0.3 -0.3 -0.5 -0.4 -0.7 -0.5 -0.1 0 -0.3 -0.1 -0.4 -0.2 -0.1 -0.1 -0.3 -0.2 -0.4 -0.2 -0.1 0 -0.3 -0.1 -0.5 -0.2 -0.2 -0.1 -0.4 -0.2 -0.6 -0.2 -0.1 0 -0.3 -0.1 -0.4 -0.1 -0.5 -0.2 -2.4 -0.4 -3.7 -0.3ZM 28.6 21.7 c -0.7 0.3 -1 0.9 -1 1.6 0 0.6 0.2 0.9 0.8 1.5 0.2 0.2 0.5 0.5 0.6 0.7 0.1 0.1 0.3 0.4 0.4 0.5 0.1 0.1 0.2 0.3 0.2 0.3 0 0 0.1 0.2 0.2 0.3 0.1 0.1 0.2 0.5 0.3 0.7 0.1 0.3 0.2 0.6 0.2 0.7 0.1 0.1 0.1 0.5 0.1 1 0 0.8 0 0.9 -0.1 1.2 -0.1 0.2 -0.2 0.4 -0.2 0.6 -0.1 0.3 -0.5 0.9 -0.8 1.1 -0.2 0.2 -0.7 0.3 -0.9 0.3 -0.2 0 -1 -0.4 -1.4 -0.6 -0.7 -0.4 -2.3 -2.1 -2.5 -2.6 0 -0.1 -0.1 -0.2 -0.2 -0.3 -0.1 -0.1 -0.2 -0.2 -0.2 -0.3 0 0 0 -0.1 -0.1 -0.2 -0.3 -0.3 -0.8 -1.4 -0.8 -1.9 -0.1 -0.4 -0.3 -0.4 -0.8 -0.1 -0.2 0.2 -0.7 0.6 -1.4 1.1 -0.2 0.1 -0.4 0.3 -0.6 0.5 -0.1 0.1 -0.4 0.3 -0.6 0.5 -0.7 0.6 -0.9 0.7 -0.9 1 0 0.1 0.1 0.3 0.2 0.4 0.1 0.1 0.2 0.3 0.2 0.4 0 0.1 0.2 0.3 0.3 0.5 0.1 0.1 0.3 0.4 0.4 0.5 0.8 1.1 2.7 3.1 3.5 3.7 0.1 0.1 0.3 0.3 0.5 0.4 0.1 0.1 0.3 0.2 0.5 0.3 0.1 0.1 0.3 0.1 0.3 0.2 0 0.1 1.1 0.6 1.5 0.7 0.2 0.1 0.4 0.2 0.6 0.2 0.2 0.1 0.3 0.1 1.3 0.1 1.1 0 1.1 0 1.9 -0.3 1.4 -0.5 2.6 -1.5 3.2 -2.7 0.1 -0.1 0.2 -0.4 0.3 -0.5 0.1 -0.1 0.2 -0.3 0.2 -0.5 0 -0.2 0.1 -0.3 0.2 -0.4 0.2 -0.3 0.5 -2.2 0.4 -3.1 -0.1 -0.8 -0.3 -2.1 -0.4 -2.4 -0.1 -0.1 -0.1 -0.4 -0.2 -0.5 -0.1 -0.5 -0.9 -2 -1.4 -2.6 -0.7 -0.9 -1.6 -1.7 -2.1 -2 -0.4 -0.2 -1 -0.2 -1.4 -0.1Z"
        fill={color}
      />
    </Svg>
  );
}

/** @deprecated Renamed to `RouteIcon`, the glyph's meaning in the app. */
export const HookIcon = RouteIcon;

/**
 * Search: a 25.5 pt ring with a round-capped handle at 45 degrees; 29 pt overall.
 * The active glyph keeps the same outer size with a heavier stroke.
 */
export function SearchIcon({ color, size, focused }: TabIconProps) {
  const stroke = focused ? 3.2 : 2.6;
  const r = (25.5 - stroke) / 2;
  const handle = 18 + r * Math.SQRT1_2;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18} cy={18} r={r} stroke={color} strokeWidth={stroke} fill="none" />
      <Path
        d={`M ${handle} ${handle} L 33.4 33.4`}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Record: a 36 pt ring (3.4 pt stroke) around a solid 16 pt dot, the same in both
 * states. In the app the idle record glyph is dimmer than the other idle icons
 * (about #808080 against #a6a6a6), so it draws at 80% opacity when idle.
 */
export function RecordIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G opacity={focused ? 1 : 0.8}>
        <Circle cx={20} cy={20} r={16.3} stroke={color} strokeWidth={3.4} fill="none" />
        <Circle cx={20} cy={20} r={8} fill={color} />
      </G>
    </Svg>
  );
}

/**
 * Chat: a round 27 pt speech bubble whose bottom-left quarter ends in a pointed
 * tail at the corner. Outline when idle, filled when active.
 */
export function BubbleIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 17.86 32.11 A 12.3 12.3 0 1 0 8.44 24.21 L 7.6 32.4 Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={focused ? color : 'none'}
      />
    </Svg>
  );
}

/**
 * Profile: a 13 pt head over a 22 pt wide dome for the shoulders (6 pt top
 * corners, flat base); 27 pt tall. Outline when idle, filled when active.
 */
export function PersonIcon({ color, size, focused }: TabIconProps) {
  const fill = focused ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={12.9} r={5.3} stroke={color} strokeWidth={STROKE} fill={fill} />
      <Path
        d="M 11.85 32.4 H 28.15 A 1.5 1.5 0 0 0 29.65 30.9 V 28.6 A 6 6 0 0 0 23.65 22.6 H 16.35 A 6 6 0 0 0 10.35 28.6 V 30.9 A 1.5 1.5 0 0 0 11.85 32.4 Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={fill}
      />
    </Svg>
  );
}
