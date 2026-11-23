/**
 * Icons for the Ambient Bar design: five tab glyphs for the demo (portfolio, markets, loop,
 * ask, profile), drawn by hand in a 24-unit box with a 2-unit round stroke. They work as any
 * screen's `tabBarIcon`; the focused one fills in.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

const STROKE = 2;

const line = {
  strokeWidth: STROKE,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A pie with one slice out: portfolio. */
export function PieIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 11 4 A 8 8 0 1 0 20 13 L 11 13 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        {...line}
      />
      <Path d="M 14 3.5 A 7 7 0 0 1 20.5 10 L 14 10 Z" stroke={color} fill={color} {...line} />
    </Svg>
  );
}

/** A rising line over a baseline: markets. */
export function TrendIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {focused ? (
        <Path d="M 3 19 L 3 15 L 9 10 L 13 13 L 21 6 L 21 19 Z" fill={color} opacity={0.35} />
      ) : null}
      <Path d="M 3 15 L 9 10 L 13 13 L 21 6" stroke={color} fill="none" {...line} />
      <Path d="M 3 19.5 H 21" stroke={color} fill="none" {...line} />
    </Svg>
  );
}

/** Two linked loops: recurring plans. */
export function LoopIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 12 12 C 10 8.5 8.6 7.5 6.8 7.5 C 4.6 7.5 3 9.6 3 12 C 3 14.4 4.6 16.5 6.8 16.5 C 8.6 16.5 10 15.5 12 12 C 14 8.5 15.4 7.5 17.2 7.5 C 19.4 7.5 21 9.6 21 12 C 21 14.4 19.4 16.5 17.2 16.5 C 15.4 16.5 14 15.5 12 12 Z"
        stroke={color}
        fill="none"
        {...line}
      />
    </Svg>
  );
}

/** A four-point spark: ask. */
export function SparkIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 12 3 C 12.8 8.4 15.6 11.2 21 12 C 15.6 12.8 12.8 15.6 12 21 C 11.2 15.6 8.4 12.8 3 12 C 8.4 11.2 11.2 8.4 12 3 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        {...line}
      />
    </Svg>
  );
}

/** Head and shoulders: profile. */
export function PersonIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={3.6} stroke={color} fill={focused ? color : 'none'} {...line} />
      <Path
        d="M 4.5 20 C 5.2 16.4 8.2 14.2 12 14.2 C 15.8 14.2 18.8 16.4 19.5 20 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        {...line}
      />
    </Svg>
  );
}
