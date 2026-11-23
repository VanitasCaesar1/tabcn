/**
 * Ambient Bar: a bar with no colour of its own. The screen runs under it, and the bar is a deep,
 * dark blur of whatever is scrolling behind: a red logo passing under a tab glows red there,
 * green figures on the right glow green, and over a black list the bar is black. The blur builds
 * up from above the bar to the bottom edge, so content melts into it instead of meeting an edge.
 * Icons only (each tab's label is still read by screen readers). The active tab sits on a lens,
 * a blur of its own lifted with a faint white: grey over black, lit red over red.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<AmbientBar />)} />
 * ```
 *
 * Made for dark, colourful screens that scroll under the bar. The lens slides on `tabcnSpring`;
 * icons crossfade on the tab's focus progress; reduce motion makes both instant.
 * The blur is one strong expo-blur, faded in from the top of its area by a gradient mask
 * (@react-native-masked-view/masked-view), so content melts into it; the web gets the same
 * from CSS backdrop-filter. Android,
 * where expo-blur is costly and uneven, gets a dark fade instead, as Mini Player does.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import MaskedViewClass from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ViewProps } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
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

const defaultColors = {
  /** Idle icons. */
  icon: 'rgba(255, 255, 255, 0.62)',
  /** The active icon. */
  activeIcon: '#ffffff',
  /** The faint white over the lens's blur: more washes the colour out. */
  lens: 'rgba(255, 255, 255, 0.12)',
  /** The dark fade under the blur (over the screen on Android), strongest at the bottom. */
  shade: '#000000',
};

export type AmbientBarColors = typeof defaultColors;

export interface AmbientBarProps {
  /** Points above the bar where the blur starts to build. Default 56. */
  reach?: number;
  colors?: Partial<AmbientBarColors>;
  /** Selection haptic on every tab press. Default true. */
  haptics?: boolean;
}

/** Height of the row of tabs. */
const ROW = 58;
const ICON = 23;
const LENS_W = 62;
const LENS_H = 38;
/** How strong the blur is (expo-blur intensity, 0-100) where it is fully in. */
const BLUR_INTENSITY = 45;
/** The default material at a moderate radius keeps a mark's colour together, so it glows. */
const TINT = 'default' as const;
/** The lens's own blur, a little stronger than the bar's. */
const LENS_INTENSITY = 60;

export function AmbientBar({ reach = 56, colors: custom, haptics = true }: AmbientBarProps) {
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
        {BLUR ? (
          // One strong blur, faded in from the top of the area by a gradient mask, so the
          // content melts into it with no edge.
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={<View style={[StyleSheet.absoluteFill, maskStyle(reach / height)]} />}
          >
            <BlurView intensity={BLUR_INTENSITY} tint={TINT} style={StyleSheet.absoluteFill} />
          </MaskedView>
        ) : null}
        <View style={[StyleSheet.absoluteFill, shadeStyle(colors.shade)]} />
      </View>
      <TabList style={[styles.row, { width: width - insets.left - insets.right }]}>
        <TabIndicator style={styles.lensSlot}>
          {/* A lens: a blur of its own over the active tab picks up the colour under it, and a
              faint white lifts it, so it reads grey over black and lit red over red. */}
          <View style={styles.lens}>
            {BLUR ? (
              <BlurView intensity={LENS_INTENSITY} tint="default" style={StyleSheet.absoluteFill} />
            ) : null}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.lens }]} />
          </View>
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

/** The blur's mask: clear at the top of the area, fully in by the row's top edge. */
function maskStyle(fadeShare: number) {
  const end = `${Math.round(fadeShare * 1000) / 10}%`;
  const image = `linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) ${Math.round(fadeShare * 600) / 10}%, rgba(0, 0, 0, 1) ${end}, rgba(0, 0, 0, 1) 100%)`;
  return Platform.OS === 'web'
    ? ({ backgroundImage: image } as object)
    : { experimental_backgroundImage: image };
}

/**
 * A dark fade from the bottom edge up: clear at the top of the area, so the blur alone softens
 * the content there; darker towards the bottom so the icons read. On Android, with no blur, it
 * is a little stronger.
 */
function shadeStyle(shade: string) {
  const strength = BLUR ? 1 : 1.25;
  const stops = [
    [0.3, 0],
    [0.18, 35],
    [0.05, 70],
    [0, 100],
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
