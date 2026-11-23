/**
 * Icons for the Pill + Plus design, drawn from the corner app (App Store, v5.22).
 * Pass them as `tabBarIcon` in your screen options. Each draws in a 40-unit box; the
 * design renders that box at 28 pt, so 1 unit = 0.7 pt.
 *
 * Measured on the app at 2.59 px/pt: the magnifier is 20.5 pt across with a 1.9 pt
 * stroke, the folded map 23.6 x 20.5 pt with a 1.9 pt stroke, and the avatar a
 * 21.4 x 27.2 pt upright stadium (the user's photo, no ring).
 */
import { Image, type ImageSourcePropType, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** The magnifier: ring and handle with round caps. */
export function SearchIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18.15} cy={17.9} r={11.65} stroke={color} strokeWidth={2.7} fill="none" />
      <Path
        d="M 26.4 26.15 L 32.95 32.7"
        stroke={color}
        strokeWidth={2.7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** The folded map: three panels in a zigzag, outlined. */
export function MapIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 4.7 10.7 L 14.4 6.7 L 25.6 10.7 L 35.3 6.7 L 35.3 29.3 L 25.6 33.3 L 14.4 29.3 L 4.7 33.3 Z M 14.4 6.7 L 14.4 29.3 M 25.6 10.7 L 25.6 33.3"
        stroke={color}
        strokeWidth={2.65}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** The avatar stadium inside the 40-unit box: 30.6 x 38.9 units (21.4 x 27.2 pt). */
const AVATAR = { x: 4.7, y: 0.55, width: 30.6, height: 38.9, rx: 15.3 };

/** Width of the rim drawn inside the avatar while its tab is active, in the box's units. */
const RIM = 2.6;

/**
 * A placeholder for the user's photo, after the one in the app's screenshot: a warm room
 * with a dark sofa, candles and a vase of flowers. Use `createAvatarIcon` for a real photo.
 * A photo can't change colour, so while its tab is active a rim in the active colour runs
 * inside its edge; without it nothing in the bar would show that the tab is selected.
 */
export function AvatarIcon({ size, focused, color }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <ClipPath id="pill-plus-avatar-clip">
          <Rect {...AVATAR} />
        </ClipPath>
        <LinearGradient
          id="pill-plus-avatar-wall"
          x1="0"
          y1="0"
          x2="0"
          y2="26"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#cfb6a0" />
          <Stop offset="1" stopColor="#c2a78e" />
        </LinearGradient>
      </Defs>
      <Rect {...AVATAR} fill="url(#pill-plus-avatar-wall)" />
      <Path clipPath="url(#pill-plus-avatar-clip)" d="M 4 3.5 H 10 V 14 H 4 Z" fill="#d7c5b2" />
      <Rect
        clipPath="url(#pill-plus-avatar-clip)"
        x={3.5}
        y={14.3}
        width={19}
        height={12}
        rx={1.2}
        fill="#66605f"
      />
      <Path
        clipPath="url(#pill-plus-avatar-clip)"
        d="M 3.5 25 H 36.5 V 32 H 3.5 Z"
        fill="#93806c"
      />
      <Path
        clipPath="url(#pill-plus-avatar-clip)"
        d="M 3.5 32 H 36.5 V 37.4 H 3.5 Z"
        fill="#b9a68f"
      />
      <Path
        clipPath="url(#pill-plus-avatar-clip)"
        d="M 3.5 37.4 H 36.5 V 40 H 3.5 Z"
        fill="#85735f"
      />
      <Rect x={22.9} y={17.4} width={1} height={11.1} rx={0.5} fill="#efe9e0" />
      <Rect x={27.8} y={16.8} width={1} height={11.7} rx={0.5} fill="#efe9e0" />
      <Rect
        clipPath="url(#pill-plus-avatar-clip)"
        x={30.6}
        y={21.2}
        width={4}
        height={8.3}
        rx={0.6}
        fill="#e3d9cc"
      />
      <Circle clipPath="url(#pill-plus-avatar-clip)" cx={33.6} cy={18} r={2.4} fill="#8d8b6c" />
      <Circle clipPath="url(#pill-plus-avatar-clip)" cx={30.6} cy={15.6} r={2.1} fill="#d8b05a" />
      <Circle clipPath="url(#pill-plus-avatar-clip)" cx={33.2} cy={13.4} r={1.9} fill="#c9a24f" />
      <Circle cx={12.2} cy={29.9} r={2.1} fill="#d79a44" />
      {focused ? (
        <Rect
          x={AVATAR.x + RIM / 2}
          y={AVATAR.y + RIM / 2}
          width={AVATAR.width - RIM}
          height={AVATAR.height - RIM}
          rx={AVATAR.rx - RIM / 2}
          stroke={color}
          strokeWidth={RIM}
          fill="none"
        />
      ) : null}
    </Svg>
  );
}

/**
 * Builds an avatar tab icon from a photo, shown in the same upright stadium as the app.
 * `tabBarIcon: createAvatarIcon(require('./me.jpg'))` or `createAvatarIcon({ uri })`.
 */
export function createAvatarIcon(source: ImageSourcePropType) {
  return function PhotoAvatarIcon({ size, focused, color }: TabIconProps) {
    const unit = size / 40;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={source}
          resizeMode="cover"
          style={{
            width: AVATAR.width * unit,
            height: AVATAR.height * unit,
            borderRadius: AVATAR.rx * unit,
            // The active rim, as on the placeholder.
            borderWidth: focused ? RIM * unit : 0,
            borderColor: color,
          }}
        />
      </View>
    );
  };
}

/** From the older layout (a People tab); the current app has no People tab. */
export function PeopleIcon({ color, size }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M 12.1 5.2 c -1.1 0.2 -1.4 0.3 -2 0.6 -1.5 0.7 -3 2.2 -3.4 3.4 -0.7 1.9 -0.8 3 -0.4 4.5 0.4 1.4 1 2.5 2 3.5 0.7 0.7 2.3 1.5 3.1 1.6 0.3 0 0.6 0.1 0.7 0.1 1.1 0.3 3.6 -0.3 4.8 -1.1 0.9 -0.6 2 -1.9 2.3 -2.7 0.1 -0.2 0.2 -0.4 0.3 -0.5 0.2 -0.2 0.2 -0.4 0.4 -1.5 0.3 -1.6 -0.2 -3.7 -1.1 -5 -0.4 -0.6 -1.2 -1.4 -1.5 -1.6 -0.2 -0.1 -0.4 -0.3 -0.5 -0.4 -0.1 -0.1 -0.4 -0.2 -0.6 -0.3 -0.2 -0.1 -0.5 -0.2 -0.7 -0.3 -0.6 -0.3 -2.7 -0.6 -3.4 -0.4Zm 1.8 2.9 c 2.9 0.7 4.1 3.7 2.6 6.3 -0.4 0.7 -1.2 1.4 -1.7 1.6 -1.2 0.4 -1.2 0.4 -1.9 0.3 -1.9 -0.1 -3.4 -1.2 -3.9 -3.1 -0.6 -2.2 0.8 -4.6 3.2 -5.2 0.4 -0.1 1.3 -0.1 1.7 0ZM 28.2 8.1 c -2.3 0.7 -4 2.9 -4 5.2 0 1.5 0.5 2.8 1.4 3.9 0.9 1.1 2.7 1.9 4.2 1.9 0.6 0 2 -0.3 2.3 -0.5 0.1 -0.1 0.4 -0.2 0.6 -0.3 1.2 -0.6 2.4 -2.3 2.6 -3.8 0.2 -1 0.2 -1 0 -2 -0.3 -1.7 -1.3 -3.1 -2.6 -3.9 -1.2 -0.7 -3.2 -1 -4.5 -0.5Zm 2.7 2.8 c 0.9 0.4 1.6 1.6 1.6 2.6 0 0.2 -0.3 1.1 -0.4 1.4 -0.6 1.1 -2.4 1.6 -3.6 0.9 -0.4 -0.2 -1.1 -0.9 -1.3 -1.4 -0.2 -0.3 -0.2 -0.5 -0.2 -1 0 -0.6 0 -0.6 0.3 -1.2 0.2 -0.5 0.4 -0.7 0.7 -1 0.2 -0.2 0.4 -0.4 0.4 -0.4 0 0 0.2 -0.1 0.4 -0.1 0.6 -0.2 1.5 -0.2 2.1 0.1ZM 5.6 21.9 c -1.2 0.3 -1.4 0.3 -1.8 0.6 -0.9 0.6 -1.7 1.6 -1.9 2.5 -0.1 0.5 -0.1 1.8 0 2.4 0.2 1 1 2.8 1.5 3.4 1.2 1.3 2.1 1.9 3.1 2.4 0.2 0.1 0.6 0.3 0.8 0.4 0.2 0.1 0.5 0.2 0.6 0.2 0.2 0 0.5 0.1 0.8 0.2 0.4 0.1 0.8 0.2 1.5 0.3 0.5 0.1 1.3 0.1 1.7 0.2 1.3 0.2 4.9 -0.2 5.5 -0.5 0.2 -0.1 0.3 -0.1 0.4 -0.1 0.1 0 0.5 -0.1 0.9 -0.3 0.4 -0.2 0.8 -0.3 0.8 -0.3 0.1 0 1.6 -1.1 2 -1.4 1.4 -1.2 2.3 -2.8 2.7 -4.8 0.1 -0.7 0 -2 -0.2 -2.5 -0.5 -1.1 -1.3 -1.9 -2.6 -2.4 -0.6 -0.3 -0.6 -0.3 -8.1 -0.3 -4.1 0 -7.6 0 -7.7 0Zm 15.1 3.1 c 0.5 0.4 0.6 0.6 0.6 1.3 0 1 -0.3 1.9 -1.1 2.9 -0.3 0.4 -0.4 0.5 -1.2 1.1 -2.4 1.7 -7.7 2 -11.1 0.5 -1 -0.4 -2.2 -1.4 -2.5 -2.1 -0.1 -0.2 -0.2 -0.5 -0.3 -0.6 -0.2 -0.2 -0.5 -1.3 -0.5 -1.7 0 -0.7 0.3 -1.3 0.9 -1.6 0.3 -0.1 0.4 -0.1 7.6 -0.1 7.3 0 7.3 0 7.7 0.3ZM 26 22 c -0.2 0.2 -0.2 0.2 0.2 0.9 0.1 0.3 0.3 0.7 0.3 0.9 0 0.2 0.2 0.5 0.3 0.6 0.2 0.2 0.2 0.2 4.2 0.3 4 0 4 0 4.2 0.3 0.2 0.2 0.2 0.3 0.2 0.6 0 0.4 -0.2 1.1 -0.4 1.3 -0.1 0.1 -0.2 0.2 -0.2 0.4 -0.7 1.4 -4.3 2.2 -6.9 1.6 -0.4 -0.1 -0.8 -0.2 -0.8 -0.2 -0.2 0 -0.5 0.3 -0.5 0.7 0 0.2 -0.1 0.5 -0.2 0.7 -0.3 0.7 -0.3 1.1 -0.1 1.3 0.1 0.1 0.8 0.2 1.9 0.4 1 0.2 3 0.1 4.3 -0.1 2.8 -0.6 4.6 -1.9 5.5 -4.1 0.4 -1 0.4 -1.3 0.4 -2.2 0 -1 -0.3 -1.6 -1.1 -2.4 -0.5 -0.5 -0.6 -0.6 -1.1 -0.8 -0.6 -0.2 -0.6 -0.2 -5.2 -0.2 -4.6 0 -4.6 0 -4.8 0.1Z"
        fill={color}
      />
    </Svg>
  );
}
