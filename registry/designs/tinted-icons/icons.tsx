/**
 * Icons for the Tinted Icons design: plain monoline outlines (a map pin, a speech bubble, a
 * camera, two people, a play triangle), drawn by hand over Snapchat's App Store screenshots.
 * Each sits in a 40-unit box meant to render at 30 pt (0.75 pt per unit), placed so its
 * centre lands where the app's does in a 75 pt slot. At that size the glyphs come out at the
 * measured 19 x 22 pt pin, 18 x 20.5 pt bubble, 25 x 21 pt camera, 27.5 x 19 pt people and
 * 17.5 x 20.5 pt triangle, with the app's even 1.9 pt stroke and round caps and joins.
 * Active and inactive use the same outline; only the colour changes. Pass them as `tabBarIcon`.
 */
import type { ReactNode } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** 1.84 pt at 30 pt: the 4.7 px stroke measured at 2.58 px per pt. */
const STROKE = 2.45;

function Outline({ size, color, children }: TabIconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <G
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </G>
    </Svg>
  );
}

/** Map: a location pin with a small ring inside its head. */
export function MapIcon(props: TabIconProps) {
  return (
    <Outline {...props}>
      <Path d="M19.89 32.72C15.5 30.39 8.52 24.71 8.52 17.73A11.37 11.37 0 0 1 31.26 17.73C31.26 24.71 24.28 30.39 19.89 32.72Z" />
      <Circle cx={19.89} cy={17.78} r={3.93} />
    </Outline>
  );
}

/** Chat: a rounded-square speech bubble with a short tail at the bottom right. */
export function ChatIcon(props: TabIconProps) {
  return (
    <Outline {...props}>
      <Path d="M30.53 32.2L30.79 10.75A4.14 4.14 0 0 0 26.65 6.61H13.47A4.14 4.14 0 0 0 9.33 10.75V22.9A4.14 4.14 0 0 0 13.47 27.03H21.48Z" />
    </Outline>
  );
}

/** Camera: a soft, slightly bulging body with a raised hump on top and a round lens. */
export function CameraIcon(props: TabIconProps) {
  return (
    <Outline {...props}>
      <Path d="M6.27 16.95C6.27 13.33 7.82 11.52 10.92 11.26L12.47 11.01Q14.02 10.75 15.06 8.94L16.09 7.39Q16.87 6.61 18.16 6.61H23.33Q24.62 6.61 25.4 7.39L26.43 8.94Q27.46 10.75 29.02 11.01L30.57 11.26C33.67 11.52 35.4 13.33 35.4 16.95L35.6 26.26C35.6 30.91 33.67 32.46 28.5 32.72H12.99C7.82 32.46 6.01 30.91 6.01 26.26Z" />
      <Circle cx={20.74} cy={20.57} r={5.69} />
    </Outline>
  );
}

/** Stories (Friends): two people, a smaller head and shoulders on the left. */
export function StoriesIcon(props: TabIconProps) {
  return (
    <Outline {...props}>
      <Circle cx={10.18} cy={14.06} r={4.14} />
      <Path d="M3.98 28.58A6.72 6.72 0 0 1 16.13 25.22" />
      <Circle cx={27.66} cy={14.16} r={5.27} />
      <Path d="M18.25 31.94A9.46 9.46 0 0 1 37.07 31.94" />
    </Outline>
  );
}

/** Spotlight: a play triangle pointing right, its corners rounded by the stroke. */
export function SpotlightIcon(props: TabIconProps) {
  return (
    <Outline {...props}>
      <Path d="M10.74 6.87L31.42 19.02L10.74 31.17Z" />
    </Outline>
  );
}
