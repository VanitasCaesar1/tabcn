/**
 * Icons for the Button Row design, drawn by hand over Uber Eats' App Store screenshots and
 * checked by rendering them at the screenshots' scale (2.448 px per pt) and overlaying them on
 * the bar. Each sits in a 40-unit box meant to render at 24 pt (0.6 pt per unit), so the
 * artwork comes out at the measured size: a 15.1 x 16.3 pt house, a 17.2 x 16.7 pt pin over a
 * folded map, a 14.7 pt magnifier, a 16.7 x 14.7 pt cart and a 13.1 x 15.1 pt person.
 * Outlines are 2.4 units (1.45 pt, measured across the strokes) with round ends and corners,
 * except the map's frame, which has square corners and flat ends, as in the app.
 *
 * Inactive tabs show the outline glyph. Active, a tab shows the filled glyph: the screenshots
 * only show Home active (a solid house with the door cut out), so the filled map, cart and
 * person are drawn the same way (filled shapes, same outer edge), and the magnifier just gets
 * a heavier stroke. Pass them as `tabBarIcon`.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const STROKE = 2.4;
/** The active magnifier's heavier stroke: a magnifier has no fill to switch to. */
const STROKE_BOLD = 3.2;

const line = {
  fill: 'none',
  strokeWidth: STROKE,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * Home: a house with a pitched roof and a door. Filled when active: the measured glyph, a
 * solid house 25.2 x 27.2 units with a 7.2-unit door cut out (softened corners).
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path
          d="M20 7L32.2 17.5V33.2H24V22.8H16V33.2H7.8V17.5Z"
          fill={color}
          stroke={color}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M8.6 17.75L20 7.7L31.4 17.75V32.4H23.6V24.6H16.4V32.4H8.6Z"
          stroke={color}
          {...line}
        />
      )}
    </Svg>
  );
}

/** The pin's teardrop: a round head (radius 7.25), its sides running straight to the tip. */
const PIN = 'M14.91 18.86L20.5 25.65L26.09 18.86A7.25 7.25 0 1 0 14.91 18.86Z';
/** The pin's dot, as a separate shape so the filled pin can cut it out. */
const PIN_DOT = 'M18.7 14.45A1.7 1.7 0 1 0 22.1 14.45A1.7 1.7 0 1 0 18.7 14.45Z';
/** The unfolded map: a flap either side of the pin, and a wavy bottom edge. */
const MAP =
  'M11.3 21.5L6.95 22.5V33.05C10.5 31.2 14.5 31.2 18.5 32C22.5 32.8 27.5 33.1 33.35 31.4V20.7L28.4 23.35';

/** Map (Pickup): a map pin over an unfolded map. Active, the pin fills with its dot cut out. */
export function MapIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={MAP}
        stroke={color}
        fill="none"
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {focused ? (
        <>
          <Path d={PIN + PIN_DOT} fill={color} fillRule="evenodd" />
          <Path d={PIN} stroke={color} {...line} />
        </>
      ) : (
        <>
          <Path d={PIN} stroke={color} {...line} />
          <Circle cx={20.4} cy={14.45} r={1.5} fill={color} />
        </>
      )}
    </Svg>
  );
}

/** Search: a magnifier, its handle at the lower right. Active, the stroke gets heavier. */
export function SearchIcon({ color, size, focused }: TabIconProps) {
  const strokeWidth = focused ? STROKE_BOLD : STROKE;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18.5} cy={18.3} r={9.75} stroke={color} {...line} strokeWidth={strokeWidth} />
      <Path d="M25.4 25.2L31.13 30.93" stroke={color} {...line} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** The cart's basket, from its bottom-left corner round to the left end of the top bar. */
const BASKET = 'H27.4Q30.5 25.45 31.15 22.3L32.55 13.45H11.5';

/** Cart: a shopping cart with a handle and two wheel dots. Active, the basket fills. */
export function CartIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? <Path d={`M13.95 25.45${BASKET}Z`} fill={color} /> : null}
      <Path
        d={`M7.05 9.75H8.8Q10.75 9.75 11.15 11.8L13.95 25.45${BASKET}`}
        stroke={color}
        {...line}
      />
      <Circle cx={13.9} cy={31.05} r={2.35} fill={color} />
      <Circle cx={29.4} cy={31.05} r={2.35} fill={color} />
    </Svg>
  );
}

/** The person's body: a domed top, straight sides and rounded bottom corners. */
const BODY =
  'M10.7 24.6C10.7 22.55 15.3 21.5 20.4 21.5C25.5 21.5 30.1 22.55 30.1 24.6V27A4.35 4.35 0 0 1 25.75 31.35H15.05A4.35 4.35 0 0 1 10.7 27Z';

/** Account: a person, a round head over a rounded body. Active, both fill. */
export function AccountIcon({ color, size, focused }: TabIconProps) {
  const fill = focused ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20.4} cy={13.2} r={4.6} stroke={color} {...line} fill={fill} />
      <Path d={BODY} stroke={color} {...line} fill={fill} />
    </Svg>
  );
}
