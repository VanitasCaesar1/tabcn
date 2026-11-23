/**
 * Ink Underline: an editorial tab bar. Serif text tabs on a paper-coloured bar docked to the
 * bottom edge, a hairline above it and no icons. The active label is full ink, the others grey.
 * Under the active label a hand-drawn ink stroke draws itself from the leading edge when the tab
 * becomes active, while the previous tab's stroke wipes away in the same direction.
 * Badges: an empty badge is a small ink dot after the label, a count is a superscript numeral
 * in the same serif.
 *
 * Motion (soft, as for a reading app): the stroke draws in 340 ms, easing out; the old one wipes
 * away in 240 ms (70% of that), accelerating out. Only the stroke's dash offset animates, on the
 * UI thread. A tab change interrupted half-way reverses from where the stroke is, so nothing
 * jumps. Labels crossfade grey to ink on tabcnTiming. With reduce motion on, strokes appear and
 * disappear at once. Right to left, the stroke draws from the right.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useState } from 'react';
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
  useAnimatedProps,
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
const STROKE_BOX = 8;
const STROKE_WIDTH = 2.4;
/** A thinner second pass over the middle of the stroke gives it a brush's uneven weight. */
const PASS_WIDTH = 1.1;
const PASS_FROM = 0.1;
const PASS_TO = 0.86;

const DRAW_MS = 460;
const WIPE_MS = Math.round(DRAW_MS * 0.7);
const draw = {
  duration: DRAW_MS,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.System,
};
const wipe = {
  duration: WIPE_MS,
  easing: Easing.bezier(0.4, 0, 1, 1),
  reduceMotion: ReduceMotion.System,
};

const serif = Platform.select({ android: 'serif', default: 'Georgia' });

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function InkUnderline({ colors: custom, fontFamily, haptics = true }: InkUnderlineProps) {
  const colors = useColors(custom);
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View pointerEvents="none" style={[styles.hairline, { backgroundColor: colors.hairline }]} />
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
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
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: InkUnderlineColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const { ink, muted } = colors;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [muted, ink]),
  }));
  const stroke = useStroke(tab.focused);

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
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
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
            <Stroke width={width} seed={tab.index} color={colors.ink} ink={stroke} />
          ) : null}
        </View>
        {width > 0 ? (
          <Badge badge={tab.badge} at={width} color={colors.badge} fontFamily={fontFamily} />
        ) : null}
      </View>
    </TabButton>
  );
}

/**
 * Where the tab's stroke is, as a share of its dash: 1 not drawn, 0 fully drawn, -1 wiped away.
 * It draws in (1 to 0) when the tab becomes active and wipes away (0 to -1) when it stops being
 * active. Stopped half-way, it turns back from where it is instead of jumping.
 */
function useStroke(focused: boolean): SharedValue<number> {
  const target = useSharedValue(focused ? 1 : 0);
  const ink = useSharedValue(focused ? 0 : 1);
  useEffect(() => {
    target.value = focused ? 1 : 0;
  }, [focused, target]);
  useAnimatedReaction(
    () => target.value,
    (now, before) => {
      if (before === null || now === before) return;
      if (now === 1) {
        // A stroke that finished wiping away starts over from the leading edge.
        if (ink.value <= -0.999) ink.value = 1;
        ink.value = withTiming(0, draw);
      } else if (ink.value > 0.001) {
        // Still drawing in: it draws back out the way it came.
        ink.value = withTiming(1, wipe);
      } else {
        ink.value = withTiming(-1, wipe);
      }
    },
  );
  return ink;
}

/**
 * Dash offset for a stroke at `ink` (see useStroke), with the dash pattern `[dash, dash]`. Drawing
 * in, the dash slides in from the start of the path; wiping away, the gap after it follows it in.
 * Offsets stay positive (a wiped stroke is a whole period on), since Android's dash effect
 * doesn't take negative ones.
 */
function dashOffset(ink: number, dash: number) {
  'worklet';
  return ink >= 0 ? ink * dash : (2 + ink) * dash;
}

const Stroke = memo(function Stroke({
  width,
  seed,
  color,
  ink,
}: {
  width: number;
  seed: number;
  color: string;
  ink: SharedValue<number>;
}) {
  const box = width + OVERHANG * 2;
  const { main, pass } = useMemo(() => brushStroke(box, seed, I18nManager.isRTL), [box, seed]);
  const mainProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset(ink.value, main.dash),
  }));
  // The second pass covers PASS_FROM to PASS_TO of the stroke, so its own share follows the
  // main stroke's tip (or the wipe's edge) across that stretch.
  const passProps = useAnimatedProps(() => {
    const at = ink.value >= 0 ? 1 - ink.value : -ink.value;
    const share = Math.min(1, Math.max(0, (at - PASS_FROM) / (PASS_TO - PASS_FROM)));
    return { strokeDashoffset: dashOffset(ink.value >= 0 ? 1 - share : -share, pass.dash) };
  });
  return (
    <Svg width={box} height={STROKE_BOX} style={styles.stroke} pointerEvents="none">
      <AnimatedPath
        d={main.d}
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={[main.dash, main.dash]}
        animatedProps={mainProps}
      />
      <AnimatedPath
        d={pass.d}
        stroke={color}
        strokeWidth={PASS_WIDTH}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
        strokeDasharray={[pass.dash, pass.dash]}
        animatedProps={passProps}
      />
    </Svg>
  );
});

/** A repeatable value in -1..1 for a tab (`seed`) and a point along its stroke. */
function wobble(seed: number, i: number) {
  const v = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

/**
 * A smooth curve through points (quadratic segments between their midpoints), and a dash long
 * enough to cover it: the length of the line through the points, which the curve never exceeds.
 */
function curve(points: [number, number][], rtl: boolean, box: number) {
  const pts = points.map(([x, y]): [number, number] => [rtl ? box - x : x, y]);
  const f = (n: number) => Math.round(n * 100) / 100;
  const [first, ...rest] = pts;
  if (!first) return { d: '', dash: 1 };
  let d = `M${f(first[0])} ${f(first[1])}`;
  for (let i = 0; i < rest.length; i++) {
    const p = rest[i] as [number, number];
    const next = rest[i + 1];
    if (!next) {
      d += i === 0 ? ` L${f(p[0])} ${f(p[1])}` : '';
      break;
    }
    const end = i === rest.length - 2 ? next : [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2];
    d += ` Q${f(p[0])} ${f(p[1])} ${f(end[0] as number)} ${f(end[1] as number)}`;
  }
  let dash = 1;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as [number, number];
    const b = pts[i] as [number, number];
    dash += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { d, dash };
}

/**
 * The hand-drawn stroke for a box `box` wide: a line that rises slightly as it goes, wavers a
 * little (differently on each tab) and lifts at its end, as a pen does, plus a thinner second
 * pass that crosses it through the middle. Drawn from the leading edge: the right, right to left.
 */
function brushStroke(box: number, seed: number, rtl: boolean) {
  const cap = STROKE_WIDTH / 2;
  const from = cap;
  const to = box - cap;
  const mid = STROKE_BOX / 2 + 0.4;
  const segments = Math.max(3, Math.round((to - from) / 16));
  const main: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lift = i === segments ? 1.1 : 0;
    const waver = i === 0 || i === segments ? 0 : wobble(seed, i) * 0.7;
    main.push([from + (to - from) * t, mid + 0.6 - 1.2 * t + waver - lift]);
  }
  const pass: [number, number][] = [];
  const passFrom = from + (to - from) * PASS_FROM;
  const passTo = from + (to - from) * PASS_TO;
  const passSegments = Math.max(2, segments - 1);
  for (let i = 0; i <= passSegments; i++) {
    const t = i / passSegments;
    const x = passFrom + (passTo - passFrom) * t;
    const along = PASS_FROM + (PASS_TO - PASS_FROM) * t;
    pass.push([x, mid + 0.6 - 1.2 * along + 1.4 - 2.6 * t + wobble(seed + 7, i) * 0.3]);
  }
  return { main: curve(main, rtl, box), pass: curve(pass, rtl, box) };
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
  strokeBox: { height: STROKE_BOX, marginTop: 1 },
  // In the flow under the label, running OVERHANG past both ends.
  stroke: { marginHorizontal: -OVERHANG },
  // Hangs after the label's end so the label stays centred in its tab.
  badge: { position: 'absolute', top: 1 },
  superscript: { fontSize: 11, lineHeight: 13, fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
});
