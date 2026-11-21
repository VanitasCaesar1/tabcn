/**
 * Icons for the Cart Pill design: Shop's four tab glyphs (Home, Search, Explore, Orders),
 * drawn by hand from row-by-row measurements of the App Store screenshots (2.42 px per pt).
 * Each sits centred in a 40-unit box meant to render at 24 pt (0.6 pt per unit), so the
 * artwork comes out at the measured size: a 21.5 x 20 pt house, a 20.8 pt magnifier, a
 * 19.7 x 20.5 pt grid and an 18.5 x 18 pt box.
 *
 * All are filled except Search, and they stay filled when inactive: only the colour changes.
 * The lid seam of the box is a real hole (even-odd fill), so whatever is behind it, the white
 * capsule or the glass, shows through, as in the app.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/**
 * Home: a filled house. The roof is a 3.5-unit band whose eaves stick out past the walls
 * with round ends; the walls have 7.5-unit rounded bottom corners and there is no door.
 */
export function HomeIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 4.8L6.3 14.55V29.1A7.5 7.5 0 0 0 13.8 36.6H26.2A7.5 7.5 0 0 0 33.7 29.1V14.55Z"
        fill={color}
      />
      <Path
        d="M3.85 16.3L20 4.8L36.15 16.3"
        stroke={color}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Search: an outlined magnifier, a 31-unit ring with a round-capped handle down-right. */
export function SearchIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18.15} cy={18.15} r={12.85} stroke={color} strokeWidth={5.2} fill="none" />
      <Path
        d="M27.24 27.24L34.63 34.63"
        stroke={color}
        strokeWidth={5.2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Explore: a filled 2 x 2 grid of rounded squares, 3 units apart. */
export function ExploreIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={3.6} y={2.95} width={15} height={15.55} rx={3.5} fill={color} />
      <Rect x={21.4} y={2.95} width={15} height={15.55} rx={3.5} fill={color} />
      <Rect x={3.6} y={21.5} width={15} height={15.55} rx={3.5} fill={color} />
      <Rect x={21.4} y={21.5} width={15} height={15.55} rx={3.5} fill={color} />
    </Svg>
  );
}

/**
 * Orders: a filled parcel. Its top corners are cut at an angle, the bottom ones are rounded,
 * and a T-shaped lid seam (a line a third of the way down with a notch up to the top
 * centre) is cut out of it.
 */
export function OrdersIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        fillRule="evenodd"
        d="M4.55 14.6Q4.55 13.4 5.22 12.4L9.63 5.8Q10.3 4.9 11.5 4.9H28.5Q29.7 4.9 30.37 5.8L34.78 12.4Q35.45 13.4 35.45 14.6V29.5A5.5 5.5 0 0 1 29.95 35H10.05A5.5 5.5 0 0 1 4.55 29.5Z M10.2 13.3H18.4V7.9A1.6 1.6 0 0 1 21.6 7.9V13.3H29.8A1.6 1.6 0 0 1 29.8 16.5H10.2A1.6 1.6 0 0 1 10.2 13.3Z"
        fill={color}
      />
    </Svg>
  );
}
