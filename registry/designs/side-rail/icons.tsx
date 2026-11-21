/**
 * Icons for the Side Rail design (Google Drive's tablet rail). Drawn by hand in a 40-unit box
 * (the rail's 24 pt icon box) to the glyph sizes measured on the app's Play Store
 * screenshots: outlined with a 2 pt stroke when inactive, filled when active, as Material
 * Symbols are. Each icon switches on `focused`; the design crossfades the two.
 * Pass them as `tabBarIcon` in your screen options.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 2 pt in the 40-unit box drawn at 24 pt. */
const STROKE = 3.33;

/** House with a pitched roof and a door cut into its base (17 x 18 pt). */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  const outer = 'M20 5L34.2 15.6V35H24.2V25.5H15.8V35H5.8V15.6Z';
  // The room inside the walls, around the door frame.
  const inner = 'M20 9.16L30.9 17.29V31.7H27.5V22.2H12.5V31.7H9.1V17.29Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d={focused ? outer : `${outer}${inner}`} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

/** Five-point star with softened points (18.7 x 17.8 pt). */
export function StarIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M20 6.8L23.63 16.51L33.98 16.96L25.87 23.41L28.64 33.39L20 27.67L11.36 33.39L14.13 23.41L6.02 16.96L16.37 16.51Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Two people: one in front (a round head over rounded shoulders) and a second behind it to
 * the right, drawn as two solid crescents (22.4 x 15.9 pt).
 */
export function SharedIcon({ color, size, focused }: TabIconProps) {
  const fill = focused ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={14.5} cy={13.3} r={4.9} fill={fill} stroke={color} strokeWidth={STROKE} />
      <Path
        d="M3 31.6V28.6C3 25.6 8 23.6 14.5 23.6C21 23.6 26 25.6 26 28.6V31.6Z"
        fill={fill}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d="M26 7.1A6.2 6.2 0 0 1 26 19.5A8 8 0 0 0 26 7.1Z" fill={color} />
      <Path
        d="M29 23.9C34.6 24.6 38.65 26.8 38.65 29.6V33.25H32.4V29.9C32.4 27.6 31.2 25.5 29 23.9Z"
        fill={color}
      />
    </Svg>
  );
}

/** Folder with a tab at the top left (20.6 x 15.9 pt). */
export function FolderIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M4.7 8.3H15.7L19 11.6H33.6Q35.3 11.6 35.3 13.3V30Q35.3 31.7 33.6 31.7H6.4Q4.7 31.7 4.7 30Z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
