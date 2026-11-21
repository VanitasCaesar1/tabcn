/**
 * Gradient Stickers: a cream pill with a two-tone glow along its top edge and
 * sticker icons. A soft tinted capsule glides to the active sticker.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The pill's cream fill; the glow fades into it. */
  background: '#fef0c3',
  /** The glow along the top edge, left to right: two or more colours. */
  glow: ['#ffd392', '#ffd392', '#fff5c1', '#dcee82', '#dcee82'] as readonly string[],
  /** The pill's light edge. */
  rim: 'rgba(255, 250, 214, 0.9)',
  /** The tinted capsule behind the active sticker. */
  capsule: 'rgba(214, 160, 60, 0.22)',
  /** The badge dot. */
  badge: '#ff4b4b',
  /**
   * Colour passed to `tabBarIcon`. The traced stickers draw their own colours and ignore it;
   * it reaches icons of your own.
   */
  icon: '#000000',
};

export type GradientStickersColors = typeof defaultColors;

export interface GradientStickersProps {
  colors?: Partial<GradientStickersColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function GradientStickers({ colors: custom, haptics = true }: GradientStickersProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  // LinearGradient needs two colours at least: a single one is a flat glow.
  const only = colors.glow[0] ?? 'transparent';
  const glow = (colors.glow.length >= 2 ? colors.glow : [only, only]) as readonly [
    string,
    string,
    ...string[],
  ];
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <View style={styles.shadow}>
        <View
          style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.rim }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={glow}
            locations={glowLocations(glow.length)}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.glow}
          >
            <LinearGradient
              colors={[transparent(colors.background), colors.background]}
              locations={[0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </LinearGradient>
          <TabList style={styles.list}>
            <TabIndicator
              inset={{ x: -2.5, y: 0 }}
              style={[styles.capsule, { backgroundColor: colors.capsule }]}
            />
            {tabs.map((tab) => (
              <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
            ))}
          </TabList>
        </View>
      </View>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: GradientStickersColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: colors.icon, size: ICON })}
      {tab.badge != null ? (
        <Animated.View
          entering={badgeIn}
          exiting={badgeOut}
          style={[styles.badge, { backgroundColor: colors.badge }]}
        />
      ) : null}
    </TabButton>
  );
}

/** The default glow's stops: its warm and green ends meet in a narrow pale band mid-way. */
const GLOW_LOCATIONS = [0, 0.46, 0.52, 0.57, 1] as const;

/** Stops for `count` glow colours: the measured ones for five, evenly spread otherwise. */
function glowLocations(count: number): readonly [number, number, ...number[]] {
  if (count === GLOW_LOCATIONS.length) return GLOW_LOCATIONS;
  const stops = Array.from({ length: count }, (_, i) => i / (count - 1));
  return stops as readonly number[] as readonly [number, number, ...number[]];
}

/**
 * `color` with zero alpha, so the glow fades into the fill without a grey midpoint. Handles
 * #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() and rgba(); anything else fades through 'transparent'.
 */
function transparent(color: string): string {
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim())?.[1];
  if (hex) {
    const full =
      hex.length <= 4 ? [...hex.slice(0, 3)].map((c) => c + c).join('') : hex.slice(0, 6);
    return `#${full}00`;
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(color.trim());
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, 0)`;
  return 'transparent';
}

// Motion: only the capsule moves, sliding and resizing on the foundation's default tabcnSpring
// (critically damped, no overshoot). Stickers look the same on every tab, and a press gives a
// haptic, not a scale. The glow, rim and shadow never change. The badge dot fades in and out on
// tabcnTiming, with no pop; with "reduce motion" on, everything happens instantly.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 35.5;

const styles = StyleSheet.create({
  outer: { width: 330, maxWidth: '100%' },
  shadow: { borderRadius: 30, boxShadow: '0 10px 26px rgba(150, 110, 40, 0.22)' },
  pill: {
    borderRadius: 30,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 15 },
  list: { alignItems: 'stretch' },
  capsule: { borderRadius: 999 },
  tab: { flex: 1, height: 50.5, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 12, right: '22%', width: 10, height: 10, borderRadius: 5 },
});
