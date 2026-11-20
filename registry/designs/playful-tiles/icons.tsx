/** Sticker-style icons drawn for the Playful Tiles design. They keep their own colours. */
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

export function BirdhouseIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M8 14H24V25Q24 28 21 28H11Q8 28 8 25Z" fill="#ffc800" />
      <Path d="M8 25H24Q24 28 21 28H11Q8 28 8 25Z" fill="#e5a800" />
      <Path
        d="M3.4 15.2 15 5.4Q16 4.6 17 5.4L28.6 15.2Q29.4 16.4 28 16.8L16 9.6 4 16.8Q2.6 16.4 3.4 15.2Z"
        fill="#ff4b4b"
      />
      <Circle cx={16} cy={17.6} r={3} fill="#a5560b" />
      <Rect x={13.6} y={22.4} width={4.8} height={1.6} rx={0.8} fill="#a5560b" />
    </Svg>
  );
}

export function ChestIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={4} y={7} width={24} height={19} rx={2.4} fill="#ffb020" />
      <Rect x={4} y={7} width={4.4} height={19} rx={1.6} fill="#e08a00" />
      <Rect x={23.6} y={7} width={4.4} height={19} rx={1.6} fill="#e08a00" />
      <Rect x={9.6} y={11} width={12.8} height={11} rx={1.4} fill="#b3611b" />
      <Circle cx={16} cy={15.4} r={1.8} fill="#ffc94a" />
      <Path d="M15 16.4H17L16.6 19.4H15.4Z" fill="#ffc94a" />
    </Svg>
  );
}

export function CupIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M6 7Q11 4.6 16 7.4 21 4.6 26 7 27.4 17.4 16 22 4.6 17.4 6 7Z" fill="#c8763a" />
      <Path d="M16 7.4Q21 4.6 26 7 27.4 17.4 16 22Z" fill="#b0622a" />
      <Rect x={14} y={21} width={4} height={4} fill="#a45a24" />
      <Rect x={10} y={25} width={12} height={3} rx={1.5} fill="#8e4a1a" />
    </Svg>
  );
}

export function HeartChatIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M7 5H25Q28 5 28 8V20Q28 23 25 23H19L16 27 13 23H7Q4 23 4 20V8Q4 5 7 5Z"
        fill="#ff86d0"
      />
      <Path
        d="M16 19.4C11 16 9.8 13.6 10.6 11.6 11.6 9.4 14.6 9.6 16 11.8 17.4 9.6 20.4 9.4 21.4 11.6 22.2 13.6 21 16 16 19.4Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

export function BirdIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M5 17Q9 9 18 9.6 25 10 27.6 15.4 25 22.4 16.6 22.4 9.6 22.4 5 17Z" fill="#1cb0f6" />
      <Path d="M18 9.6Q25 10 27.6 15.4 24.6 18.6 20 17.4 17.6 13.6 18 9.6Z" fill="#2bd67b" />
      <Path d="M9 15Q12.6 12 16 15.6 12 18.4 9 15Z" fill="#7b5cff" />
      <Circle cx={22.6} cy={13.6} r={2.6} fill="#ffffff" />
      <Circle cx={23.2} cy={13.8} r={1.3} fill="#1f2a44" />
      <Path d="M3 16.4H7" stroke="#1f6ff6" strokeWidth={2.4} strokeLinecap="round" />
      <Ellipse cx={18} cy={24} rx={2.2} ry={1.4} fill="#7b5cff" />
    </Svg>
  );
}

export function MoreIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={13} fill="#ce82ff" />
      <Circle cx={10.4} cy={16} r={1.9} fill="#ffffff" />
      <Circle cx={16} cy={16} r={1.9} fill="#ffffff" />
      <Circle cx={21.6} cy={16} r={1.9} fill="#ffffff" />
    </Svg>
  );
}
