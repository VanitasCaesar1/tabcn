/**
 * Icons for the Accent Dark design (Strava's tab bar): Home, Maps, Record, Groups and You.
 * Drawn by hand in a 40-unit box (the bar's 24 pt icon box) to the glyphs measured on the
 * app's App Store screenshots at 2 px per pt. Ink sizes: house 22 x 21 pt, map 23 x 22 pt,
 * record 24 pt, diamonds 24 x 22 pt, clipboard 20 x 24 pt. Outlines use a 2 pt stroke with
 * round joins and caps. Each icon switches on `focused`: outlined when inactive, solid when
 * active, with the inner lines cut out of the solid shape. The design crossfades the two.
 * Pass them as `tabBarIcon` in your screen options. Not the app's artwork: redrawn shapes.
 */
import Svg, { Circle, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 2 pt in the 40-unit box drawn at 24 pt. */
const STROKE = 3.33;

/**
 * House with a rounded peak and a small house-shaped doorway at the bottom. Active: a solid
 * house with the doorway cut out.
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d="M16.7 2.19A4.67 4.67 0 0 1 23.3 2.19L37.11 16.01A4.17 4.17 0 0 1 38.33 18.95V32.5A3.33 3.33 0 0 1 35 35.83H5A3.33 3.33 0 0 1 1.67 32.5V18.95A4.17 4.17 0 0 1 2.89 16.01ZM13.33 32.5H26.67V26.39A1.33 1.33 0 0 0 26.28 25.44L21.18 20.35A1.67 1.67 0 0 0 18.82 20.35L13.72 25.44A1.33 1.33 0 0 0 13.33 26.39Z"
          fill={color}
          fillRule="evenodd"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M17.88 3.37A3 3 0 0 1 22.12 3.37L35.93 17.18A2.5 2.5 0 0 1 36.67 18.95V32.5A1.67 1.67 0 0 1 35 34.17H5A1.67 1.67 0 0 1 3.33 32.5V18.95A2.5 2.5 0 0 1 4.07 17.18ZM13.33 34.17V27.08A2 2 0 0 1 13.92 25.66L17.88 21.7A3 3 0 0 1 22.12 21.7L26.08 25.66A2 2 0 0 1 26.67 27.08V34.17"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The location pin: a 10 pt round head over a point, standing on the map's top right. */
const PIN = 'M29.08 23.83L23.24 13.21A6.67 6.67 0 1 1 34.92 13.21Z';

/**
 * A folded map in perspective (its left edge and fold lines lean in towards the right, which
 * stays upright) split into panels, with a location pin rising from its top right. Active:
 * solid panels with the fold lines cut out and a 2 pt gap round a solid pin.
 */
export function MapsIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <Mask
            id="accent-dark-maps-panels"
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={40}
            height={40}
          >
            <Path
              d="M34.92 15H15.02A1.67 1.67 0 0 0 13.57 15.85L4.09 32.6A2.67 2.67 0 0 0 6.41 36.58H35.78A1.67 1.67 0 0 0 37.45 34.92V17.75A2 2 0 0 0 37.14 16.67L34.92 13.21Z"
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            {/* The fold lines, run past the edges so they split the panels apart. */}
            <Path
              d="M24.02 10L11.96 41.58M17.02 28.33H42.45M27.75 28.33L25.1 41.58"
              fill="none"
              stroke="#000000"
              strokeWidth={STROKE}
            />
            {/* Clears 2 pt round the pin. */}
            <Path d={PIN} fill="#000000" stroke="#000000" strokeWidth={10} strokeLinejoin="round" />
          </Mask>
        </Defs>
        <G mask="url(#accent-dark-maps-panels)">
          <Rect x={0} y={0} width={40} height={40} fill={color} />
        </G>
        <Path d={PIN} fill={color} stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={`M24.22 15H15.02A1.67 1.67 0 0 0 13.57 15.85L4.09 32.6A2.67 2.67 0 0 0 6.41 36.58H35.78A1.67 1.67 0 0 0 37.45 34.92V17.75A2 2 0 0 0 37.14 16.67L34.92 13.21M22.11 15L13.87 36.58M17.02 28.33H37.45M27.75 28.33L26.1 36.58${PIN}`}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * A 2 pt ring, 24 pt across, round a 14 pt dot. The app never shows it active (Record opens a
 * full-screen recorder), so it is the same glyph in both states; only the colour changes.
 * Pass it as the design's `actionIcon` when Record is an action rather than a tab.
 */
export function RecordIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={18.33} fill="none" stroke={color} strokeWidth={STROKE} />
      <Circle cx={20} cy={20} r={11.67} fill={color} />
    </Svg>
  );
}

/** Outline of the three diamonds: one on top, bridging two side by side. */
const DIAMONDS =
  'M18.67 4.17A1.67 1.67 0 0 1 21.33 4.17L37.16 24.96A1.67 1.67 0 0 1 37.16 26.98L30.29 35.99A1.67 1.67 0 0 1 27.64 35.99L20 25.97L12.36 35.99A1.67 1.67 0 0 1 9.71 35.99L2.84 26.98A1.67 1.67 0 0 1 2.84 24.96Z';

/**
 * Interlocking diamonds: two side by side with a third bridging them on top, sharing edges
 * as a lattice. The app never shows it active, so the active glyph follows the others: three
 * solid diamonds with the shared edges cut out.
 */
export function GroupsIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <Mask
            id="accent-dark-groups-split"
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={40}
            height={40}
          >
            <Path
              d={DIAMONDS}
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <Path
              d="M9.01 11.55L20 25.97L30.99 11.55M20 25.97V30.5"
              fill="none"
              stroke="#000000"
              strokeWidth={STROKE}
            />
          </Mask>
        </Defs>
        <G mask="url(#accent-dark-groups-split)">
          <Rect x={0} y={0} width={40} height={40} fill={color} />
        </G>
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d={`${DIAMONDS}M11.03 14.2L20 25.97L28.97 14.2`}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** The three bars of the chart, 2 pt wide, rising to the right. */
const BARS = 'M11.67 23.33H15V31.67H11.67ZM18.33 20H21.67V31.67H18.33ZM25 16.67H28.33V31.67H25Z';

/**
 * A clipboard (a rounded board with an arched clip at the top centre) holding a three-bar
 * chart. Active: a solid board with the bars cut out and a 2 pt gap round a solid clip.
 */
export function YouIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d={`M3.33 7.5A4.17 4.17 0 0 1 7.5 3.33H10A0.83 0.83 0 0 1 10.83 4.17V10.33A1.33 1.33 0 0 0 12.17 11.67H27.83A1.33 1.33 0 0 0 29.17 10.33V4.17A0.83 0.83 0 0 1 30 3.33H32.5A4.17 4.17 0 0 1 36.67 7.5V35.83A4.17 4.17 0 0 1 32.5 40H7.5A4.17 4.17 0 0 1 3.33 35.83Z${BARS}`}
          fill={color}
          fillRule="evenodd"
        />
        <Path d="M13.33 8.33V6.67A6.67 6.67 0 0 1 26.67 6.67V8.33Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M13.33 5H7.5A2.5 2.5 0 0 0 5 7.5V35.83A2.5 2.5 0 0 0 7.5 38.33H32.5A2.5 2.5 0 0 0 35 35.83V7.5A2.5 2.5 0 0 0 32.5 5H26.67M13.33 10V8.33A6.67 6.67 0 0 1 26.67 8.33V10Z"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d={BARS} fill={color} />
    </Svg>
  );
}
