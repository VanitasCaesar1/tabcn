/**
 * Icons for the Quick Create design: line glyphs for common create actions, drawn by hand in
 * a 40-unit box with a 3.4-unit round stroke (1.9 pt at the menu's 22 pt), close to the
 * weight of Labeled + Plus's Creator rays. Pass them as an action's `icon`; they also work
 * as `tabBarIcon`.
 */
import Svg, { Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Only the colour and size are used, so these fit an action's `icon` and a tab's icon. */
type IconProps = Pick<TabIconProps, 'color' | 'size'>;

const STROKE = 3.4;

/** A microphone on a stand: record a voice. */
export function MicIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect
        x={14}
        y={4}
        width={12}
        height={20}
        rx={6}
        stroke={color}
        strokeWidth={STROKE}
        fill="none"
      />
      <Path
        d="M 8 19 A 12 12 0 0 0 32 19 M 20 31 L 20 36"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** A capital T with a text line beside it: write. */
export function TextIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 6 8 L 26 8 M 16 8 L 16 33 M 25 21 L 35 21 M 25 31 L 35 31"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** An arrow rising out of an open tray: upload a file. */
export function UploadIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 20 26 L 20 5 M 12 13 L 20 5 L 28 13 M 6 24 L 6 30 A 5 5 0 0 0 11 35 L 29 35 A 5 5 0 0 0 34 30 L 34 24"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
