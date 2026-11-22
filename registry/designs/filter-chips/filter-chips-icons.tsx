/**
 * Icons for the Filter Chips design: the strip's "all filters" sliders and clear-all cross,
 * and four group glyphs for the demo (sort, delivery, date, category), drawn by hand in a
 * 24-unit box with a 1.9-unit round stroke. Pass a group glyph as `FilterGroup.icon`.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** What a group's `icon` receives. */
export interface FilterIconProps {
  color: string;
  size: number;
}

const STROKE = 1.9;

const line = {
  strokeWidth: STROKE,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

/** Three sliders: all filters. */
export function SlidersIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 4 7 H 11 M 15 7 H 20 M 4 17 H 7 M 11 17 H 20" stroke={color} {...line} />
      <Circle cx={13} cy={7} r={2.2} stroke={color} {...line} />
      <Circle cx={9} cy={17} r={2.2} stroke={color} {...line} />
    </Svg>
  );
}

/** A cross: clear all. */
export function CrossIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 7 7 L 17 17 M 17 7 L 7 17" stroke={color} {...line} />
    </Svg>
  );
}

/** Up and down arrows: sort. */
export function SortIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 8 19 V 5 M 4.5 8.5 L 8 5 L 11.5 8.5 M 16 5 V 19 M 12.5 15.5 L 16 19 L 19.5 15.5"
        stroke={color}
        {...line}
      />
    </Svg>
  );
}

/** A van: delivery. */
export function TruckIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 3 16 V 7 H 14 V 16 M 14 10 H 18 L 21 13 V 16 H 19.5 M 9.5 16 H 15.5 M 3 16 H 4.5"
        stroke={color}
        {...line}
      />
      <Circle cx={7} cy={16.5} r={2} stroke={color} {...line} />
      <Circle cx={17.5} cy={16.5} r={2} stroke={color} {...line} />
    </Svg>
  );
}

/** A calendar page: arrival date. */
export function CalendarIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={5.5} width={16} height={14} rx={3} stroke={color} {...line} />
      <Path d="M 4 10 H 20 M 8.5 3.5 V 7 M 15.5 3.5 V 7" stroke={color} {...line} />
    </Svg>
  );
}

/** Four squares: category. */
export function GridIcon({ color, size }: FilterIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.8} stroke={color} {...line} />
      <Rect x={13.5} y={4} width={6.5} height={6.5} rx={1.8} stroke={color} {...line} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.8} stroke={color} {...line} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.8} stroke={color} {...line} />
    </Svg>
  );
}
