/**
 * What the eight scenes share: their props, the palette they draw with (the scene's own, or the
 * PanelUI theme's), the scroll view that runs under the bar, the large iOS-style header, photos,
 * avatars and line icons.
 */
import { Image, type ImageSource } from 'expo-image';
import { type ComponentProps, createContext, type ReactNode, use } from 'react';
import {
  Platform,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { embed } from '@/embed';
import { SCENES, type SceneName, type ScenePalette, type SceneScheme } from './palette';

/** A control in the scene that drives the design on show, named so tests and recordings can find it. */
export interface SceneAction {
  label: string;
  onPress: () => void;
}

/**
 * Behaviours a demo hangs on the scene's own controls, the way an app would: a post's comment
 * button opens Bar Sheet's comments, a product's add button fills Cart Pill's bag, the first
 * holding opens Slider Sheet, a search
 * field that takes typing raises the keyboard (Companion Chip). A scene draws the control for
 * each action it is given and nothing extra.
 */
export interface SceneActions {
  /** Social: the comment button on the first post. */
  comment?: SceneAction;
  /** Shop: the add button on the first product. */
  addToBag?: SceneAction;
  /** Finance: the first holding's row (Northwind Air). */
  holding?: SceneAction;
  /** Shop and maps: the search field takes typing (`label` is its accessibility label). */
  search?: { label: string };
  /** Files: the file list can be selected, from its Select button or a long-press on a file. */
  select?: SceneSelect;
}

/** Select mode on the files scene's list, kept by the demo (Selection Toolbar). */
export interface SceneSelect {
  /** Select mode is on: a tap on a file adds it or takes it out. */
  selecting: boolean;
  /** Names of the selected files. */
  selected: ReadonlySet<string>;
  /** Files taken out of the list (the demo's Delete). */
  removed: ReadonlySet<string>;
  /** The list's Select and Done button. */
  setSelecting: (on: boolean) => void;
  /** Adds a file to the selection or takes it out. */
  toggle: (name: string) => void;
  /** A long-press on a file: select mode on, with that file selected. */
  hold: (name: string) => void;
}

const SceneActionsContext = createContext<SceneActions | null>(null);

/** Provided by a demo around its scene (DemoExtraProps.children in panel-demos.tsx). */
export const SceneActionsProvider = SceneActionsContext;

export function useSceneActions(): SceneActions | null {
  return use(SceneActionsContext);
}

/** Colours that replace the scene's own: a PanelUI theme, or a tab the design floods. */
export interface SceneColors {
  background: string;
  text: string;
  chip: string;
  surface?: string;
  muted?: string;
  accent?: string;
  /**
   * A tab flooded in one colour (Colour Flood's Pay): everything is drawn in the one ink, since
   * colour cues such as green and red changes would vanish into the flood.
   */
  flood?: boolean;
}

export interface SceneProps {
  /** The tab showing the scene: its content order turns with it. */
  index: number;
  /** What the bar covers at the bottom; content runs under it and ends 24 pt above it. */
  barHeight: number;
  scheme: SceneScheme;
  /** Colours to use instead of the scene's palette. */
  themed?: SceneColors;
  /** The tab's name, shown as the large title. */
  title: string;
  /** The demo's back and next controls, above the title. */
  nav?: ReactNode;
  /** Content under the title (the React Navigation demo's design picker). */
  children?: ReactNode;
  /** Scroll handler (tabcn's `useMinimizeOnScroll`), for bars that minimize. */
  onScroll?: ComponentProps<typeof Animated.ScrollView>['onScroll'];
  /**
   * Where this design's content starts (its place in the catalog), so designs that share a
   * scene don't all open on the same post. The tab index turns it from there.
   */
  seed?: number;
  /** Saturated marks for a bar that takes its colour from what passes under it (Ambient Bar). */
  vivid?: boolean;
}

export interface Palette extends ScenePalette {
  dark: boolean;
  /** See SceneColors.flood. */
  flood: boolean;
}

/** The scene's palette, or the replacement colours mapped onto it. */
export function scenePalette(
  name: SceneName,
  scheme: SceneScheme,
  themed: SceneColors | undefined,
): Palette {
  const own = SCENES[name][scheme];
  if (!themed) return { ...own, dark: scheme === 'dark', flood: false };
  return {
    background: themed.background,
    surface: themed.surface ?? themed.chip,
    text: themed.text,
    subtle: themed.muted ?? themed.text,
    accent: themed.accent ?? themed.text,
    dark: isLight(themed.text) ?? scheme === 'dark',
    flood: themed.flood ?? false,
  };
}

/** The scene's colours on a tab its bar floods (Colour Flood's Pay): white on the flood colour. */
export function floodColors(flood: string): SceneColors {
  const light = isLight(flood) ?? false;
  const ink = light ? '#000000' : '#ffffff';
  const wash = light ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)';
  return {
    background: flood,
    text: ink,
    chip: wash,
    surface: wash,
    muted: light ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.75)',
    accent: ink,
    flood: true,
  };
}

/** Whether a `#rrggbb` colour is light; undefined for colours it can't read. */
export function isLight(color: string): boolean | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return undefined;
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map(
    (i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

/** How far the scene's content is turned: the tab index, from the design's starting point. */
export function turnOf(scene: Pick<SceneProps, 'index' | 'seed'>) {
  return scene.index + (scene.seed ?? 0);
}

/** The list, starting `n` items in, so each tab opens on different content. */
export function rotate<T>(list: readonly T[], n: number): T[] {
  if (list.length === 0) return [];
  const k = ((n % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

/**
 * Space above the scene: the status bar on a phone. The site's live preview fills a drawn phone
 * from its top edge, so it leaves room for the status bar there too.
 */
export function useSceneTop() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return insets.top;
  return embed ? 54 : Math.max(insets.top, 12);
}

/**
 * Content screen readers skip, as the demo screens always have: the bar is what's on show. A
 * scene with actions stays readable, so its controls can be found and pressed.
 */
export function Hidden({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const actions = useSceneActions();
  if (actions) return <View style={style}>{children}</View>;
  return (
    <View
      style={style}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

/**
 * The scene's scroll view: back and next, the large title, the demo's controls, then the
 * sections, turned by the tab index.
 */
export function SceneScroll({
  scene,
  palette,
  accessory,
  lead,
  sections,
  trail,
  gap = 28,
}: {
  scene: SceneProps;
  palette: Palette;
  /** Drawn at the large title's trailing edge: an avatar or a round button. */
  accessory?: ReactNode;
  /** Content that stays first on every tab (a search field), before the turning sections. */
  lead?: ReactNode;
  sections: ReactNode[];
  /** Content that stays last on every tab (a footer card). */
  trail?: ReactNode;
  gap?: number;
}) {
  const top = useSceneTop();
  return (
    <Animated.ScrollView
      style={[styles.flex, { backgroundColor: palette.background }]}
      contentContainerStyle={{ paddingTop: top, paddingBottom: scene.barHeight + 24 }}
      showsVerticalScrollIndicator={false}
      onScroll={scene.onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
    >
      {scene.nav}
      <Hidden>
        <LargeTitle title={scene.title} palette={palette} accessory={accessory} />
      </Hidden>
      {scene.children}
      <Hidden style={{ gap, paddingTop: 8 }}>
        {lead}
        {rotate(sections, turnOf(scene))}
        {trail}
      </Hidden>
    </Animated.ScrollView>
  );
}

export function LargeTitle({
  title,
  palette,
  accessory,
}: {
  title: string;
  palette: Palette;
  accessory?: ReactNode;
}) {
  return (
    <View style={styles.largeTitle}>
      <Text numberOfLines={1} style={[styles.largeTitleText, { color: palette.text }]}>
        {title}
      </Text>
      {accessory}
    </View>
  );
}

/** A section's heading, with an optional quiet action at its end ("See all"). */
export function SectionHeader({
  title,
  palette,
  action,
}: {
  title: string;
  palette: Palette;
  action?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {action ? (
        <Text style={[styles.sectionAction, { color: palette.subtle }]}>{action}</Text>
      ) : null}
    </View>
  );
}

/** A photo that fades in over the surface colour, so it never pops in on an empty box. */
export function Photo({
  source,
  palette,
  style,
}: {
  source: ImageSource | number;
  palette: Palette;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.photo, { backgroundColor: palette.surface }, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    </View>
  );
}

export function Avatar({
  source,
  size,
  palette,
}: {
  source: ImageSource | number;
  size: number;
  palette: Palette;
}) {
  return (
    <Photo
      source={source}
      palette={palette}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

/** A one-pixel line in the text colour, faint. */
export function Hairline({ palette, inset = 0 }: { palette: Palette; inset?: number }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        marginLeft: inset,
        backgroundColor: palette.text,
        opacity: palette.dark ? 0.18 : 0.12,
      }}
    />
  );
}

/** A 24-unit line icon. */
export function Glyph({
  d,
  color,
  size = 22,
  fill,
  strokeWidth = 1.8,
}: {
  d: string;
  color: string;
  size?: number;
  fill?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill ?? 'none'}
      />
    </Svg>
  );
}

export const ICONS = {
  heart:
    'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z',
  comment:
    'M12 4.5c4.4 0 8 3 8 6.8s-3.6 6.8-8 6.8c-1 0-2-.1-2.9-.4L5 19.5l1.1-3.4C4.8 14.8 4 13.1 4 11.3c0-3.8 3.6-6.8 8-6.8Z',
  send: 'M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4 17-6.5Z',
  bookmark: 'M6.5 4h11v16.5L12 16.2l-5.5 4.3Z',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  search: 'M10.8 17.6a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6ZM20 20l-4.4-4.4',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l10.5-6.5Z',
  chevron: 'M9.5 5.5 16 12l-6.5 6.5',
  back: 'M15 5.5 8.5 12l6.5 6.5',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15ZM10 20.5h4',
  folder: 'M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z',
  doc: 'M6.5 3.5h7.5l4.5 4.5v12.5h-12ZM14 3.5V8h4.5M9 13h6M9 16.5h6',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.5v5M8 14.5v5',
  star: 'M12 4.2 14.3 9l5.2.6-3.9 3.6 1.1 5.1L12 15.7l-4.7 2.6 1.1-5.1-3.9-3.6 5.2-.6Z',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
  shuffle:
    'M3.5 7h3.3c4.8 0 5.6 10 10.4 10h3.3M3.5 17h3.3c1.6 0 2.6-1.1 3.4-2.5M17.5 4.5 20.5 7l-3 2.5M13.8 9.5c.8-1.4 1.8-2.5 3.4-2.5h3.3M17.5 14.5l3 2.5-3 2.5',
  camera:
    'M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5L16 6.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  check: 'M6.5 12.5l3.5 3.5 7.5-8',
  phone:
    'M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z',
  video:
    'M3.5 7.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2ZM15.5 10.5l5-3v9l-5-3',
} as const;

/** A round button on the surface colour, for a header's trailing edge. */
export function RoundButton({ icon, palette }: { icon: string; palette: Palette }) {
  return (
    <View style={[styles.round, { backgroundColor: palette.surface }]}>
      <Glyph d={icon} color={palette.text} size={20} />
    </View>
  );
}

/** A search field drawn the way iOS draws one (not editable: it's part of the picture). */
export function SearchField({ label, palette }: { label: string; palette: Palette }) {
  const search = useSceneActions()?.search;
  return (
    <View style={[styles.search, { backgroundColor: palette.surface }]}>
      <Glyph d={ICONS.search} color={palette.subtle} size={17} />
      {search ? (
        <TextInput
          placeholder={label}
          placeholderTextColor={palette.subtle}
          accessibilityLabel={search.label}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.searchText, styles.searchInput, { color: palette.text }]}
        />
      ) : (
        <Text style={[styles.searchText, { color: palette.subtle }]}>{label}</Text>
      )}
    </View>
  );
}

/** A round icon button that runs a scene action, or the plain icon when there is none. */
export function ActionIcon({
  icon,
  action,
  label,
  color,
  size = 24,
}: {
  icon: string;
  action?: SceneAction;
  /** The label when it isn't the action's own (a second copy of the control). */
  label?: string;
  color: string;
  size?: number;
}) {
  if (!action) return <Glyph d={icon} color={color} size={size} />;
  return (
    <Pressable
      role="button"
      accessibilityLabel={label ?? action.label}
      hitSlop={10}
      onPress={action.onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
    >
      <Glyph d={icon} color={color} size={size} />
    </Pressable>
  );
}

export const num: TextStyle = { fontVariant: ['tabular-nums'] };

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  largeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  largeTitleText: { flexShrink: 1, fontSize: 34, fontWeight: '700', letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  sectionAction: { fontSize: 15 },
  photo: { overflow: 'hidden', borderCurve: 'continuous' },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    marginHorizontal: 16,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderCurve: 'continuous',
  },
  searchText: { fontSize: 17 },
  searchInput: { flex: 1, paddingVertical: 0, outlineStyle: 'none' } as object,
});
