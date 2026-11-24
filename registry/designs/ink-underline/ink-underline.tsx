/**
 * Ink Underline: an editorial tab bar. Serif text tabs on a paper-coloured bar docked to the
 * bottom edge, a hairline above it and no icons. The active label is full ink, the others grey.
 * Under the active label sits a brush stroke: it presses in, swells and flicks up at its tail.
 * The ink flows the way you move: tap a tab to the right and the old stroke is pulled off to the
 * right while the new one draws in from its left; tap back and both run the other way.
 * Badges: an empty badge is a small ink dot after the label, a count is a superscript numeral
 * in the same serif.
 *
 * Motion (soft, as for a reading app): the new stroke draws in 420 ms, easing out; the old one
 * is pulled away in 290 ms (70% of that), accelerating out. Only two transforms per stroke
 * animate, on the UI thread. A tab change interrupted half-way turns back from where the stroke
 * is, so nothing jumps. Labels crossfade grey to ink on tabcnTiming and dim while pressed. With
 * reduce motion on, strokes appear and disappear at once.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, which also fills the home-indicator area. */
  background: '#f6f4ef',
  /** The hairline between the bar and the screen. */
  hairline: 'rgba(26, 25, 21, 0.16)',
  /** The active label and its underline. */
  ink: '#1a1915',
  /** The other labels. */
  muted: '#706c64',
  /** Badge dots and counts. Default: the same as `ink`. */
  badge: '#1a1915',
};

export type InkUnderlineColors = typeof defaultColors;

/** Paper on ink: pass it as `colors` for a dark bar. */
export const inkUnderlineDark: InkUnderlineColors = {
  background: '#141311',
  hairline: 'rgba(241, 237, 228, 0.16)',
  ink: '#f1ede4',
  muted: '#85817a',
  badge: '#f1ede4',
};

export interface InkUnderlineProps {
  /** Colours of the bar; `inkUnderlineDark` is a dark set. */
  colors?: Partial<InkUnderlineColors>;
  /** Label font. Default: Georgia on iOS and the web, the system serif on Android. */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Bar height above the bottom safe area. */
const BAR = 54;
const LABEL_SIZE = 16;
/** How far the stroke runs past each end of its label. */
const OVERHANG = 3;
/** The box the stroke is drawn in, under the label. */
const STROKE_BOX = 10;
/** The brush's widest point. */
const BRUSH = 3.4;
/** Where along the stroke its tail starts to flick up, and how far it rises. */
const FLICK_FROM = 0.84;
const FLICK = 1.7;

const DRAW_MS = 420;
const WIPE_MS = Math.round(DRAW_MS * 0.7);
const draw = {
  duration: DRAW_MS,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
};
const wipe = {
  duration: WIPE_MS,
  easing: Easing.bezier(0.4, 0, 1, 1),
  reduceMotion: ReduceMotion.System,
};
/** The label dims as the finger lands and comes back when it lifts. */
const pressIn = { duration: 70, reduceMotion: ReduceMotion.System };
const pressOut = { duration: 180, reduceMotion: ReduceMotion.System };
const PRESSED_OPACITY = 0.55;

const serif = Platform.select({ android: 'serif', default: 'Georgia' });

export function InkUnderline({ colors: custom, fontFamily, haptics = true }: InkUnderlineProps) {
  const colors = useColors(custom);
  const { tabs, activeIndex } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View pointerEvents="none" style={[styles.hairline, { backgroundColor: colors.hairline }]} />
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            activeIndex={activeIndex}
            colors={colors}
            fontFamily={fontFamily ?? serif}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The colours merged with the defaults, as one object that changes only when a colour does,
 * so the worklets that read it aren't rebuilt on every render.
 */
function useColors(custom: Partial<InkUnderlineColors> | undefined): InkUnderlineColors {
  const { background, hairline, ink, muted, badge } = custom ?? {};
  return useMemo(
    () => ({
      background: background ?? defaultColors.background,
      hairline: hairline ?? defaultColors.hairline,
      ink: ink ?? defaultColors.ink,
      muted: muted ?? defaultColors.muted,
      badge: badge ?? ink ?? defaultColors.badge,
    }),
    [background, hairline, ink, muted, badge],
  );
}

function Tab({
  tab,
  activeIndex,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  activeIndex: number;
  colors: InkUnderlineColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const pressed = useSharedValue(1);
  const { ink, muted } = colors;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [muted, ink]),
    opacity: pressed.value,
  }));
  const edge = useInk(tab, activeIndex);

  // The label's width, measured once it lays out (and again only if it changes), sizes the
  // stroke under it.
  const [width, setWidth] = useState(0);
  const onLabelLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width * 2) / 2;
    if (next !== width) setWidth(next);
  };

  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={() => {
        pressed.value = withTiming(PRESSED_OPACITY, pressIn);
        if (haptics) Haptics.selectionAsync();
      }}
      onPressOut={() => {
        pressed.value = withTiming(1, pressOut);
      }}
    >
      <View style={styles.labelBox}>
        <Animated.Text
          onLayout={onLabelLayout}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, { fontFamily }, label]}
        >
          {tab.label}
        </Animated.Text>
        <View style={styles.strokeBox}>
          {width > 0 ? (
            <Stroke width={width} seed={tab.index} color={colors.ink} edge={edge} />
          ) : null}
        </View>
        {width > 0 ? (
          <Badge badge={tab.badge} at={width} color={colors.badge} fontFamily={fontFamily} />
        ) : null}
      </View>
    </TabButton>
  );
}

/** A change of the tab's focus, and which way the active tab moved on screen (1 is right). */
interface InkSignal {
  on: boolean;
  dir: 1 | -1;
}

/**
 * Where the visible part of the tab's stroke is, as a share of its width on screen: 0 all of it,
 * -1 none (cut back to its left end), 1 none (cut back to its right end). Becoming active, it
 * draws in (-1 or 1 to 0) from the side the active tab came from; losing focus, it is pulled
 * away (0 to 1 or -1) toward the new tab. Stopped half-way, it turns back from where it is.
 */
function useInk(tab: TabItem, activeIndex: number): SharedValue<number> {
  const edge = useSharedValue(tab.focused ? 0 : -1);
  const signal = useSharedValue<InkSignal>({ on: tab.focused, dir: 1 });
  const last = useRef({ focused: tab.focused, active: activeIndex });
  useEffect(() => {
    const before = last.current;
    last.current = { focused: tab.focused, active: activeIndex };
    if (before.focused === tab.focused) return;
    // Tabs mirror right to left, so a higher index is further left there.
    const forward = activeIndex >= before.active;
    const dir = forward !== I18nManager.isRTL ? 1 : -1;
    signal.value = { on: tab.focused, dir };
  }, [tab.focused, activeIndex, signal]);
  useAnimatedReaction(
    () => signal.value,
    (now, before) => {
      if (before === null || now === before) return;
      const at = edge.value;
      if (now.on) {
        // A stroke that's gone starts over at the side the ink comes from.
        if (Math.abs(at) >= 0.999) edge.value = -now.dir;
        edge.value = withTiming(0, draw);
      } else {
        // Still drawing in, it goes back the way it came; drawn, it's pulled toward the new tab.
        edge.value = withTiming(Math.abs(at) > 0.001 ? Math.sign(at) : now.dir, wipe);
      }
    },
  );
  return edge;
}

/**
 * The stroke, shown up to `edge` (see useInk): a window as wide as the stroke slides across it
 * while the stroke inside slides back the same distance, so the stroke stays put and only the
 * window's edge moves. Two transforms, no re-render or relayout per frame.
 */
const Stroke = memo(function Stroke({
  width,
  seed,
  color,
  edge,
}: {
  width: number;
  seed: number;
  color: string;
  edge: SharedValue<number>;
}) {
  const box = width + OVERHANG * 2;
  const d = useMemo(() => brushStroke(box, seed, I18nManager.isRTL), [box, seed]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: edge.value * box }] }));
  const held = useAnimatedStyle(() => ({ transform: [{ translateX: -edge.value * box }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.stroke, { width: box }, slide]}>
      <Animated.View style={held}>
        <Svg width={box} height={STROKE_BOX}>
          <Path d={d} fill={color} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

/** A repeatable value in -1..1 for a tab (`seed`) and a point along its stroke. */
function wobble(seed: number, i: number) {
  const v = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

const f = (n: number) => Math.round(n * 100) / 100;
const pt = ([x, y]: [number, number]) => `${f(x)} ${f(y)}`;

/**
 * Commands for a smooth curve from `points[0]` (the current point) through the rest: quadratic
 * segments between the points' midpoints, ending on the last point.
 */
function smooth(points: [number, number][]) {
  let d = '';
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i] as [number, number];
    const next = points[i + 1] as [number, number];
    const end: [number, number] =
      i === points.length - 2 ? next : [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2];
    d += ` Q${pt(p)} ${pt(end)}`;
  }
  return d;
}

/**
 * The brush stroke for a box `box` wide, as a filled outline: the brush presses in quickly,
 * swells, and thins to a tail that flicks up as the pen lifts. Its line rises a little and
 * wavers differently on each tab (`seed`). Right to left, it's mirrored, so the flick is on
 * the left.
 */
function brushStroke(box: number, seed: number, rtl: boolean) {
  const from = 2;
  const to = box - 2.5;
  const mid = STROKE_BOX / 2 + 0.6;
  const n = Math.max(6, Math.round((to - from) / 6));
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  const widths: number[] = [];
  const centre: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const flick = t > FLICK_FROM ? ((t - FLICK_FROM) / (1 - FLICK_FROM)) ** 2 * FLICK : 0;
    const y = mid + 0.7 - 1.4 * t + wobble(seed, i) * 0.35 * Math.sin(Math.PI * t) - flick;
    const press = t < 0.12 ? 0.45 + 0.55 * Math.sin(((t / 0.12) * Math.PI) / 2) : 1;
    const tail = t > 0.55 ? 1 - 0.82 * ((t - 0.55) / 0.45) ** 1.5 : 1;
    const w = BRUSH * press * tail * (1 + wobble(seed + 3, i) * 0.08);
    const x = from + (to - from) * t;
    const mx = rtl ? box - x : x;
    top.push([mx, y - w / 2]);
    bottom.push([mx, y + w / 2]);
    widths.push(w);
    centre.push(y);
  }
  // Round caps: a curve around each end, bulging by about the brush's width there.
  const out = rtl ? -1 : 1;
  const endX = (rtl ? box - to : to) + out * (widths[n] as number);
  const startX = (rtl ? box - from : from) - out * (widths[0] as number) * 0.9;
  const first = top[0] as [number, number];
  const back = [...bottom].reverse();
  return (
    `M${pt(first)}${smooth(top)}` +
    ` Q${pt([endX, centre[n] as number])} ${pt(back[0] as [number, number])}` +
    `${smooth(back)} Q${pt([startX, centre[0] as number])} ${pt(first)} Z`
  );
}

// Badges fade in and out on tabcnTiming, with no pop; at once with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/**
 * After the label, at its top: a dot for an empty badge, a superscript count (digits roll when
 * it changes), or the badge's text. Screen readers hear the badge with the tab's label.
 */
function Badge({
  badge,
  at,
  color,
  fontFamily,
}: {
  badge: TabItem['badge'];
  /** The label's width: the badge hangs just after it. */
  at: number;
  color: string;
  fontFamily: string | undefined;
}) {
  if (badge === undefined) return null;
  const text = { color, fontFamily };
  return (
    <Animated.View
      entering={badgeIn}
      exiting={badgeOut}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, { start: at + 2 }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={[styles.superscript, text]} />
      ) : badge === '' ? (
        <View style={[styles.dot, { backgroundColor: color }]} />
      ) : (
        <Text maxFontSizeMultiplier={1.3} style={[styles.superscript, text]}>
          {badge}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hairline: { height: StyleSheet.hairlineWidth },
  bar: { height: BAR, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  // As wide as the label, so the stroke and the badge hang off the label, not the tab.
  labelBox: { alignSelf: 'center' },
  label: { fontSize: LABEL_SIZE, lineHeight: 21, letterSpacing: 0.1, includeFontPadding: false },
  // Tucked up under the label, as a pen's underline sits close to the words.
  strokeBox: { height: STROKE_BOX, marginTop: -1 },
  // In the flow under the label, running OVERHANG past both ends; clips the stroke to its window.
  stroke: { height: STROKE_BOX, marginHorizontal: -OVERHANG, overflow: 'hidden' },
  // Hangs after the label's end so the label stays centred in its tab.
  badge: { position: 'absolute', top: 1 },
  superscript: { fontSize: 11, lineHeight: 13, fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
});
