/**
 * Ambient Bar: a bar with no colour of its own. The screen runs under it, and the bar is a light
 * blur of whatever is scrolling behind, under a dark overlay: a red logo passing under a tab
 * glows red there, green figures on the right glow green, and over a black list the bar is black.
 * Blur and overlay share one soft shape, a slab set into the bottom of the screen whose top
 * corners curve down at the screen's sides; the row above the bar stays sharp.
 * Icons only (each tab's label is still read by screen readers). The active tab sits on a lens:
 * Liquid Glass where iOS has it (26 and later), which refracts and saturates what passes under
 * it, so it lights up in a logo's colour; elsewhere a blur of its own lifted with a faint white.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<AmbientBar />)} />
 * ```
 *
 * Made for dark, colourful screens that scroll under the bar. The lens slides on `tabcnSpring`;
 * icons crossfade on the tab's focus progress; reduce motion makes both instant.
 * The blur is one light expo-blur under the overlay, both inside one mask
 * (@react-native-masked-view/masked-view, the slab drawn with react-native-svg); the web gets the
 * blur from CSS backdrop-filter. Android, where expo-blur is costly and uneven, gets the overlay
 * alone, stronger, as Mini Player does.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import MaskedViewClass from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, FeGaussianBlur, Filter, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

// The package types MaskedView as a class component, which React 19's JSX types don't accept.
const MaskedView = MaskedViewClass as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

/** Whether the bar blurs: iOS and the web. Android gets the dark fade alone. */
const BLUR = Platform.OS !== 'android';
/**
 * The lens is Liquid Glass where the system has it (iOS 26): it refracts and saturates what is
 * under it, so a logo passing under the active tab lights the lens in its colour.
 */
const GLASS = isLiquidGlassAvailable();

const defaultColors = {
  /** Idle icons. */
  icon: 'rgba(255, 255, 255, 0.82)',
  /** The active icon. */
  activeIcon: '#ffffff',
  /** Darkens the Liquid Glass lens, so it reads as dark glass lit by what is under it. */
  lensTint: 'rgba(0, 0, 0, 0.35)',
  /** The faint white over the lens's blur: more washes the colour out. */
  lens: 'rgba(255, 255, 255, 0.12)',
  /** The dark fade under the blur (over the screen on Android), strongest at the bottom. */
  shade: '#000000',
};

export type AmbientBarColors = typeof defaultColors;

export interface AmbientBarProps {
  /**
   * Points above the bar where the blur starts to build. Default 12: the content above the bar
   * stays sharp, and the blur is fully in by the icons' top edge.
   */
  reach?: number;
  colors?: Partial<AmbientBarColors>;
  /** Selection haptic on every tab press. Default true. */
  haptics?: boolean;
}

/** Height of the row of tabs. */
const ROW = 62;
/** Points below the bar's top edge by which the blur is fully in. */
const RAMP = 14;
/** How far the slab's top corners curve down at the screen's sides, like the phone's corners. */
const CORNER = 64;
/** How much the slab's curved edge is softened (Gaussian standard deviation, points). */
const SOFTEN = 6;
const ICON = 25;
const LENS_W = 74;
const LENS_H = 42;
/** How strong the blur is (expo-blur intensity, 0-100) where it is fully in. */
const BLUR_INTENSITY = 16;
/**
 * A light blur, as the reference's: text behind the bar stays legible as faint ghosts, and the
 * dark overlay (`shadeStyle`) does most of the darkening. Apple's dark materials grey the colour.
 */
const TINT = 'default' as const;
/** The lens's own blur, a little stronger than the bar's. */
const LENS_INTENSITY = 60;

export function AmbientBar({ reach = 12, colors: custom, haptics = true }: AmbientBarProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const { width } = useWindowDimensions();
  // The bar's area, from `reach` above the row down past the home indicator.
  const height = reach + ROW + insets.bottom;
  const frame = { top: -reach, bottom: -insets.bottom, left: -insets.left, right: -insets.right };

  return (
    // Floating, edge to edge and flush with the safe area, so the screen runs under the bar;
    // the bar still reports its height for screens to pad by.
    <TabBarRoot placement="floating" offset={0}>
      <View pointerEvents="none" style={[styles.fill, frame]}>
        {/* The blur and the dark overlay share one soft shape: a fade from the top of the area
            whose top corners curve down at the screen's sides, like the phone's own corners,
            so the bar reads as a slab set into the bottom of the screen. */}
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={<SlabMask width={width} height={height} fullAt={reach + RAMP} />}
        >
          {BLUR ? (
            <BlurView intensity={BLUR_INTENSITY} tint={TINT} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, shadeStyle(colors.shade)]} />
        </MaskedView>
      </View>
      <TabList style={[styles.row, { width: width - insets.left - insets.right }]}>
        <TabIndicator style={styles.lensSlot}>
          {/* A lens: a blur of its own over the active tab picks up the colour under it, and a
              faint white lifts it, so it reads grey over black and lit red over red. */}
          {GLASS ? (
            <GlassView
              glassEffectStyle="clear"
              colorScheme="dark"
              tintColor={colors.lensTint}
              style={styles.lens}
            />
          ) : (
            <View style={styles.lens}>
              {BLUR ? (
                <BlurView
                  intensity={LENS_INTENSITY}
                  tint="default"
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.lens }]} />
            </View>
          )}
        </TabIndicator>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            idle={colors.icon}
            active={colors.activeIcon}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  idle,
  active,
  haptics,
}: {
  tab: TabItem;
  idle: string;
  active: string;
  haptics: boolean;
}) {
  // The idle icon gives way to the active one as the lens arrives.
  const progress = useFocusProgress(tab);
  const outgoing = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [1, 0], 'clamp'),
  }));
  const incoming = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = (color: string, focused: boolean) =>
    tab.renderIcon?.({ focused, color, size: ICON }) ?? null;
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, outgoing]}>
          {icon(idle, false)}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, incoming]}>
          {icon(active, true)}
        </Animated.View>
      </View>
    </TabButton>
  );
}

/**
 * The mask the blur and overlay share, in points: clear at the top, fully in `fullAt` points
 * down, with the top corners curving down to the screen's sides over `CORNER` points. The
 * curve is softened with a Gaussian blur; the shape runs past the sides, so the screen's edges
 * below the curve stay fully in.
 */
function SlabMask({ width, height, fullAt }: { width: number; height: number; fullAt: number }) {
  const r = CORNER;
  const out = 40;
  const d = [
    `M ${-out} ${height + out}`,
    `L ${-out} ${r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    `L ${width - r} 0`,
    `Q ${width} 0 ${width} ${r}`,
    `L ${width + out} ${r}`,
    `L ${width + out} ${height + out}`,
    'Z',
  ].join(' ');
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient
          id="ambient-bar-fade"
          x1="0"
          y1="0"
          x2="0"
          y2={fullAt}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.55" stopColor="#000" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#000" stopOpacity={1} />
        </LinearGradient>
        <Filter id="ambient-bar-soft" x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation={SOFTEN} />
        </Filter>
      </Defs>
      <Path d={d} fill="url(#ambient-bar-fade)" filter="url(#ambient-bar-soft)" />
    </Svg>
  );
}

/**
 * The dark overlay, from the bottom edge up: half black at the bottom, about a fifth at the
 * slab's top, so the bar is near black, the slab's shape reads on a coloured screen, and the
 * icons read. On Android, with no blur, it is stronger.
 */
function shadeStyle(shade: string) {
  const strength = BLUR ? 1 : 1.25;
  const stops = [
    [0.5, 0],
    [0.42, 45],
    [0.3, 80],
    [0.22, 100],
  ]
    .map(([alpha, at]) => `${withAlpha(shade, Math.min(1, (alpha as number) * strength))} ${at}%`)
    .join(', ');
  const image = `linear-gradient(to top, ${stops})`;
  return Platform.OS === 'web'
    ? ({ backgroundImage: image } as object)
    : { experimental_backgroundImage: image };
}

/** `color` with its opacity multiplied by `alpha`. Hex and rgb()/rgba(); others unchanged. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color)?.[1];
  let rgb: number[];
  let own = 1;
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    rgb = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
    if (full.length === 8) own = Number.parseInt(full.slice(6, 8), 16) / 255;
  } else {
    const parts = /^rgba?\(([^)]+)\)$/i
      .exec(color)?.[1]
      ?.split(/[\s,/]+/)
      .filter(Boolean);
    if (!parts || parts.length < 3 || parts.some((p) => p.endsWith('%'))) return color;
    rgb = parts.slice(0, 3).map(Number);
    if (parts[3] !== undefined) own = Number(parts[3]);
  }
  return `rgba(${rgb.join(', ')}, ${Math.round(own * alpha * 1000) / 1000})`;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute' },
  row: { height: ROW, flexDirection: 'row', paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The indicator spans the tab; the lens is centred in it.
  lensSlot: { alignItems: 'center', justifyContent: 'center' },
  lens: {
    width: LENS_W,
    maxWidth: '92%',
    height: LENS_H,
    borderRadius: LENS_H / 2,
    overflow: 'hidden',
  },
  iconBox: { width: ICON + 4, height: ICON + 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
