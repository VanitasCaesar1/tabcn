/**
 * Icons for the Colour Flood design, after Cash App's tab glyphs: Money (a bank), Card,
 * Pay ($), Discover (a magnifier) and Activity (a clock). Heavy strokes about 3.1 pt thick
 * with flat ends, drawn on a 40-unit grid at 0.75 pt per unit, so pass `size` 30 (the
 * design's `ICON`) for the app's 24-25 pt glyphs. The glyph is the same in both states;
 * only the colour changes. Pass them as `tabBarIcon` in your screen options.
 *
 * Money, Pay and Activity are measured on the flat App Store mockup (2.41 px/pt): the bank
 * is 24.9 x 21.2 pt, the clock ring 24.1 pt across, the $ 15.8 x 23.2 pt. Card and Discover
 * only appear in the older five-tab screenshots (3D renders), so they are drawn to the same
 * stroke and scale from those. The $ is a plain upright dollar sign of the same size and
 * weight, not Cash App's slanted logo glyph.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Stroke weight of the whole set: 3.1 pt. */
const STROKE = 4.17;

/** Money: an open chevron roof (bevelled at the peak, flat ends) over three columns. */
export function MoneyIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M4.18 16.74L20 8.16L35.82 16.74"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="bevel"
      />
      <Path
        d="M8.85 18.67h4.17v15.36h-4.17ZM17.92 18.67h4.17v15.36h-4.17ZM27 18.67h4.17v15.36H27Z"
        fill={color}
      />
    </Svg>
  );
}

/** Card: a rounded card outline with a short chip bar in its upper-left corner. */
export function CardIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect
        x={6.09}
        y={9.03}
        width={27.83}
        height={21.94}
        rx={3.4}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Rect x={12.7} y={15.6} width={7.4} height={3.6} rx={0.8} fill={color} />
    </Svg>
  );
}

/** Pay: a bold upright "$", an S with a bar showing above and below it. */
export function PayIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M28 13.4C26.4 11.2 23.6 10.4 20 10.4C16 10.4 12.4 12.2 12.4 15.2C12.4 18.6 16 19.2 20 20C24 20.8 27.6 21.6 27.6 24.8C27.6 27.8 24.2 29.6 20 29.6C16.2 29.6 13.4 28.6 11.6 26.2"
        fill="none"
        stroke={color}
        strokeWidth={4.8}
      />
      <Path d="M20 4.5V11M20 29V35.5" stroke={color} strokeWidth={4.4} />
    </Svg>
  );
}

/** Discover: a magnifier, a ring with a short handle to the lower right. */
export function DiscoverIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={17.8} cy={17.8} r={9.7} fill="none" stroke={color} strokeWidth={STROKE} />
      <Path d="M24.7 24.7L31.6 31.6" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

/** Activity: a clock ring with square-ended hands in an L, pointing to 12 and 3. */
export function ActivityIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={13.94} fill="none" stroke={color} strokeWidth={4.2} />
      <Path d="M17.23 13.08H21.66V19.28H27.19V23.49H17.23Z" fill={color} />
    </Svg>
  );
}
