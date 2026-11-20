/** Sticker icons drawn for the Gradient Stickers design (white die-cut outline). */
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'tabcn';

const outline = { stroke: '#ffffff', strokeWidth: 2.6, strokeLinejoin: 'round' as const };

export function HouseIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G {...outline}>
        <Path d="M8 18H32V33Q32 35 30 35H10Q8 35 8 33Z" fill="#ffa53a" />
        <Path d="M4 19.6 19 6.6Q20 5.8 21 6.6L36 19.6 33 21.6 20 10.6 7 21.6Z" fill="#c9682b" />
      </G>
      <Path d="M16.6 35V27.6A3.4 3.4 0 0 1 23.4 27.6V35Z" fill="#e8740f" />
      <Rect x={28} y={7} width={3.4} height={8} fill="#c9682b" />
    </Svg>
  );
}

export function MapIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G {...outline}>
        <Rect x={9} y={6} width={25} height={28} rx={2} fill="#f2f2ec" />
        <Rect x={5} y={4} width={5} height={30} rx={2.5} fill="#e9e6da" />
      </G>
      <Path d="M13 10H30V30H13Z" fill="#9ed7ef" />
      <Path d="M22 10Q19 18 24 21T21 30H30V16Q26 16 22 10Z" fill="#2f7d4f" />
      <Path d="M13 24Q17 20 20 24T22 30H13Z" fill="#3fa0d8" />
      <Circle cx={7.5} cy={32} r={2.4} fill="#8a7f66" />
    </Svg>
  );
}

export function ShopIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G {...outline}>
        <Rect x={7} y={18} width={26} height={16} rx={3} fill="#dad7d7" />
        <Path d="M5 14Q5 8 11 8H29Q35 8 35 14V18Q35 21 32 21H8Q5 21 5 18Z" fill="#f2737a" />
      </G>
      <Rect x={12} y={13} width={16} height={3} rx={1.5} fill="#ffffff" opacity={0.9} />
      <Rect x={10} y={24} width={20} height={6} rx={2} fill="#f3f1f1" />
    </Svg>
  );
}

export function BagIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G {...outline}>
        <Path d="M14 11V8Q14 5 17 5H23Q26 5 26 8V11" fill="none" stroke="#3d4c7a" strokeWidth={3} />
        <Rect x={5} y={11} width={30} height={23} rx={4} fill="#86aef0" />
      </G>
      <Rect x={5} y={11} width={30} height={6} rx={3} fill="#6f97df" />
      <Path
        d="M20 30C13.4 25.6 12.6 22.4 13.8 20.2 15 18 18.4 18.2 20 20.6 21.6 18.2 25 18 26.2 20.2 27.4 22.4 26.6 25.6 20 30Z"
        fill="#f24e5c"
        stroke="#ffffff"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

export function CatIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G {...outline}>
        <Path
          d="M6 16 7.4 5.6 15 10.4Q20 9 25 10.4L32.6 5.6 34 16Q36 21 34 26 30 34 20 34 10 34 6 26 4 21 6 16Z"
          fill="#f4ead8"
        />
      </G>
      <Path d="M8.4 8.6 10 13.4 13.6 11.2ZM31.6 8.6 30 13.4 26.4 11.2Z" fill="#6b4a3a" />
      <Ellipse cx={20} cy={27} rx={7.4} ry={5.4} fill="#7a5646" />
      <Circle cx={14} cy={21} r={3.2} fill="#1b1b1f" />
      <Circle cx={26} cy={21} r={3.2} fill="#1b1b1f" />
      <Circle cx={15} cy={20} r={1.1} fill="#ffffff" />
      <Circle cx={27} cy={20} r={1.1} fill="#ffffff" />
      <Path d="M18.6 25.6H21.4L20 27.2Z" fill="#f08a9a" />
      <Path
        d="M20 27.2Q18.6 29.4 17 28.6M20 27.2Q21.4 29.4 23 28.6"
        stroke="#ffffff"
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}
