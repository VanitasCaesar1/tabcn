/**
 * Icons for the Search Dock design, drawn from Pinterest's App Store screenshots (iPhone,
 * 2.687 px per pt). Pass them as `tabBarIcon` in your screen options. Each one draws in a
 * 40-unit box that the design renders at 32 pt, so 1 unit = 0.8 pt.
 *
 * Measured: the filled house is 23.4 x 24.4 pt, with rounded roof, eaves and base and a
 * smile cut out near the bottom (8.5 pt wide, 2.1 pt thick). The magnifier is 23 pt across
 * with a 2.1 pt stroke and a square-ended handle. The avatar is a 25.7 pt circle of the
 * user's photo with no ring.
 *
 * Only the active Home (filled) and the inactive magnifier and avatar appear in the
 * screenshots. The other states are inferred: Home turns into an outline house with the
 * same smile, the magnifier gets a heavier stroke, and the avatar gets a 2 pt ring.
 */
import { Image, type ImageSourcePropType, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Mask, Path, Rect } from 'react-native-svg';
import type { TabIconProps } from 'react-native-tabcn';

/** The house outline, a rounded pentagon traced over the screenshot. */
const HOUSE =
  'M10.7 34.6A5.2 5.2 0 0 1 5.5 29.4L5.5 15.92A2.6 2.6 0 0 1 6.51 13.87L17.79 5.11A3.6 3.6 0 0 1 22.21 5.11L33.49 13.87A2.6 2.6 0 0 1 34.5 15.92L34.5 29.4A5.2 5.2 0 0 1 29.3 34.6Z';
/** The same house, 1.3 units smaller all round: the centre line of the outline glyph. */
const HOUSE_LINE =
  'M10.7 33.3A3.9 3.9 0 0 1 6.8 29.4L6.8 15.92A1.3 1.3 0 0 1 7.3 14.9L18.59 6.14A2.3 2.3 0 0 1 21.41 6.14L32.7 14.9A1.3 1.3 0 0 1 33.2 15.92L33.2 29.4A3.9 3.9 0 0 1 29.3 33.3Z';
/** The smile: a shallow arc with round ends. */
const SMILE = 'M16 25.4Q20 27.2 24 25.4';
const STROKE = 2.6;

/**
 * Home. Focused: the filled house with the smile cut out, so the tile shows through it.
 * Not focused: the house in outline with the smile drawn in.
 */
export function HomeIcon({ color, size, focused }: TabIconProps) {
  if (!focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path d={HOUSE_LINE} stroke={color} strokeWidth={STROKE} fill="none" />
        <Path d={SMILE} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <Mask
          id="search-dock-home-smile"
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={40}
          height={40}
        >
          <Rect x={0} y={0} width={40} height={40} fill="#ffffff" />
          <Path d={SMILE} stroke="#000000" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        </Mask>
      </Defs>
      <G mask="url(#search-dock-home-smile)">
        <Path d={HOUSE} fill={color} />
      </G>
    </Svg>
  );
}

/**
 * Search: a ring and a square-ended handle toward the bottom right. The design draws it at
 * the left of the search field. Focused, the stroke is heavier (inferred).
 */
export function SearchIcon({ color, size, focused }: TabIconProps) {
  const width = focused ? 3.4 : STROKE;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={18.9} cy={18.7} r={11.84} stroke={color} strokeWidth={width} fill="none" />
      <Path d="M27.27 27.07L34.2 34" stroke={color} strokeWidth={width} fill="none" />
    </Svg>
  );
}

/** The avatar circle: 32.1 units (25.7 pt) across, centred in the box. */
const AVATAR_R = 16.05;
/** The inferred focus ring: 2 pt wide (2.5 units), with a 1 pt gap round the photo. */
const RING_R = 18.7;
const RING_WIDTH = 2.5;

/**
 * A placeholder for the user's photo: a figure with long dark hair and red sunglasses in a
 * white top, on a pale grey-pink wall, after the colours in the app's screenshot (not a
 * likeness). Use `createAvatarIcon` for a real photo. Focused, a 2 pt ring in the tab's
 * colour circles it.
 */
export function AvatarIcon({ color, size, focused }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <ClipPath id="search-dock-avatar-clip">
          <Circle cx={20} cy={20} r={AVATAR_R} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#search-dock-avatar-clip)">
        <Rect x={0} y={0} width={40} height={40} fill="#ddd5d4" />
        {/* Hair, falling past the shoulders. */}
        <Path
          d="M12.2 34C11.9 26 12.4 18 13.8 13.6C15.3 9 18.6 7.4 21.6 7.6C25.1 7.9 27.6 10.6 28.3 14.6C29 18.8 29.6 26 30 34Z"
          fill="#231a19"
        />
        {/* Top and shoulders. */}
        <Path d="M8 40C8.6 33.2 12.6 30 17.4 29.4H24.6C29.4 30 33.4 33.2 34 40Z" fill="#eee8e4" />
        {/* Neck and face. */}
        <Rect x={18.6} y={24} width={4.6} height={6.2} rx={1.6} fill="#c1907a" />
        <Path
          d="M16.4 16.4C16.4 12.4 18.4 10.6 21 10.6C23.8 10.6 25.6 12.6 25.6 16.4C25.6 21.4 23.6 25.4 21 25.4C18.4 25.4 16.4 21.4 16.4 16.4Z"
          fill="#cc9c85"
        />
        {/* Sunglasses. */}
        <Path
          d="M16.6 15.6H20.4V17.4C20.4 18.6 19.6 19.3 18.5 19.3C17.4 19.3 16.6 18.6 16.6 17.4Z"
          fill="#c4474e"
        />
        <Path
          d="M21.6 15.6H25.4V17.4C25.4 18.6 24.6 19.3 23.5 19.3C22.4 19.3 21.6 18.6 21.6 17.4Z"
          fill="#c4474e"
        />
        <Rect x={20.2} y={15.6} width={1.6} height={0.7} fill="#8f2f35" />
      </G>
      {focused ? (
        <Circle cx={20} cy={20} r={RING_R} stroke={color} strokeWidth={RING_WIDTH} fill="none" />
      ) : null}
    </Svg>
  );
}

/**
 * Builds an avatar tab icon from a photo, in the same 25.7 pt circle as the app, with the
 * same focus ring:
 * `tabBarIcon: createAvatarIcon(require('./me.jpg'))` or `createAvatarIcon({ uri })`.
 */
export function createAvatarIcon(source: ImageSourcePropType) {
  return function PhotoAvatarIcon({ color, size, focused }: TabIconProps) {
    const unit = size / 40;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={source}
          resizeMode="cover"
          style={{
            width: AVATAR_R * 2 * unit,
            height: AVATAR_R * 2 * unit,
            borderRadius: AVATAR_R * unit,
          }}
        />
        {focused ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: (RING_R * 2 + RING_WIDTH) * unit,
              height: (RING_R * 2 + RING_WIDTH) * unit,
              borderRadius: (RING_R + RING_WIDTH / 2) * unit,
              borderWidth: RING_WIDTH * unit,
              borderColor: color,
            }}
          />
        ) : null}
      </View>
    );
  };
}
