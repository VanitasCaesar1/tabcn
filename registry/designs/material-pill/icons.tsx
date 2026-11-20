/**
 * Icons for the Material Pill design (Google Home's navigation bar). Drawn by hand in a
 * 40-unit box (the bar's 24 pt icon box) to the glyphs measured on the app's Play Store
 * screenshots at 4x: outlined with a 2 pt stroke when inactive, filled when active, as
 * Material Symbols Rounded are. Each icon switches on `focused`; the design crossfades the two.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

/** 2 pt in the 40-unit box drawn at 24 pt. */
const STROKE = 3.33;

/**
 * House with a pitched roof and a door (16.5 x 17.6 pt). Outlined, the stroke runs up round
 * the door; filled, the door is a square-topped notch a third of the house wide.
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  const d = focused
    ? 'M14.6 32.9V24.4a2.7 2.7 0 0 1 2.7-2.7h5.4a2.7 2.7 0 0 1 2.7 2.7v8.5h6.5V15.5L20 6.9L8.1 15.5v17.4z'
    : 'M16.8 32.9V25.6a1.4 1.4 0 0 1 1.4-1.4h3.6a1.4 1.4 0 0 1 1.4 1.4v7.3h8.7V15.5L20 6.9L8.1 15.5v17.4z';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={d}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Two stacked rounded bars, Activity's "view agenda" glyph (17.6 x 17.6 pt). */
export function ActivityIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect x={5.4} y={5.4} width={29.2} height={13.15} rx={3} fill={color} />
        <Rect x={5.4} y={21.45} width={29.2} height={13.15} rx={3} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {[5.4, 21.45].map((y) => (
        <Rect
          key={y}
          x={5.4 + STROKE / 2}
          y={y + STROKE / 2}
          width={29.2 - STROKE}
          height={13.15 - STROKE}
          rx={1.4}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
        />
      ))}
    </Svg>
  );
}

/**
 * Two dots at the top-left and bottom-right joined by an S-shaped stroke, the "automation"
 * glyph (19.9 x 17.6 pt). Rings when inactive, solid dots when active. The path is point
 * symmetric about the box centre.
 */
export function AutomationsIcon({ color, size, focused }: TabIconProps) {
  const link =
    'M9.92 16.25C8.4 18.8 5.3 21.5 5.3 24A4 4 0 0 0 11.92 27.02L28.08 12.98A4 4 0 0 1 34.7 16C34.7 18.5 31.6 21.2 30.08 23.75';
  const ring = focused
    ? { r: 6.5, fill: color }
    : { r: 6.5 - STROKE / 2, fill: 'none', stroke: color, strokeWidth: STROKE };
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={link}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={11.95} cy={11.9} {...ring} />
      <Circle cx={28.05} cy={28.1} {...ring} />
    </Svg>
  );
}
