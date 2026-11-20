/**
 * Colour Flood: Cash App's tab bar. The bar has no surface of its own: it is a docked,
 * full-width strip painted the colour of the screen above it, so the screen "floods" through
 * it. On Cash App's Pay tab the whole screen, bar included, is solid Cash green; on every
 * other tab both are white. Icons only, no labels (each tab's label is still read by screen
 * readers). The active tab is shown by icon colour alone: black, the others black at 40%.
 * No border, hairline, shadow, blur, pill or dot marks anything.
 *
 * Give a tab its own screen colour with `surfaces` (keyed by route name). When the active
 * tab changes, the bar's colour crossfades from the old tab's surface to the new one and the
 * icon tints crossfade, both on tabcnTiming. Nothing slides, scales or lifts; presses show
 * no dim or scale; reduce motion swaps the colours instantly. Paint each screen with the same
 * colour you give it here (`sceneStyle` in its options), or read the current one from
 * `onSurfaceChange`. With the navigator's `animation: 'fade'` the screens crossfade too, so
 * the screen and bar change colour together.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's App Store screenshots (a flat mockup at 2.41 px/pt on a 393 pt
 * screen, checked against older 3D-rendered shots): icon centres 122.7 pt apart in equal
 * slots, which leaves 12.5 pt at each side; the glyphs are 24-25 pt with 3.1 pt strokes,
 * and every icon is centred on one line. The 3D shots put that line about 60 pt above the
 * screen's bottom edge: a 50 pt bar with its icons centred, over the home-indicator inset.
 * Colours: Cash green #00e013; inactive icons measure #00860b on green and #949494 on white,
 * both black at about 40%.
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { processColor, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  /** The bar (and screen) colour of every tab without its own entry in `surfaces`. */
  background: '#ffffff',
  /** The active tab's icon. */
  active: '#000000',
  /** The other tabs' icons: translucent, so they read as a darker shade of any surface. */
  inactive: 'rgba(0, 0, 0, 0.4)',
  /** Badges: Cash App's screenshots show none, so this is iOS system red. */
  badge: '#ff3b30',
  badgeText: '#ffffff',
};

export type ColorFloodColors = typeof defaultColors;

/** A tab's screen colour, which the bar takes while that tab is active. */
export interface ColorFloodSurface {
  background: string;
  /** Active icon over this surface. Default `colors.active`. */
  active?: string;
  /** Inactive icons over this surface. Default `colors.inactive`. */
  inactive?: string;
}

/** Cash App's green: the Pay screen and the bar under it. */
export const colorFloodGreen = '#00e013';

/**
 * The older Cash App look for the Pay tab: white icons over the green, the inactive ones at
 * about 65% (measured #a9f3c4 over the 3D renders' green). Use it as a `surfaces` entry.
 */
export const colorFloodWhiteOnGreen: ColorFloodSurface = {
  background: colorFloodGreen,
  active: '#ffffff',
  inactive: 'rgba(255, 255, 255, 0.66)',
};

export interface ColorFloodProps {
  colors?: Partial<ColorFloodColors>;
  /**
   * Screen colours by route name (the `name` of each `Tabs.Screen`): a colour, or a
   * `ColorFloodSurface` to change the icon colours over it too. Tabs not listed use
   * `colors.background`. For Cash App: `{ pay: colorFloodGreen }`.
   */
  surfaces?: Record<string, string | ColorFloodSurface>;
  /** Called with the active tab's surface whenever it changes, and once on mount. */
  onSurfaceChange?: (surface: Required<ColorFloodSurface>) => void;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Icon box in points: the glyphs are drawn at 0.75 pt per unit of their 40-unit grid. */
const ICON = 30;
/** Bar height above the bottom safe area; the icons are centred in it. */
const BAR = 50;
/** Space at each end of the row of equal slots. */
const SIDE = 12.5;

interface Foreground {
  active: string;
  inactive: string;
}

const NO_SURFACES: Record<string, string | ColorFloodSurface> = {};

export function ColorFlood({
  colors: custom,
  surfaces = NO_SURFACES,
  onSurfaceChange,
  haptics = true,
}: ColorFloodProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, activeIndex } = useTabBar();
  const entry = surfaces[tabs[activeIndex]?.routeName ?? ''];
  const surface = typeof entry === 'string' ? { background: entry } : entry;
  const background = surface?.background ?? colors.background;
  const active = surface?.active ?? colors.active;
  const inactive = surface?.inactive ?? colors.inactive;

  // The bar's colour runs from the old tab's surface to the new one (a crossfade of colour,
  // no movement). An interrupted change carries on from the colour on screen.
  const fill = useSharedValue(background);
  useEffect(() => {
    fill.value = withTiming(background, tabcnTiming);
  }, [background, fill]);
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: fill.value }));

  // Report only real changes, even when `onSurfaceChange` is a new function every render.
  const report = useRef(onSurfaceChange);
  useEffect(() => {
    report.current = onSurfaceChange;
  });
  useEffect(() => {
    report.current?.({ background, active, inactive });
  }, [background, active, inactive]);

  const { current, previous, clear } = useForeground({ active, inactive });

  return (
    // The root holds the active surface's colour, so it covers the bottom safe area too (the
    // colour runs on under the home indicator) and stays put when a screen swaps the tabs
    // out. The fill drawn over it crossfades from the old colour to the new one.
    <TabBarRoot placement="docked" style={{ backgroundColor: background }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fillStyle]} />
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            fg={current}
            previous={previous}
            onFaded={clear}
            colors={colors}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The icon colours of the active surface. When they change (a surface with its own icon
 * colours), the old set is kept as `previous` until it has faded out over the new one.
 */
function useForeground(fg: Foreground) {
  const [state, setState] = useState<{ current: Foreground; previous: Foreground | null }>({
    current: fg,
    previous: null,
  });
  if (state.current.active !== fg.active || state.current.inactive !== fg.inactive) {
    setState({ current: fg, previous: state.current });
  }
  const clear = useCallback(() => setState((s) => (s.previous ? { ...s, previous: null } : s)), []);
  return { ...state, clear };
}

function Tab({
  tab,
  fg,
  previous,
  onFaded,
  colors,
  haptics,
}: {
  tab: TabItem;
  fg: Foreground;
  previous: Foreground | null;
  onFaded: () => void;
  colors: ColorFloodColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Icons tab={tab} fg={fg} progress={progress} />
        {previous ? (
          <FadeOut key={`${previous.active}|${previous.inactive}`} onDone={onFaded}>
            <Icons tab={tab} fg={previous} progress={progress} />
          </FadeOut>
        ) : null}
        <Badge tab={tab} colors={colors} />
      </View>
    </TabButton>
  );
}

/**
 * The icon in both tints. The active copy fades in over the inactive one, which stays until
 * the last stretch and then drops out, so the ink only ever darkens or lightens (no dip).
 * A translucent tint is drawn opaque and faded as a whole, so where an icon's strokes
 * overlap (the $'s bar, the magnifier's handle) they don't show darker.
 */
function Icons({
  tab,
  fg,
  progress,
}: {
  tab: TabItem;
  fg: Foreground;
  progress: SharedValue<number>;
}) {
  const off = splitAlpha(fg.inactive);
  const on = splitAlpha(fg.active);
  const inactive = useAnimatedStyle(() => ({
    opacity: off.alpha * interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: on.alpha * progress.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
        {tab.renderIcon?.({ focused: false, color: off.color, size: ICON })}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, active]}>
        {tab.renderIcon?.({ focused: true, color: on.color, size: ICON })}
      </Animated.View>
    </>
  );
}

/** Splits a colour into its opaque version and its alpha (0-1). */
function splitAlpha(color: string): { color: string; alpha: number } {
  const value = processColor(color);
  if (typeof value !== 'number') return { color, alpha: 1 };
  const alpha = ((value >>> 24) & 255) / 255;
  return { color: `rgb(${(value >>> 16) & 255}, ${(value >>> 8) & 255}, ${value & 255})`, alpha };
}

/** Starts opaque when mounted and fades out on tabcnTiming, then calls `onDone`. */
function FadeOut({ onDone, children }: { onDone: () => void; children: ReactNode }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(0, tabcnTiming, (finished) => {
      'worklet';
      if (finished) runOnJS(onDone)();
    });
  }, [opacity, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Cash App draws no badges; this one sits on the icon's top-right corner: a dot for an empty
 * badge, a count capsule otherwise. The tab's accessibility label already reads it.
 */
function Badge({ tab, colors }: { tab: TabItem; colors: ColorFloodColors }) {
  if (tab.badge == null) return null;
  const text = String(tab.badge).trim();
  const fill = { backgroundColor: colors.badge };
  if (text === '') return <View pointerEvents="none" style={[styles.dot, fill]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, fill]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={textStyle} />
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Docked full width with square corners; the colour change is the only edge.
  bar: { height: BAR, paddingHorizontal: SIDE },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: ICON, height: ICON },
  center: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 2, right: 1, width: 8, height: 8, borderRadius: 4 },
  badge: {
    position: 'absolute',
    top: -3,
    left: ICON - 12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontWeight: '600', includeFontPadding: false },
});
