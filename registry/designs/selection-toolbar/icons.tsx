/**
 * Icons for the Selection Toolbar design: line glyphs for what people do with a selection,
 * drawn in a 24-unit box with a 1.8-unit round stroke. Pass them as an action's `icon`; they
 * also work as `tabBarIcon`.
 */
import Svg, { Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Only the colour and size are used, so these fit an action's `icon` and a tab's icon. */
type IconProps = Pick<TabIconProps, 'color' | 'size'>;

const STROKE = 1.8;

function Line({ d, color }: { d: string; color: string }) {
  return (
    <Path
      d={d}
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** A tray with an arrow leaving it: share. */
export function ShareIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line d="M12 3.5v11M8 7.2l4-3.7 4 3.7" color={color} />
      <Line
        d="M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5"
        color={color}
      />
    </Svg>
  );
}

/** A folder with an arrow going into it: move. */
export function MoveIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line
        d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2h7.2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"
        color={color}
      />
      <Line d="M9 13.5h6.5M13 11l2.5 2.5L13 16" color={color} />
    </Svg>
  );
}

/** Two overlapping sheets: duplicate. */
export function CopyIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={8.5}
        y={8.5}
        width={11}
        height={12}
        rx={2}
        stroke={color}
        strokeWidth={STROKE}
        fill="none"
      />
      <Line
        d="M15.5 5.5v-.5a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 5v9A1.5 1.5 0 0 0 6 15.5h.5"
        color={color}
      />
    </Svg>
  );
}

/** A bin with a lid: delete. */
export function DeleteIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line
        d="M4 6.5h16M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"
        color={color}
      />
      <Line
        d="M6 6.5l.9 12.2a2 2 0 0 0 2 1.8h6.2a2 2 0 0 0 2-1.8L18 6.5M10 10.5v6M14 10.5v6"
        color={color}
      />
    </Svg>
  );
}
