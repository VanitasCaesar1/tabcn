/**
 * Icons for the Tile Plus design (Threads). Drawn in a 40-unit box (the bar's 24 pt icon
 * box) from shapes fitted to the app's App Store screenshots at 2.4 px per pt: each outline
 * was matched to the screenshot pixels, then written as clean arcs, lines and curves.
 * Inactive, they are outlines with a 2.5 pt stroke and round caps and joins. Active, they
 * are filled; each filled shape is exactly the outside edge of its outline, so the design
 * can crossfade the two with no edge jumping. Only the filled house appears in the
 * screenshots; the other filled shapes follow from it. Each icon switches on `focused`.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 2.5 pt in the 40-unit box drawn at 24 pt. */
const STROKE = 4.17;

/** A soft pentagon house with rounded corners and no door (22.2 x 22.5 pt). */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path
          d="M15.89 2.78A6.7 6.7 0 0 1 24.11 2.78L36.63 12.5A4.86 4.86 0 0 1 38.51 16.34L38.51 30.8A8.02 8.02 0 0 1 30.49 38.82L9.51 38.82A8.02 8.02 0 0 1 1.49 30.8L1.49 16.34A4.86 4.86 0 0 1 3.37 12.5Z"
          fill={color}
        />
      ) : (
        <Path
          d="M17.17 4.42A4.62 4.62 0 0 1 22.83 4.42L35.35 14.14A2.78 2.78 0 0 1 36.42 16.34L36.42 30.8A5.94 5.94 0 0 1 30.49 36.74L9.51 36.74A5.94 5.94 0 0 1 3.58 30.8L3.58 16.34A2.78 2.78 0 0 1 4.65 14.14Z"
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/**
 * A paper plane pointing right, seen from above: a rounded dart with a shallow notch at the
 * back and a crease from the notch to the tip (22 x 22.5 pt). Filled, it is a solid dart.
 */
export function MessagesIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d="M5.33 20L2.54 10.3A6.25 6.25 0 0 1 2.56 6.76L2.79 6.02A6.77 6.77 0 0 1 12.54 2.04L35.21 14.52A6.25 6.25 0 0 1 35.21 25.48L12.54 37.96A6.77 6.77 0 0 1 2.79 33.98L2.56 33.24A6.25 6.25 0 0 1 2.54 29.7Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M7.33 20.58A2.08 2.08 0 0 0 7.33 19.42L4.54 9.72A4.17 4.17 0 0 1 4.56 7.36L4.78 6.62A4.69 4.69 0 0 1 11.53 3.87L34.2 16.35A4.17 4.17 0 0 1 34.2 23.65L11.53 36.13A4.69 4.69 0 0 1 4.78 33.38L4.56 32.64A4.17 4.17 0 0 1 4.54 30.28ZM7.5 20L36.36 20"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A heart with round lobes and a soft point (22.9 x 21.3 pt). */
export function ActivityIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path
          d="M20 5.62A11.81 11.81 0 0 0 1.18 18.41C4.64 28.61 9.37 30.76 20 39.15C30.63 30.76 35.36 28.61 38.82 18.41A11.81 11.81 0 0 0 20 5.62Z"
          fill={color}
        />
      ) : (
        <Path
          d="M20 8.6A9.72 9.72 0 0 0 3.15 17.74C6.61 27.94 9.37 28.11 20 36.49C30.63 28.11 33.39 27.94 36.85 17.74A9.72 9.72 0 0 0 20 8.6Z"
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/**
 * A person: a ring for the head over an arched shoulder line with round ends
 * (21.7 x 22.5 pt). Filled, the head is a disc and the shoulders a dome with a flat base.
 */
export function ProfileIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d="M10.38 11.04A9.62 9.62 0 1 1 29.62 11.04A9.62 9.62 0 1 1 10.38 11.04ZM1.89 35.36A19.62 19.62 0 0 1 38.11 35.36A2.08 2.08 0 0 1 34.26 36.97L5.74 36.97A2.08 2.08 0 0 1 1.89 35.36Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M12.47 11.04A7.53 7.53 0 1 1 27.53 11.04A7.53 7.53 0 1 1 12.47 11.04ZM3.82 36.16A17.53 17.53 0 0 1 36.18 36.16"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
