/**
 * Icons for Composer Dock: the four filled tab glyphs (Chats, Projects, Code, Artifacts), the
 * outline glyphs its hold menus use for recent items, and the attachment menu's glyphs.
 * Drawn on a 24-point grid with react-native-svg. Pass them as screen options:
 *
 * ```tsx
 * <Tabs.Screen name="index" options={{ title: 'Chat', tabBarIcon: ChatIcon }} />
 * ```
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

/** Two overlapping speech bubbles, filled. */
export function ChatIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 3.5c4.2 0 7.5 2.9 7.5 6.5s-3.3 6.5-7.5 6.5c-.9 0-1.8-.1-2.6-.4L4.2 17.4c-.6.2-1.1-.4-.9-.9l.9-2.4C3.1 12.9 2.5 11.5 2.5 10c0-3.6 3.3-6.5 7.5-6.5Z"
        fill={color}
      />
      <Path
        d="M19.3 10.4c1.4 1 2.2 2.4 2.2 4 0 1.1-.4 2.1-1.1 3l.7 1.9c.2.5-.3 1-.8.8l-2.4-.9c-.7.2-1.5.3-2.3.3-2.2 0-4.1-.9-5.2-2.3 4.6-.3 8.4-3 8.9-6.8Z"
        fill={color}
      />
    </Svg>
  );
}

/** A stack of trays, filled: two thin lids over a deep box. */
export function ProjectsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={3} width={12} height={1.8} rx={0.9} fill={color} />
      <Rect x={4.5} y={6.2} width={15} height={1.8} rx={0.9} fill={color} />
      <Path
        d="M3 11a1.6 1.6 0 0 1 1.6-1.6h14.8A1.6 1.6 0 0 1 21 11v7.4a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 18.4V11Zm6 2.2a.9.9 0 0 0 0 1.8h6a.9.9 0 0 0 0-1.8H9Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** A rounded square with angle brackets cut out of it. */
export function CodeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.5 3h11A3.5 3.5 0 0 1 21 6.5v11a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 17.5v-11A3.5 3.5 0 0 1 6.5 3Zm3.9 5.3a.9.9 0 0 0-1.3 0l-3 3a.9.9 0 0 0 0 1.3l3 3a.9.9 0 1 0 1.3-1.3L8.1 12l2.3-2.4a.9.9 0 0 0 0-1.3Zm3.2 0a.9.9 0 0 0 0 1.3l2.3 2.4-2.3 2.3a.9.9 0 1 0 1.3 1.3l3-3a.9.9 0 0 0 0-1.3l-3-3a.9.9 0 0 0-1.3 0Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/** Two overlapping rounded cards, filled. */
export function ArtifactsIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9.6 3.4 18.4 2a2.4 2.4 0 0 1 2.7 2l1.3 8.6a2.4 2.4 0 0 1-2 2.7l-1 .2V9.4a4 4 0 0 0-4-4H7.4l.2-.1a2.4 2.4 0 0 1 2-1.9Z"
        fill={color}
      />
      <Rect x={2} y={7} width={15} height={15} rx={2.6} fill={color} />
    </Svg>
  );
}

const outline = {
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Outline tray, for a project in a hold menu. */
export function ProjectItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4h10M5.5 7.5h13" stroke={color} {...outline} />
      <Rect x={3.5} y={11} width={17} height={9.5} rx={2.2} stroke={color} {...outline} />
      <Path d="M9.5 14.5h5" stroke={color} {...outline} />
    </Svg>
  );
}

/** Outline angle brackets, for a code session in a hold menu. */
export function CodeItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14" stroke={color} {...outline} />
    </Svg>
  );
}

/** Outline overlapping cards, for an artifact in a hold menu. */
export function ArtifactItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={7.5} width={13} height={13} rx={2.4} stroke={color} {...outline} />
      <Path
        d="M8 4.2 17.6 3a2 2 0 0 1 2.2 1.7l1.1 8.4a2 2 0 0 1-1.7 2.2"
        stroke={color}
        {...outline}
      />
    </Svg>
  );
}

/** Outline house, for an assistant-style project in a hold menu. */
export function HomeItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 11.2 12 4.5l8 6.7M6.2 9.5V19a1.5 1.5 0 0 0 1.5 1.5h8.6a1.5 1.5 0 0 0 1.5-1.5V9.5"
        stroke={color}
        {...outline}
      />
    </Svg>
  );
}

/** Outline service bell, for an assistant-style project in a hold menu. */
export function BellItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4.5 16.5a7.5 7.5 0 0 1 15 0M3 19.5h18M12 6.5V9M10 6.5h4"
        stroke={color}
        {...outline}
      />
    </Svg>
  );
}

/** Outline thumbs-up, for a game-style project in a hold menu. */
export function ThumbItemIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7.5 10.5v9H4.8a1.3 1.3 0 0 1-1.3-1.3v-6.4a1.3 1.3 0 0 1 1.3-1.3h2.7Zm0 0 3.6-6.2a1.6 1.6 0 0 1 3 .9l-.6 3.8h5a2 2 0 0 1 2 2.3l-1 6.4a2.4 2.4 0 0 1-2.4 2h-9.6"
        stroke={color}
        {...outline}
      />
    </Svg>
  );
}

/** Camera, for the attachment menu. */
export function CameraIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4.5 7.5h3l1.6-2.2a1.5 1.5 0 0 1 1.2-.6h3.4a1.5 1.5 0 0 1 1.2.6l1.6 2.2h3a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke={color}
        {...outline}
      />
      <Circle cx={12} cy={13} r={3.4} stroke={color} {...outline} />
    </Svg>
  );
}

/** Photo, for the attachment menu. */
export function PhotoIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={2.4} stroke={color} {...outline} />
      <Circle cx={9} cy={9.8} r={1.6} stroke={color} {...outline} />
      <Path
        d="m4 17 4.6-4.4a1.4 1.4 0 0 1 1.9 0L14 16l2-1.9a1.4 1.4 0 0 1 1.9 0L20.5 17"
        stroke={color}
        {...outline}
      />
    </Svg>
  );
}

/** Document, for the attachment menu. */
export function FileIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5l-5-5Z"
        stroke={color}
        {...outline}
      />
      <Path d="M13.5 3.5v5h5" stroke={color} {...outline} />
    </Svg>
  );
}

/** Four tiles, one of them split off: connectors, for the attachment menu. */
export function ConnectorsIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={6.5} height={6.5} rx={1.4} stroke={color} {...outline} />
      <Rect x={4} y={13.5} width={6.5} height={6.5} rx={1.4} stroke={color} {...outline} />
      <Rect x={13.5} y={13.5} width={6.5} height={6.5} rx={1.4} stroke={color} {...outline} />
      <Path d="M16.75 4v6.5M13.5 7.25H20" stroke={color} {...outline} />
    </Svg>
  );
}

/** Open book with a bookmark: skills, for the attachment menu. */
export function SkillsIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 4.5h10.5A1.5 1.5 0 0 1 17 6v14H6.5A1.5 1.5 0 0 1 5 18.5v-14Z"
        stroke={color}
        {...outline}
      />
      <Path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H17M19 8v12" stroke={color} {...outline} />
      <Path d="M9 4.5V10l1.6-1.2 1.6 1.2V4.5" stroke={color} {...outline} />
    </Svg>
  );
}

/** Three dots, for "More" in the attachment menu. */
export function MoreIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5.5} cy={12} r={1.5} fill={color} />
      <Circle cx={12} cy={12} r={1.5} fill={color} />
      <Circle cx={18.5} cy={12} r={1.5} fill={color} />
    </Svg>
  );
}
