/**
 * Icons for the Split Search design, drawn by hand to the glyph sizes measured on the Apple
 * Store app's App Store screenshots (3x zoom of the bar). Each sits centred in a 40-unit box
 * meant to render at 36 pt (0.9 pt per unit), so the artwork comes out at the measured size:
 * a 21 pt rounded square, a 32 x 19.5 pt laptop with a phone, a 23 pt compass, a 20 x 23 pt bag
 * and a 22.6 pt magnifier. Active and inactive differ only in colour; the cut-outs are white in
 * both states, and the screens of the laptop and phone are the colour at 25%, as in the app.
 * Pass them as `tabBarIcon`.
 */
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** The white of the cut-outs in the filled glyphs. */
const CUT = '#ffffff';

/** For You: a filled rounded square with a four-point sparkle and two lines cut out. */
export function ForYouIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect x={8.6} y={8.7} width={23} height={23} rx={4.6} fill={color} />
      <Path
        d="M15.8 12.4Q16.35 15.05 19 15.6Q16.35 16.15 15.8 18.8Q15.25 16.15 12.6 15.6Q15.25 15.05 15.8 12.4Z"
        fill={CUT}
      />
      <Path
        d="M13.1 23.2H25.9M13.1 27.2H22.9"
        stroke={CUT}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Products: a laptop outline with a phone in front of its right side; the screens are tinted. */
export function ProductsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        {/* Clears a 1.4-unit gap round the phone, out of the laptop behind it. */}
        <Mask
          id="split-search-products-gap"
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={40}
          height={40}
        >
          <Rect x={0} y={0} width={40} height={40} fill="#ffffff" />
          <Rect x={25.2} y={12} width={13.4} height={20} rx={4.1} fill="#000000" />
        </Mask>
      </Defs>
      <G mask="url(#split-search-products-gap)">
        <Rect x={7.6} y={10.4} width={25.8} height={17.4} fill={color} fillOpacity={0.25} />
        <Path
          d="M7.6 28V12.8A2.4 2.4 0 0 1 10 10.4H31A2.4 2.4 0 0 1 33.4 12.8V28"
          stroke={color}
          strokeWidth={2}
          fill="none"
        />
        <Rect x={2.2} y={27.2} width={35.6} height={2.8} rx={1.4} fill={color} />
      </G>
      <Rect
        x={27.5}
        y={14.3}
        width={8.8}
        height={15.4}
        rx={1.8}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M30.7 16.7H33.1M30.7 27.3H33.1"
        stroke={color}
        strokeWidth={0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Go Further: a filled compass disc with a white needle from top right to bottom left. */
export function GoFurtherIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={12.9} fill={color} />
      <Path
        d="M26.5 13.5L22.4 22.4L13.5 26.5L17.6 17.6Z"
        fill={CUT}
        stroke={CUT}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <Circle cx={20} cy={20} r={1.45} fill={color} />
    </Svg>
  );
}

/** Bag: a filled rounded tote with an arched handle. */
export function BagIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M16.8 12.6V11.8A3.2 3.2 0 0 1 23.2 11.8V12.6"
        stroke={color}
        strokeWidth={2.1}
        fill="none"
      />
      <Rect x={8.8} y={11.8} width={22.6} height={21.3} rx={3.8} fill={color} />
    </Svg>
  );
}

/** Search: a magnifying glass, its round-capped handle to the bottom right. */
export function SearchIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={17.6} cy={17.6} r={9} stroke={color} strokeWidth={2.3} fill="none" />
      <Path d="M24.4 24.4L31.1 31.1" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
    </Svg>
  );
}
