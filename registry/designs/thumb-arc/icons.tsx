/**
 * Icons for the Thumb Arc design: five tab glyphs for a maps app (explore, routes, saved,
 * guides, profile), drawn in a 24-unit box with a 2-unit round stroke. They work as any
 * screen's `tabBarIcon`; the focused one fills in.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

const line = {
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A compass: explore. */
export function CompassIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} fill="none" {...line} />
      <Path
        d="M 15.5 8.5 L 13.4 13.4 L 8.5 15.5 L 10.6 10.6 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        {...line}
      />
    </Svg>
  );
}

/** A winding route between two stops: routes. */
export function RouteIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 6 17.5 H 15.5 A 3.25 3.25 0 0 0 15.5 11 H 8.5 A 3.25 3.25 0 0 1 8.5 4.5 H 17"
        stroke={color}
        fill="none"
        {...line}
      />
      <Circle cx={5} cy={17.5} r={2.2} stroke={color} fill={focused ? color : 'none'} {...line} />
      <Circle cx={19} cy={4.5} r={2.2} stroke={color} fill={color} {...line} />
    </Svg>
  );
}

/** A bookmark: saved places. */
export function BookmarkIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 7 3.5 H 17 A 1.5 1.5 0 0 1 18.5 5 V 20.5 L 12 16 L 5.5 20.5 V 5 A 1.5 1.5 0 0 1 7 3.5 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        {...line}
      />
    </Svg>
  );
}

/** An open book: guides. */
export function GuideIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 12 6.5 C 9.5 4.8 6.5 4.5 3 5 V 18.5 C 6.5 18 9.5 18.3 12 20 C 14.5 18.3 17.5 18 21 18.5 V 5 C 17.5 4.5 14.5 4.8 12 6.5 Z"
        stroke={color}
        fill={focused ? color : 'none'}
        fillOpacity={0.3}
        {...line}
      />
      <Path d="M 12 6.5 V 20" stroke={color} fill="none" {...line} />
    </Svg>
  );
}

/** A person: profile. */
export function PersonIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} stroke={color} fill={focused ? color : 'none'} {...line} />
      <Path
        d="M 4.5 20.5 C 5.5 16.5 8.5 14.5 12 14.5 C 15.5 14.5 18.5 16.5 19.5 20.5"
        stroke={color}
        fill="none"
        {...line}
      />
    </Svg>
  );
}
