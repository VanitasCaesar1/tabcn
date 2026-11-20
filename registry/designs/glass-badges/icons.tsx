/**
 * Icons for the Glass Badges design (Telegram). Contacts, Calls, Chats and Settings are
 * Telegram's own filled glyphs, not SF Symbols: the handset and the visible parts of the two
 * chat bubbles were traced from the App Store screenshot with potrace, and the rest drawn to
 * its measurements. Each sits centred in a 40-unit box meant to render at 30 pt (0.75 pt per
 * unit), which gives the measured sizes: Contacts 25.9 pt, Calls 23.1 pt, Chats 29.2 x 24.8 pt,
 * Settings 27.5 pt and the search magnifier 21 pt. Active and inactive differ only in colour;
 * the cut-outs are transparent, so the glass shows through them. Pass them as `tabBarIcon`.
 */
import Svg, { Circle, Defs, Ellipse, G, Mask, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

/** Contacts: a filled circle with a person (head and shoulders) cut out of it. */
export function ContactsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M2.8 20A17.2 17.2 0 1 0 37.2 20A17.2 17.2 0 1 0 2.8 20ZM14.55 16A5.45 5.45 0 1 0 25.45 16A5.45 5.45 0 1 0 14.55 16ZM9.8 30.82C9.8 27.4 14.4 25.25 20 25.25C25.6 25.25 30.2 27.4 30.2 30.82A14.87 14.87 0 0 1 9.8 30.82Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** Calls: a classic handset tilted 45 degrees, receiver at the top left. */
export function CallsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M9.67 4.88C6.62 5.53 4.6 9.01 5.02 12.88C5.63 18.41 10.51 25.38 17.57 30.81C19.1 31.99 22.25 33.83 23.78 34.44C28.01 36.11 31.45 35.69 33.85 33.21C36.07 30.92 36.05 28.72 33.81 27.38C33.59 27.25 32.92 26.84 32.31 26.46C27.94 23.74 27.29 23.69 24.4 25.89C22.57 27.26 22.13 27.42 21.18 27.06C19.6 26.45 14.66 21.68 13.44 19.59C12.74 18.38 12.81 17.98 14.06 16.32C15.44 14.48 15.71 13.98 15.82 13C15.99 11.54 15.77 11.06 12.94 6.62C12.04 5.2 10.93 4.61 9.67 4.88Z"
        fill={color}
      />
    </Svg>
  );
}

/** The front bubble's tail, at its bottom left. */
const FRONT_TAIL =
  'M5.55 26.84C7.21 28.37 7.26 29.7 5.72 31.74C4.83 32.93 5.05 33.46 6.39 33.39C7.81 33.31 9.04 32.75 10.73 31.4C11.94 30.43 12.16 30.38 13.97 30.61L12 24Z';
/** The back bubble's tail, at its bottom right. */
const BACK_TAIL =
  'M35.81 30.35C34.18 31.98 34.05 32.21 34.12 33.34C34.18 34.2 34.37 34.65 35.14 35.73C36.11 37.09 35.83 37.61 34.24 37.43C32.84 37.28 31.84 36.78 30.06 35.37C29.03 34.55 28.66 34.45 27.34 34.66L29 28Z';

/**
 * Chats: two overlapping speech bubbles of the same size. The front one is at the upper left
 * with its tail at the bottom left; the back one is lower right with its tail at the bottom
 * right. A 1 pt gap is cut out of the back bubble all round the front one.
 */
export function ChatsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <Mask
          id="glass-badges-chats-gap"
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={40}
          height={40}
        >
          <Rect x={0} y={0} width={40} height={40} fill="#ffffff" />
          <Ellipse
            cx={15.5}
            cy={17.3}
            rx={14.4}
            ry={13.3}
            fill="#000000"
            stroke="#000000"
            strokeWidth={2.8}
          />
          <Path
            d={FRONT_TAIL}
            fill="#000000"
            stroke="#000000"
            strokeWidth={2.8}
            strokeLinejoin="round"
          />
        </Mask>
      </Defs>
      <G mask="url(#glass-badges-chats-gap)">
        <Ellipse cx={25.4} cy={21.3} rx={14.4} ry={13.3} fill={color} />
        <Path d={BACK_TAIL} fill={color} />
      </G>
      <Ellipse cx={15.5} cy={17.3} rx={14.4} ry={13.3} fill={color} />
      <Path d={FRONT_TAIL} fill={color} />
    </Svg>
  );
}

/**
 * Settings: a gear with 12 round-tipped teeth, a gap ring inside it, and a disc split into
 * three by a Y-shaped cut (spokes pointing right, up-left and down-left).
 */
export function SettingsIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={13.45} fill="none" stroke={color} strokeWidth={2.6} />
      <Path
        d="M34 20L36.85 20M32.12 27L34.59 28.42M27 32.12L28.43 34.59M20 34L20 36.85M13 32.12L11.58 34.59M7.88 27L5.41 28.42M6 20L3.15 20M7.88 13L5.41 11.57M13 7.88L11.57 5.41M20 6L20 3.15M27 7.88L28.43 5.41M32.12 13L34.59 11.57"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* The three hub segments, drawn 0.7 units small and stroked back out to round their corners. */}
      <Path
        d="M20.95 21.65L28.69 21.65A8.85 8.85 0 0 1 17.08 28.35ZM18.09 20L14.22 26.7A8.85 8.85 0 0 1 14.22 13.3ZM20.95 18.35L17.08 11.65A8.85 8.85 0 0 1 28.69 18.35Z"
        fill={color}
        stroke={color}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Search: a semibold magnifier, ring at the top left and handle to the bottom right. The
 * design draws the same glyph in its search button; this is for a Search tab elsewhere.
 */
export function SearchIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={17.8} cy={17.5} r={10.3} fill="none" stroke={color} strokeWidth={2.9} />
      <Path d="M25.08 24.78L32.55 32.25" stroke={color} strokeWidth={3.3} strokeLinecap="round" />
    </Svg>
  );
}
