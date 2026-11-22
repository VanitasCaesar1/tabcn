/**
 * Icons for the Account Dock design: the status glyphs drawn inside its coloured status
 * circles, the sheet's check and plus, and three line tab icons (people, chats, bell) for the
 * demo, drawn by hand in a 40-unit box with a 3.4-unit round stroke. The tab icons work as any
 * screen's `tabBarIcon`.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** Only the colour and size are used, so these fit a tab's icon too. */
type IconProps = Pick<TabIconProps, 'color' | 'size'>;

const STROKE = 3.4;

/** Two people, the front one larger: members. */
export function PeopleIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={15} cy={13} r={6} stroke={color} strokeWidth={STROKE} fill="none" />
      <Path
        d="M 4 33 C 4 26 9 22 15 22 C 21 22 26 26 26 33 M 27 8 A 5.5 5.5 0 0 1 27 19 M 30 23 C 34 24 36 28 36 32"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Two overlapping speech bubbles: chats. */
export function ChatsIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 5 17 C 5 10 10 6 17 6 C 24 6 29 10 29 17 C 29 24 24 28 17 28 C 15 28 13 27.6 11.5 27 L 6 29 L 7.5 24 C 6 22 5 19.6 5 17 Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M 32.5 14 C 34.6 16 36 18.6 36 21.5 C 36 24 35 26.4 33.5 28 L 35 33 L 29.5 31 C 27.5 31.8 25.4 32 23 31.6"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** A bell: activity. */
export function BellIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 9 29 L 31 29 C 29 26.5 28.5 24 28.5 20 L 28.5 16.5 C 28.5 11.5 24.7 7.5 20 7.5 C 15.3 7.5 11.5 11.5 11.5 16.5 L 11.5 20 C 11.5 24 11 26.5 9 29 Z M 16.5 33 C 17.2 34.6 18.5 35.4 20 35.4 C 21.5 35.4 22.8 34.6 23.5 33"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** A tick: the current workspace, account or status. */
export function CheckIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 9 21 L 17 29 L 32 11"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** A plus: add a workspace. */
export function PlusIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 20 9 L 20 31 M 9 20 L 31 20"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** A chevron pointing to the trailing side: opens the status menu. Mirror it in RTL. */
export function ChevronIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 15 9 L 26 20 L 15 31"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Head and shoulders: online. Drawn solid, in white on the status colour. */
export function OnlineGlyph({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={20} cy={14} r={6.5} fill={color} />
      <Path d="M 8 32 C 8 25 13 22 20 22 C 27 22 32 25 32 32 Z" fill={color} />
    </Svg>
  );
}

/** Two bars: idle (paused). */
export function IdleGlyph({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 15 11 L 15 29 M 25 11 L 25 29"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** One bar: do not disturb. */
export function DndGlyph({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M 10 20 L 30 20" stroke={color} strokeWidth={6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** An eye struck through: invisible. */
export function InvisibleGlyph({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 5 20 C 9 13 14 10 20 10 C 26 10 31 13 35 20 C 31 27 26 30 20 30 C 14 30 9 27 5 20 Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={20} cy={20} r={4.5} fill={color} />
      <Path d="M 8 33 L 32 7" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}
