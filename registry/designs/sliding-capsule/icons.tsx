/**
 * Icons for the Sliding Capsule design: Wise's four tab glyphs, drawn as clean strokes
 * from the App Store screenshots (measured at 1.537 px/pt and checked against the crops
 * by overlay). They fill the design's 24 pt ICON box; the glyphs themselves are about
 * 19-21.5 pt across with a 2 pt stroke. Outline in every state, as in the app.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

/** 2 pt at the 24 pt ICON size. */
const STROKE = 3.3;

/** Outline house: a pentagon with rounded corners. */
export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 5.63 15.66 L 20 6.45 L 34.37 15.66 V 34.1 H 5.63 Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Outline card with a small chip at the top left and a notch in the right edge. */
export function CardIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 6 8.07 H 34 Q 36 8.07 36 10.07 V 17.83 C 36 20.53 33.3 20.8 33.3 23.25 C 33.3 25.7 36 25.98 36 28.68 V 30.47 Q 36 32.47 34 32.47 H 6 Q 4 32.47 4 30.47 V 10.07 Q 4 8.07 6 8.07 Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Rect x={9.4} y={12.95} width={5.45} height={3.6} rx={0.4} fill={color} />
    </Svg>
  );
}

/** @deprecated Renamed to `CardIcon` (the app's tab is "Card"). */
export const CardsIcon = CardIcon;

/** Two people: the one in front at the lower left, the other behind it at the upper right. */
export function RecipientsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={15.12} cy={17.83} r={7.05} fill="none" stroke={color} strokeWidth={STROKE} />
      <Path
        d="M 18.93 11.9 A 7.05 7.05 0 1 1 22.15 18.33 M 5.9 36 V 35.18 A 8.95 8.95 0 0 1 23.8 35.18 V 36 M 21.12 21.53 A 8.95 8.95 0 0 1 34.64 29.22 V 30.6"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
    </Svg>
  );
}

/** Two diagonal arrows: one up and to the right, one down and to the left. */
export function PaymentsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 6.99 21.08 L 23.8 3.73 M 12.41 3.73 H 23.8 V 14.04 M 33.01 18.92 L 16.2 36.27 M 27.59 36.27 H 16.2 V 25.96"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="miter"
      />
    </Svg>
  );
}
