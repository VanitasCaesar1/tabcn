/** Seek's line icons, 24-unit box, 1.8 stroke, round caps. */
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
}

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function BackIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 19 12 H 5 M 11 5.5 L 4.5 12 L 11 18.5"
        stroke={color}
        strokeWidth={1.9}
        {...line}
      />
    </Svg>
  );
}

export function ShareIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={18} cy={5.5} r={2.6} stroke={color} strokeWidth={1.7} fill="none" />
      <Circle cx={6} cy={12} r={2.6} stroke={color} strokeWidth={1.7} fill="none" />
      <Circle cx={18} cy={18.5} r={2.6} stroke={color} strokeWidth={1.7} fill="none" />
      <Path
        d="M 8.3 10.8 L 15.7 6.7 M 8.3 13.2 L 15.7 17.3"
        stroke={color}
        strokeWidth={1.7}
        {...line}
      />
    </Svg>
  );
}

export function BookmarkIcon({
  color = '#ffffff',
  size = 20,
  filled,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 6.5 4.5 Q 6.5 3 8 3 H 16 Q 17.5 3 17.5 4.5 V 20.5 L 12 16.5 L 6.5 20.5 Z"
        stroke={color}
        strokeWidth={1.7}
        fill={filled ? color : 'none'}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ThumbIcon({
  color = '#ffffff',
  size = 20,
  filled,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 7.5 10.5 L 11 3.8 Q 13.6 3.9 13.4 6.6 L 13 9.5 H 18.4 Q 20.6 9.6 20.2 11.8 L 18.9 18.4 Q 18.5 20.2 16.6 20.2 H 7.5 Z"
        stroke={color}
        strokeWidth={1.7}
        fill={filled ? color : 'none'}
        strokeLinejoin="round"
      />
      <Path d="M 3.8 10.5 H 7.5 V 20.2 H 3.8 Z" stroke={color} strokeWidth={1.7} {...line} />
    </Svg>
  );
}

export function RefreshIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 19.5 12 A 7.5 7.5 0 1 1 15.6 5.4" stroke={color} strokeWidth={1.8} {...line} />
      <Path d="M 15.2 2 L 16 5.6 L 12.4 6.6" stroke={color} strokeWidth={1.8} {...line} />
    </Svg>
  );
}

export function CloseIcon({ color = '#ffffff', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 6 6 L 18 18 M 18 6 L 6 18" stroke={color} strokeWidth={1.9} {...line} />
    </Svg>
  );
}

export function ArrowRightIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 5 12 H 19 M 13 5.5 L 19.5 12 L 13 18.5"
        stroke={color}
        strokeWidth={1.9}
        {...line}
      />
    </Svg>
  );
}

export function ChevronIcon({ color = '#ffffff', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 9 5.5 L 15.5 12 L 9 18.5" stroke={color} strokeWidth={1.9} {...line} />
    </Svg>
  );
}

export function FilmFrameIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 7 4 H 17 Q 20 4 20 7 V 17 Q 20 20 17 20 H 7 Q 4 20 4 17 V 7 Q 4 4 7 4 Z M 8.2 4 V 20 M 15.8 4 V 20 M 4 9 H 8.2 M 4 15 H 8.2 M 15.8 9 H 20 M 15.8 15 H 20"
        stroke={color}
        strokeWidth={1.7}
        {...line}
      />
    </Svg>
  );
}

export function MagnifierIcon({ color = '#ffffff', size = 64 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={10.4} cy={10.4} r={6.4} stroke={color} strokeWidth={1.5} fill="none" />
      <Path d="M 15.2 15.2 L 19.8 19.8" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}

/** Three dots in a row: "more". */
export function MoreIcon({ color = '#ffffff', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5.5} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={18.5} cy={12} r={1.7} fill={color} />
    </Svg>
  );
}

/** A four-pointed spark with long, thin points. */
export function sparkPath(cx: number, cy: number, r: number) {
  const k = r * 0.14;
  return `M ${cx} ${cy - r} Q ${cx + k} ${cy - k} ${cx + r} ${cy} Q ${cx + k} ${cy + k} ${cx} ${cy + r} Q ${cx - k} ${cy + k} ${cx - r} ${cy} Q ${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
}

/** Seek's mark: three sparks in one blue-to-violet gradient. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Defs>
        <SvgGradient id="seekMark" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#2f6bff" />
          <Stop offset="0.55" stopColor="#4a4dff" />
          <Stop offset="1" stopColor="#8a3dff" />
        </SvgGradient>
      </Defs>
      <Path d={sparkPath(12, 17, 10.5)} fill="url(#seekMark)" />
      <Path d={sparkPath(23.5, 7.5, 5.2)} fill="url(#seekMark)" />
      <Path d={sparkPath(24, 22.5, 3.6)} fill="url(#seekMark)" />
    </Svg>
  );
}
