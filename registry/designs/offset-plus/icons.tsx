/**
 * Icons for the Offset Plus design (TikTok). Drawn in a 40-unit box, which the bar draws at
 * 28 pt (0.7 pt per unit). Each shape was fitted to the app's App Store screenshot at
 * 2.4 px per pt: the outlines were rendered over the screenshot pixels and moved until they
 * lined up, then written as clean circles, arcs and lines. Outlines use a 2.12 pt stroke with
 * round caps and joins, as measured.
 *
 * The screenshots only show the filled house (Home is active in all of them) and the other
 * three as outlines. The filled Friends, Inbox and Profile and the outline house are made
 * from those: each filled shape is exactly the outside edge of its outline, so the design
 * can crossfade the two without any edge moving. Each icon switches on `focused`.
 * Some glyphs sit a fraction of a point off the slot centre, as they do in the app.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 2.12 pt in the 40-unit box drawn at 28 pt. */
const STROKE = 3.03;

/**
 * A house with a rounded peak, eaves that stick out past the walls, slightly tapered walls
 * and a narrow door slot cut up from the bottom (25 x 22.5 pt). The outline version has no
 * door; it is not in the screenshots.
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path
          d="M19 3.26A1.57 1.57 0 0 1 21 3.26L37.39 16.8A1.29 1.29 0 0 1 37.86 17.79L37.86 18.29A1.29 1.29 0 0 1 36.57 19.57L34.14 19.57L32.88 32.71Q32.64 35.14 30.21 35.14L21.5 35.14L21.5 23.93Q21.5 23.29 20.86 23.29L19.14 23.29Q18.5 23.29 18.5 23.93L18.5 35.14L9.79 35.14Q7.36 35.14 7.12 32.71L5.86 19.57L3.43 19.57A1.29 1.29 0 0 1 2.14 18.29L2.14 17.79A1.29 1.29 0 0 1 2.61 16.8Z"
          fill={color}
        />
      ) : (
        <Path
          d="M7.37 18.06L3.66 18.06L20 4.39L36.34 18.06L32.63 18.06L31.13 33.63L8.87 33.63Z"
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
 * Two people: a larger head and shoulders on the left, a smaller pair on the right whose
 * shoulder starts just clear of the larger one (25.4 x 20 pt).
 */
export function FriendsIcon({ color, size, focused }: TabIconProps) {
  const heads =
    'M6.79 12.69A5.86 5.86 0 1 1 18.5 12.69A5.86 5.86 0 1 1 6.79 12.69Z' +
    'M23.9 16.74A4.06 4.06 0 1 1 32.01 16.74A4.06 4.06 0 1 1 23.9 16.74Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={
          focused
            ? `${heads}M2.9 32.57A9.74 8.19 0 0 1 22.39 32.57ZM25.46 26.4A7.79 6.29 0 0 1 35.74 32.36L27.89 32.36Z`
            : `${heads}M2.9 32.57A9.74 8.19 0 0 1 22.39 32.57M25.46 26.4A7.79 6.29 0 0 1 35.74 32.36`
        }
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A speech bubble: a near-square box with a small V tail at the bottom centre and a short
 * dash inside (21.7 x 22.5 pt). Filled, the dash is cut out of the solid bubble.
 */
export function InboxIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {focused ? (
        <Path
          d="M5.5 4.51L33.07 4.51A1.51 1.51 0 0 1 34.59 6.03L34.59 29.5A1.51 1.51 0 0 1 33.07 31.01L24.74 31.01L20.41 35.8A1.51 1.51 0 0 1 18.16 35.8L13.83 31.01L5.5 31.01A1.51 1.51 0 0 1 3.99 29.5L3.99 6.03A1.51 1.51 0 0 1 5.5 4.51ZM13.21 16.7L13.21 19.73L25.36 19.73L25.36 16.7Z"
          fill={color}
          fillRule="evenodd"
        />
      ) : (
        <>
          <Path
            d="M5.5 6.03L33.07 6.03L33.07 29.5L24.07 29.5L19.29 34.79L14.5 29.5L5.5 29.5Z"
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <Path d="M13.21 18.21L25.36 18.21" stroke={color} strokeWidth={STROKE} />
        </>
      )}
    </Svg>
  );
}

/** A person: a round head over a shoulder arc with round ends (18.8 x 21.3 pt). */
export function ProfileIcon({ color, size, focused }: TabIconProps) {
  const head = 'M13.26 12.69A7.17 7.17 0 1 1 27.6 12.69A7.17 7.17 0 1 1 13.26 12.69Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={`${head}M8.9 34.5A11.53 9.5 0 0 1 31.96 34.5${focused ? 'Z' : ''}`}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
