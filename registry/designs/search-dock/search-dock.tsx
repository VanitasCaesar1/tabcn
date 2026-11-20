/**
 * Search Dock: Pinterest's tab bar. Three separate white tiles float in one row over the
 * feed: a Home square, a search field that fills the rest of the row, and a Profile square
 * holding the user's photo. The tiles don't touch; the feed shows through the gaps. They are
 * flat, opaque white with no border, shadow or blur, and there are no labels.
 *
 * The search field is the Search tab: it shows a magnifier and the current query (or a grey
 * placeholder), and tapping it switches to the Search route. Pass `onAccessoryPress` to add
 * a camera button at its right end (visual search, as on Pinterest's iPad layout). That
 * button is the bar's `usePanelAnchor('action')` element, so a `TabPanel` can open from it.
 *
 * Motion: there is no active shape. The active tab is shown only by its glyph: the filled
 * copy crossfades in over the outline one on tabcnTiming. When the field's text changes
 * (the grey placeholder giving way to a query, or a new query), the old text fades out under
 * the new one. Nothing scales or bounces; tiles don't dim on press, the camera glyph dims
 * while held.
 *
 * It hides on scroll, as Pinterest's dock does: on a screen that uses `useMinimizeOnScroll()`
 * (under a `TabBarProvider`), scrolling down slides the whole row down out of view, and
 * scrolling up brings it back. Turn that off with `hideOnScroll={false}`. Reduce motion makes
 * every change instant.
 *
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Platform, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
  useTabBarMinimized,
} from 'tabcn';

const defaultColors = {
  /** The tiles: opaque white, as sampled. For a dark theme try '#1f1f1f'. */
  tile: '#ffffff',
  /** Inactive icons, the query text and the camera. */
  foreground: '#000000',
  /** Active icons. Pinterest's are the same black: only the glyph's fill changes. */
  active: '#000000',
  /** The field's text when there is no query: Pinterest's grey, #767676 (inferred). */
  placeholder: '#767676',
  /** Shadow under the tiles. The app has none; set a colour to lift them off a white page. */
  shadow: undefined as string | undefined,
  badge: '#e60023',
  badgeText: '#ffffff',
};

export type SearchDockColors = typeof defaultColors;

export interface SearchDockProps {
  colors?: Partial<SearchDockColors>;
  /** Index of the route drawn as the search field. Default 1 (the middle of three). */
  searchIndex?: number;
  /** Text shown in the field: the current search. Empty or left out shows `placeholder`. */
  query?: string;
  /** Grey text in the field when there is no query. Default "Search". */
  placeholder?: string;
  /** Adds a button at the field's right end, a camera by default. Runs when it's pressed. */
  onAccessoryPress?: () => void;
  /** Screen-reader label for that button. Default "Search with camera". */
  accessoryLabel?: string;
  /** Content of that button. Default: Pinterest's camera, in `colors.foreground`. */
  accessoryIcon?: ReactNode;
  /**
   * Font of the field's text. The app uses its own Pin Sans; the default is the system
   * font at the same size and weight.
   */
  fontFamily?: string;
  /**
   * Slide the row out of view while a screen using `useMinimizeOnScroll()` scrolls down, and
   * back on scrolling up. Needs a `TabBarProvider`. Default true.
   */
  hideOnScroll?: boolean;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on Pinterest's App Store screenshots (the iPhone screen drawn 1080 px wide, read
 * as 402 pt: 2.687 px per pt). Tiles 55 pt tall with 16.75 pt corners; the two squares are
 * 55 x 55 pt; 6.7 pt gaps; 19.4 pt from the screen's sides; the row's bottom edge 31.5 pt
 * above the screen's, 2.5 pt inside the home-indicator area. In the field: the magnifier
 * starts 13.9 pt in, the text 45.8 pt in, 17 pt with 11.9 pt caps, centred on the field.
 * The iPad layout puts the camera's centre 29.1 pt from the field's right edge.
 * Row check: 19.4 + 55 + 6.7 + 240 + 6.7 + 55 + 19.4 = 402.2 pt on a 402 pt screen.
 */
const TILE = 55;
const RADIUS = 16.75;
const GAP = 6.7;
const SIDE = 19.4;
/** How far the row sits inside the bottom safe area on iPhones with a home indicator. */
const INSET_OVERLAP = 2.5;
/** The icons' 40-unit box, in points (0.8 pt per unit). */
const ICON = 32;
/** Left edge of the magnifier's icon box in the field (the glyph starts 4.6 pt into it). */
const MAG_LEFT = 9.3;
const TEXT_LEFT = 45.8;
/** Centre of the camera from the field's right edge, and its touch target. */
const ACCESSORY_CENTER = 29.1;
const ACCESSORY_HIT = 44;
/** Opacity of the camera glyph while it is held. */
const PRESSED_OPACITY = 0.4;
/** Extra distance the hidden row travels, so a custom shadow leaves the screen with it. */
const HIDE_EXTRA = 16;

export function SearchDock({
  colors: custom,
  searchIndex = 1,
  query,
  placeholder = 'Search',
  onAccessoryPress,
  accessoryLabel = 'Search with camera',
  accessoryIcon,
  fontFamily,
  hideOnScroll = true,
  haptics = true,
}: SearchDockProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const minimized = useTabBarMinimized();
  // The app's row sits just inside the home-indicator inset. Without one (older iPhones,
  // Android navigation bars) it keeps a small gap above the system area instead.
  const bottom =
    Platform.OS === 'ios' && insets.bottom > 0 ? insets.bottom - INSET_OVERLAP : insets.bottom + 12;
  const shadow = colors.shadow ? { boxShadow: `0 2px 12px ${colors.shadow}` } : undefined;
  const tile = { backgroundColor: colors.tile };

  // While hidden, the row is off screen: screen readers skip it and it takes no touches.
  const [hidden, setHidden] = useState(false);
  useAnimatedReaction(
    () => hideOnScroll && minimized.value > 0.5,
    (next, previous) => {
      if (next !== previous) runOnJS(setHidden)(next);
    },
  );
  // The row slides straight down by its height plus its distance from the screen's edge.
  const distance = TILE + bottom + HIDE_EXTRA;
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: hideOnScroll ? minimized.value * distance : 0 }],
  }));

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot
      placement="floating"
      minimizeBehavior={hideOnScroll ? 'onScrollDown' : 'none'}
      offset={bottom - insets.bottom}
      style={styles.root}
    >
      <Animated.View
        pointerEvents={hidden ? 'none' : 'auto'}
        accessibilityElementsHidden={hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
        style={slide}
      >
        <TabList style={styles.list}>
          {tabs.map((tab) =>
            tab.index === searchIndex ? (
              <SearchField
                key={tab.key}
                tab={tab}
                colors={colors}
                style={[tile, shadow]}
                query={query}
                placeholder={placeholder}
                onAccessoryPress={onAccessoryPress}
                accessoryLabel={accessoryLabel}
                accessoryIcon={accessoryIcon}
                fontFamily={fontFamily}
                haptics={haptics}
              />
            ) : (
              <Tile
                key={tab.key}
                tab={tab}
                colors={colors}
                style={[tile, shadow]}
                haptics={haptics}
              />
            ),
          )}
        </TabList>
      </Animated.View>
    </TabBarRoot>
  );
}

/**
 * The tab's two glyphs, stacked: the active copy fades in over the inactive one, which stays
 * opaque until the last stretch and then drops out, so the filled glyph rests alone with no
 * outline or fringe under it.
 */
function Glyph({ tab, colors }: { tab: TabItem; colors: SearchDockColors }) {
  const progress = useFocusProgress(tab);
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  return (
    <View pointerEvents="none" style={styles.icon}>
      <Animated.View style={[StyleSheet.absoluteFill, inactive]}>
        {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, active]}>
        {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
      </Animated.View>
      <Badge tab={tab} colors={colors} />
    </View>
  );
}

/** A square tile (Home, Profile): the icon centred, nothing else. */
function Tile({
  tab,
  colors,
  style,
  haptics,
}: {
  tab: TabItem;
  colors: SearchDockColors;
  style: StyleProp<ViewStyle>;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={[styles.tile, style]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Glyph tab={tab} colors={colors} />
    </TabButton>
  );
}

/**
 * The search field. The whole field is the Search tab's button; the optional camera is a
 * separate button laid over its right end, so each is reached on its own by screen readers.
 */
function SearchField({
  tab,
  colors,
  style,
  query,
  placeholder,
  onAccessoryPress,
  accessoryLabel,
  accessoryIcon,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: SearchDockColors;
  style: StyleProp<ViewStyle>;
  query: string | undefined;
  placeholder: string;
  onAccessoryPress: (() => void) | undefined;
  accessoryLabel: string;
  accessoryIcon: ReactNode;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const hasQuery = !!query;
  const accessory = onAccessoryPress != null;
  return (
    <View style={[styles.field, style]}>
      <TabButton
        tab={tab}
        style={styles.fieldButton}
        accessibilityValue={hasQuery ? { text: query } : undefined}
        onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
      >
        <View style={styles.magnifier}>
          <Glyph tab={tab} colors={colors} />
        </View>
        <FieldText
          text={hasQuery ? query : placeholder}
          color={hasQuery ? colors.foreground : colors.placeholder}
          fontFamily={fontFamily}
          marginRight={accessory ? ACCESSORY_CENTER + ACCESSORY_HIT / 2 : 16}
        />
      </TabButton>
      {accessory ? (
        <Accessory
          label={accessoryLabel}
          onPress={onAccessoryPress}
          haptics={haptics}
          icon={accessoryIcon ?? <Camera color={colors.foreground} />}
        />
      ) : null}
    </View>
  );
}

interface Line {
  text: string;
  color: string;
}

/**
 * The field's one line of text. When the text or its colour changes, the new line fades in
 * while the old one, laid over it, fades out, both on tabcnTiming: the grey placeholder and
 * the black query crossfade rather than swap. Each change mounts fresh layers, so both start
 * from the right opacity. Reduce motion swaps at once.
 */
function FieldText({
  text,
  color,
  fontFamily,
  marginRight,
}: Line & { fontFamily: string | undefined; marginRight: number }) {
  const [lines, setLines] = useState<{ now: Line; before: Line | null; change: number }>({
    now: { text, color },
    before: null,
    change: 0,
  });
  if (lines.now.text !== text || lines.now.color !== color) {
    setLines({ now: { text, color }, before: lines.now, change: lines.change + 1 });
  }
  const { now, before, change } = lines;
  const onFaded = useCallback(
    () =>
      setLines((current) => (current.change === change ? { ...current, before: null } : current)),
    [change],
  );
  const font = { fontFamily };
  return (
    <View style={[styles.textBox, { marginRight }]}>
      <Fade key={`now-${change}`} from={change === 0 ? 1 : 0} to={1}>
        <Text numberOfLines={1} style={[styles.text, font, { color: now.color }]}>
          {now.text}
        </Text>
      </Fade>
      {before ? (
        <Fade key={`before-${change}`} from={1} to={0} onDone={onFaded} style={styles.textBefore}>
          <Text
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.text, font, { color: before.color }]}
          >
            {before.text}
          </Text>
        </Fade>
      ) : null}
    </View>
  );
}

/** Mounts at `from` opacity and fades to `to` on tabcnTiming, then calls `onDone`. */
function Fade({
  from,
  to,
  onDone,
  style,
  children,
}: {
  from: number;
  to: number;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const opacity = useSharedValue(from);
  useEffect(() => {
    if (from === to) return;
    const done = () => onDone?.();
    opacity.value = withTiming(to, tabcnTiming, (finished) => {
      'worklet';
      if (finished) runOnJS(done)();
    });
  }, [opacity, from, to, onDone]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

function Accessory({
  label,
  onPress,
  haptics,
  icon,
}: {
  label: string;
  onPress: () => void;
  haptics: boolean;
  icon: ReactNode;
}) {
  const anchor = usePanelAnchor('action');
  // The glyph dims at once on touch and fades back on release; the button doesn't move.
  const opacity = useSharedValue(1);
  const glyph = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <PressableScale
      {...anchor}
      scale={1}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        opacity.value = PRESSED_OPACITY;
        if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        opacity.value = withTiming(1, tabcnTiming);
      }}
      style={styles.accessory}
    >
      <Animated.View style={glyph}>{icon}</Animated.View>
    </PressableScale>
  );
}

/**
 * Pinterest's camera, from the iPad screenshot: a body outline (16.4 x 15 pt, 1.4 pt
 * stroke) broken on the left side and at the bottom right, a lens ring, and a dot where
 * the corner would be. Same 40-unit box at 32 pt as the tab icons.
 */
function Camera({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 40 40">
      <Path
        d="M10.27 23.63V25.9A2.97 2.97 0 0 0 13.24 28.87H22.49M10.27 18.98V16.72A2.97 2.97 0 0 1 13.24 13.75H14.9L16.62 11.9A2.3 2.3 0 0 1 18.3 11.15H21.95A2.3 2.3 0 0 1 23.63 11.9L25.35 13.75H26.79A2.97 2.97 0 0 1 29.76 16.72V21.6"
        stroke={color}
        strokeWidth={1.74}
        fill="none"
      />
      <Circle cx={19.9} cy={20.74} r={4.07} stroke={color} strokeWidth={1.74} fill="none" />
      <Circle cx={28.3} cy={27.42} r={2.14} fill={color} />
    </Svg>
  );
}

/** A red count badge at the icon's top right. Read with the tab's label, not on its own. */
function Badge({ tab, colors }: { tab: TabItem; colors: SearchDockColors }) {
  if (tab.badge == null) return null;
  const text = { color: colors.badgeText };
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, { backgroundColor: colors.badge }]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={[styles.badgeText, text]} />
      ) : (
        <Text style={[styles.badgeText, text]}>{tab.badge}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    // The root already sits inside the side safe areas, so only the design's own margin is added.
    marginHorizontal: SIDE,
  },
  list: {
    gap: GAP,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flex: 1,
    height: TILE,
    borderRadius: RADIUS,
  },
  fieldButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  magnifier: {
    position: 'absolute',
    left: MAG_LEFT,
    top: (TILE - ICON) / 2,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  textBox: {
    flex: 1,
    marginLeft: TEXT_LEFT,
    justifyContent: 'center',
  },
  textBefore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  text: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
    includeFontPadding: false,
  },
  accessory: {
    position: 'absolute',
    right: ACCESSORY_CENTER - ACCESSORY_HIT / 2,
    top: (TILE - ACCESSORY_HIT) / 2,
    width: ACCESSORY_HIT,
    height: ACCESSORY_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    left: ICON / 2 + 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
});
