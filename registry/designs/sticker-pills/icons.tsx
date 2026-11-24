/**
 * Glossy sticker icons for the Sticker Pills design: a sun, a chat bubble, a stack of photos
 * and a smiley. Each has a white die-cut edge, a soft shadow and a highlight, and draws its own
 * colours (the `color` a tab bar passes is ignored). Pass them as `tabBarIcon` in your screen
 * options.
 */
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** The sticker's die-cut edge, in the 48-unit box the icons are drawn in. */
const EDGE = 5;
const SHADOW = 'rgba(0, 0, 0, 0.35)';

const PETALS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { x: 24 + Math.cos(a) * 14.5, y: 24 + Math.sin(a) * 14.5 };
});

export function SunIcon({ size }: TabIconProps) {
  const petals = (fill: string, stroke?: string) =>
    PETALS.map((p) => (
      <Circle
        key={`${p.x}-${p.y}`}
        cx={p.x}
        cy={p.y}
        r={5.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? EDGE : 0}
      />
    ));
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <RadialGradient id="sun-petal" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffd21f" />
          <Stop offset="1" stopColor="#ff7a00" />
        </RadialGradient>
        <RadialGradient id="sun-core" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#fff59a" />
          <Stop offset="0.5" stopColor="#ffd21f" />
          <Stop offset="1" stopColor="#ff9500" />
        </RadialGradient>
      </Defs>
      <G translateY={1.5}>
        {petals(SHADOW, SHADOW)}
        <Circle cx={24} cy={24} r={13} fill={SHADOW} />
      </G>
      {petals('#ffffff', '#ffffff')}
      <Circle cx={24} cy={24} r={13 + EDGE / 2} fill="#ffffff" />
      {petals('url(#sun-petal)')}
      <Circle cx={24} cy={24} r={13} fill="url(#sun-core)" />
      <Ellipse cx={19.5} cy={18} rx={5.5} ry={3.2} fill="#ffffff" opacity={0.6} />
    </Svg>
  );
}

const BUBBLE = 'M18 8 H30 A13.5 13.5 0 0 1 30 35 H21 L11.5 41 L13.5 33.2 A13.5 13.5 0 0 1 18 8 Z';

export function ChatIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="chat-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8df06c" />
          <Stop offset="1" stopColor="#279a2c" />
        </LinearGradient>
      </Defs>
      <Path
        d={BUBBLE}
        translateY={1.5}
        fill={SHADOW}
        stroke={SHADOW}
        strokeWidth={EDGE}
        strokeLinejoin="round"
      />
      <Path d={BUBBLE} fill="#ffffff" stroke="#ffffff" strokeWidth={EDGE} strokeLinejoin="round" />
      <Path d={BUBBLE} fill="url(#chat-fill)" />
      <Ellipse cx={20} cy={13} rx={9} ry={3.2} fill="#ffffff" opacity={0.45} />
      <Circle cx={16} cy={21.5} r={2.7} fill="#ffffff" />
      <Circle cx={24} cy={21.5} r={2.7} fill="#ffffff" />
      <Circle cx={32} cy={21.5} r={2.7} fill="#ffffff" />
    </Svg>
  );
}

export function PhotosIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="photo-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffb86b" />
          <Stop offset="1" stopColor="#ff4f6d" />
        </LinearGradient>
      </Defs>
      {/* The photo behind, turned the other way. */}
      <G rotation={10} origin="24, 24">
        <Rect x={9} y={9} width={32} height={29} rx={4} fill={SHADOW} translateY={1.5} />
        <Rect x={9} y={9} width={32} height={29} rx={4} fill="#eef0f5" />
      </G>
      <G rotation={-8} origin="24, 24">
        <Rect x={6} y={10} width={33} height={30} rx={4} fill={SHADOW} translateY={1.5} />
        <Rect x={6} y={10} width={33} height={30} rx={4} fill="#ffffff" />
        <Rect x={9.5} y={13.5} width={26} height={19} rx={2} fill="url(#photo-sky)" />
        <Circle cx={22.5} cy={22} r={4} fill="#ffe27a" />
        <Path d="M9.5 32.5 V27.5 L15 23.5 L21 28.5 L27 24.5 L35.5 30 V32.5 Z" fill="#c22e4e" />
      </G>
    </Svg>
  );
}

export function SmileyIcon({ size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <RadialGradient id="smiley-face" cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#fff38a" />
          <Stop offset="0.55" stopColor="#ffcc2e" />
          <Stop offset="1" stopColor="#f59a0a" />
        </RadialGradient>
      </Defs>
      <Circle cx={24} cy={25.5} r={18 + EDGE / 2} fill={SHADOW} />
      <Circle cx={24} cy={24} r={18 + EDGE / 2} fill="#ffffff" />
      <Circle cx={24} cy={24} r={18} fill="url(#smiley-face)" />
      <Ellipse cx={18} cy={21} rx={2.6} ry={3.6} fill="#4a2a06" />
      <Ellipse cx={30} cy={21} rx={2.6} ry={3.6} fill="#4a2a06" />
      <Ellipse cx={13.5} cy={28} rx={3.4} ry={2.2} fill="#ff6f8a" opacity={0.45} />
      <Ellipse cx={34.5} cy={28} rx={3.4} ry={2.2} fill="#ff6f8a" opacity={0.45} />
      <Path
        d="M16.5 29 Q24 36.5 31.5 29"
        fill="none"
        stroke="#4a2a06"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <Ellipse cx={18} cy={13.5} rx={7} ry={3.2} fill="#ffffff" opacity={0.55} />
    </Svg>
  );
}
