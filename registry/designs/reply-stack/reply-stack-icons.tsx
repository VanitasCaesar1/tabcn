/**
 * Icons for the Reply Stack design, drawn by hand to the proportions and stroke weight of X's
 * navigation glyphs (not traced): five tab glyphs (home, search, explore, bell, chat) in a 40-unit
 * box, and in a 24-unit box three for the reply row (photo, GIF, expand) and the compose button's
 * plus. The tab glyphs take `focused`: an outline when idle, solid when active (search and explore
 * thicken instead). Reply Stack draws both forms and swaps them. Pass the tab glyphs as
 * `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Outline weight in the 40-unit box: 2.4 pt at Reply Stack's 31 pt icon size. */
const STROKE = 3.1;
/** Search and explore have no solid form: they thicken when active. */
const HEAVY = 4.3;

const round = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** A house with an arched door. Solid when active. */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 7 32.6 L 7 17.2 L 20 7.2 L 33 17.2 L 33 32.6 Q 33 34 31.6 34 L 24.3 34 L 24.3 29.6 A 4.3 4.3 0 0 0 15.7 29.6 L 15.7 34 L 8.4 34 Q 7 34 7 32.6 Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
    </Svg>
  );
}

/** A magnifier. Thickens when active. */
export function SearchIcon({ color, size, focused }: TabIconProps) {
  const width = focused ? HEAVY : STROKE;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18.2} cy={18.2} r={11.6} stroke={color} strokeWidth={width} fill="none" />
      <Path d="M 26.6 26.6 L 34.4 34.4" stroke={color} strokeWidth={width} {...round} />
    </Svg>
  );
}

/** A ring crossed by a thin blade that runs past it at both ends: explore. Thickens when active. */
export function ExploreIcon({ color, size, focused }: TabIconProps) {
  const width = focused ? HEAVY : STROKE;
  // The blade is a long, thin diamond: pointed at both ends, widest where it crosses the ring.
  const half = focused ? 2.3 : 1.7;
  const blade = `M 3.4 37 L ${20 - half} ${20 - half} L 37 3 L ${20 + half} ${20 + half} Z`;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={11.2} stroke={color} strokeWidth={width} fill="none" />
      <Path d={blade} fill={color} stroke={color} strokeWidth={0.6} strokeLinejoin="round" />
    </Svg>
  );
}

/** A bell on a flat rim, with a half-round clapper under it. Solid when active. */
export function BellIcon({ color, size, focused }: TabIconProps) {
  const body =
    'M 10.2 28.4 L 11.4 18.2 C 12 12.4 15.5 7.8 20 7.8 C 24.5 7.8 28 12.4 28.6 18.2 L 29.8 28.4 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={body}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
      <Path d="M 7.6 28.4 L 32.4 28.4" stroke={color} strokeWidth={STROKE} {...round} />
      <Path
        d="M 16 29.6 A 4 4 0 0 0 24 29.6"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
    </Svg>
  );
}

/** A round speech bubble with a short tail at its lower left. Solid when active. */
export function ChatIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 6.4 34 L 8.3 24 A 13.6 13.6 0 1 1 14.4 31.2 Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
    </Svg>
  );
}

/** What the reply row's actions are drawn with. */
export interface ReplyIconProps {
  color: string;
  size: number;
}

/** A framed picture: the reply row's photo action. */
export function PhotoIcon({ color, size }: ReplyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.2} y={2.2} width={19.6} height={19.6} rx={5} stroke={color} strokeWidth={2} />
      <Circle cx={15.6} cy={8.4} r={2} fill={color} />
      <Path d="M 2.8 18.6 L 9.2 12.2 L 18.2 21.2" stroke={color} strokeWidth={2} {...round} />
    </Svg>
  );
}

/** "GIF" in a frame, the letters drawn as strokes so they don't depend on a font. */
export function GifIcon({ color, size }: ReplyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2.2} y={2.2} width={19.6} height={19.6} rx={5} stroke={color} strokeWidth={2} />
      <Path
        d="M 9.3 9.6 A 2.9 2.9 0 1 0 10.1 12.2 L 8.3 12.2 M 12.6 9.2 L 12.6 14.8 M 15.4 14.8 L 15.4 9.2 L 18.4 9.2 M 15.4 12 L 17.8 12"
        stroke={color}
        strokeWidth={2}
        {...round}
      />
    </Svg>
  );
}

/** Two corners pulling apart: the reply row's expand action. */
export function ExpandIcon({ color, size }: ReplyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M 13.6 3 L 21 3 L 21 10.4 M 21 3 L 13.8 10.2 M 10.4 21 L 3 21 L 3 13.6 M 3 21 L 10.2 13.8"
        stroke={color}
        strokeWidth={2.2}
        {...round}
      />
    </Svg>
  );
}

/** A plus, for the compose button: two round-ended strokes, 14 units long in the 24-unit box. */
export function PlusIcon({ color, size }: ReplyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 12 5 L 12 19 M 5 12 L 19 12" stroke={color} strokeWidth={2} {...round} />
    </Svg>
  );
}
