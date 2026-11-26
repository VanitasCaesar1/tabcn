/**
 * Icons for the Ask Dock design, drawn by hand in a 24-unit box with a 1.7 stroke: three tab
 * glyphs (discover, collection, history) that turn solid when `focused`, and the prompt's own
 * glyphs (photo, video, send arrow, close). Pass the tab glyphs as `tabBarIcon` in your screen
 * options; any other icon works too.
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

const STROKE = 1.7;
const round = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** Props of the prompt's glyphs. */
export interface AskIconProps {
  color: string;
  size: number;
}

/** A magnifier. Active, its lens fills in. */
export function DiscoverIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx={10.6}
        cy={10.6}
        r={focused ? 7.4 : 6.6}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={focused ? 0.6 : STROKE}
      />
      <Path
        d="M 15.9 15.9 L 20.4 20.4"
        stroke={color}
        strokeWidth={focused ? 2.3 : STROKE}
        {...round}
      />
    </Svg>
  );
}

/**
 * A strip of film seen straight on: a frame with a window in the middle and sprocket holes down
 * both sides. Active, it is a solid frame with the window and holes cut out of it.
 */
export function CollectionIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    // The outer frame, then every hole drawn the other way round: even-odd leaves them empty.
    const holes = (
      [
        [8.6, 6.2, 6.8, 11.6],
        [5.1, 6.2, 2.1, 2.4],
        [5.1, 10.8, 2.1, 2.4],
        [5.1, 15.4, 2.1, 2.4],
        [16.8, 6.2, 2.1, 2.4],
        [16.8, 10.8, 2.1, 2.4],
        [16.8, 15.4, 2.1, 2.4],
      ] as const
    )
      .map(([x, y, w, h]) => `M ${x} ${y} v ${h} h ${w} v ${-h} Z`)
      .join(' ');
    const frame =
      'M 6.4 3.4 H 17.6 Q 20.6 3.4 20.6 6.4 V 17.6 Q 20.6 20.6 17.6 20.6 H 6.4 Q 3.4 20.6 3.4 17.6 V 6.4 Q 3.4 3.4 6.4 3.4 Z';
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={`${frame} ${holes}`} fill={color} fillRule="evenodd" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={4}
        y={4}
        width={16}
        height={16}
        rx={3}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Path
        d="M 8.2 4 V 20 M 15.8 4 V 20 M 4 9 H 8.2 M 4 15 H 8.2 M 15.8 9 H 20 M 15.8 15 H 20"
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
    </Svg>
  );
}

/**
 * A clock whose ring opens at the top right into an arrow running back: history. Active, the
 * face fills and the hands are cut out of it.
 */
export function HistoryIcon({ color, size, focused }: TabIconProps) {
  if (focused) {
    const face = 'M 12 3.6 A 8.4 8.4 0 1 1 11.99 3.6 Z';
    // The hands, drawn the other way round so even-odd cuts them out of the face.
    const hands = 'M 11.1 7.4 L 11.1 12.6 L 14.6 14.9 L 15.5 13.6 L 12.9 11.9 L 12.9 7.4 Z';
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={`${face} ${hands}`} fill={color} fillRule="evenodd" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 19.6 9.2 A 8 8 0 1 1 15.4 4.8"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
      <Path
        d="M 15.6 2.4 L 15.6 5 L 18.2 5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
      <Path
        d="M 12 7.8 V 12.2 L 14.8 14"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        {...round}
      />
    </Svg>
  );
}

/** A photo: a rounded frame with a hill and a sun. */
export function PhotoIcon({ color, size }: AskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={3.5}
        y={3.5}
        width={17}
        height={17}
        rx={4}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M 3.8 16.4 L 8.6 11.8 Q 9.4 11.1 10.2 11.8 L 14.2 15.4 M 13 14.3 L 15 12.6 Q 15.8 11.9 16.6 12.6 L 20.2 15.8"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        {...round}
      />
      <Circle cx={15.6} cy={8.2} r={1.5} fill="none" stroke={color} strokeWidth={1.4} />
    </Svg>
  );
}

/** A video camera: a rounded body with a lens and a hood. */
export function VideoIcon({ color, size }: AskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={2.8}
        y={5}
        width={13.6}
        height={14}
        rx={4}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Circle cx={10.6} cy={9.6} r={1.6} fill="none" stroke={color} strokeWidth={1.4} />
      <Path
        d="M 16.4 10.4 L 19.6 8.2 Q 21 7.3 21 9 V 15 Q 21 16.7 19.6 15.8 L 16.4 13.6"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        {...round}
      />
    </Svg>
  );
}

/** Send: an arrow pointing up. */
export function SendIcon({ color, size }: AskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 12 19.5 V 5 M 5.8 11 L 12 4.8 L 18.2 11"
        fill="none"
        stroke={color}
        strokeWidth={2.1}
        {...round}
      />
    </Svg>
  );
}

/** A cross, for taking an attachment out. */
export function CloseIcon({ color, size }: AskIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 6.5 6.5 L 17.5 17.5 M 17.5 6.5 L 6.5 17.5"
        stroke={color}
        strokeWidth={2.2}
        {...round}
      />
    </Svg>
  );
}
