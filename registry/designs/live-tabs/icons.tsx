/**
 * Icons for the Live Tabs design: four plain line glyphs drawn for it on one 24-unit grid,
 * with the same 2-unit stroke, round caps and round joins, so they read as one set at the
 * design's 22 pt icon size (a 1.8 pt line). Each, stroke included, stays inside units 3 to 21
 * on both axes, so they look the same size. Outline in every state: the bar marks the active
 * tab by colour. Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 2 units on the 24-unit grid. */
const STROKE = 2;

/** The shared stroke: round caps and joins, no fill. */
const line = {
  fill: 'none',
  strokeWidth: STROKE,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A house: a pitched roof over square walls, with a door in the middle. */
export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 10.5 L12 4 L20 10.5 V19 Q20 20 19 20 H5 Q4 20 4 19 Z" stroke={color} {...line} />
      <Path d="M10 20 V15 H14 V20" stroke={color} {...line} />
    </Svg>
  );
}

/** A stopwatch: a round face with one hand, a crown above it and a button at the top right. */
export function TimerIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={13} r={7} stroke={color} {...line} />
      <Path d="M12 13 V9.5" stroke={color} {...line} />
      <Path d="M10 4 H14" stroke={color} {...line} />
      <Path d="M17.5 6.5 L18.75 5.25" stroke={color} {...line} />
    </Svg>
  );
}

/** An arrow pointing down into an open tray. */
export function DownloadIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 4 V14.5" stroke={color} {...line} />
      <Path d="M7.5 10 L12 14.5 L16.5 10" stroke={color} {...line} />
      <Path
        d="M4.5 16.5 V19 Q4.5 20 5.5 20 H18.5 Q19.5 20 19.5 19 V16.5"
        stroke={color}
        {...line}
      />
    </Svg>
  );
}

/** A person: a round head over the curve of the shoulders. */
export function ProfileIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={3.75} stroke={color} {...line} />
      <Path d="M5 20 Q5 14 12 14 Q19 14 19 20" stroke={color} {...line} />
    </Svg>
  );
}
