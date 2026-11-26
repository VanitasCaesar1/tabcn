/**
 * Sticker Tiles: a teal bar of sticker icons with bold labels. The active tab
 * sits on a light tile that slides between tabs; badges are red dots.
 * Glass is opt-in: `material="glass"` (or `"auto"`) turns the teal bar into dark Liquid Glass
 * on iOS 26 (expo-glass-effect), under the same tile; the default stays the solid bar.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { processColor, StyleSheet, Text, View } from 'react-native';
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
  /** The bar, which also fills the home-indicator area. */
  background: '#27799f',
  /** The tile that slides behind the active tab. */
  tile: 'rgba(255, 255, 255, 0.33)',
  /** Every tab's label (the stickers keep their own colours). */
  label: '#ffffff',
  /** The badge dot. */
  badge: '#ff4d57',
  /** The ring round the badge dot. */
  badgeRing: '#ffffff',
  /**
   * Tint over the Liquid Glass (iOS 26), when `material` asks for glass. Unset, `background`
   * at 60%, so the bar keeps its teal and the white labels their contrast over light screens
   * (the glass follows what is behind it); `'transparent'` for clear glass.
   */
  glassTint: undefined as string | undefined,
};

export type StickerTilesColors = typeof defaultColors;

export interface StickerTilesProps {
  colors?: Partial<StickerTilesColors>;
  /**
   * The bar's surface: `'solid'` (the teal bar it copies), `'glass'` (Liquid Glass, iOS 26),
   * or `'auto'` (glass where the system has it, solid elsewhere). Default `'solid'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Label font, e.g. a rounded bold sans. Default: system font, weight 700. */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function StickerTiles({
  colors: custom,
  material = 'solid',
  fontFamily,
  haptics = true,
}: StickerTilesProps) {
  const colors = { ...defaultColors, ...custom };
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  const { tabs } = useTabBar();
  return (
    <TabBarRoot
      placement="docked"
      style={glass ? styles.dock : [styles.dock, { backgroundColor: colors.background }]}
    >
      {glass ? (
        // The glass fills the bar and the home-indicator area under it, as the colour did.
        <GlassView
          pointerEvents="none"
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor={colors.glassTint ?? withAlpha(colors.background, 0.6)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <TabList style={glass ? styles.bar : [styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 0, y: 3.9 }}
          style={[styles.tile, { backgroundColor: colors.tile }]}
        />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} fontFamily={fontFamily} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: StickerTilesColors;
  fontFamily?: string;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.label, size: ICON })}
        {tab.badge != null ? (
          <Animated.View
            entering={badgeIn}
            exiting={badgeOut}
            style={[styles.badge, { backgroundColor: colors.badge, borderColor: colors.badgeRing }]}
          />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          styles.label,
          { color: colors.label },
          fontFamily ? { fontFamily } : styles.systemWeight,
        ]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

// Motion: only the tile moves, sliding on the foundation's default tabcnSpring. Icons and labels
// look the same on every tab, and a press gives a haptic, not a scale. The badge dot fades in and
// out on tabcnTiming, with no pop; with "reduce motion" on, it appears and disappears instantly.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

/** The traced stickers' 40-unit box, in points, at the reference's scale. */
const ICON = 33.5;

/** `color` at `alpha` opacity (React Native's parser, so any colour format works). */
function withAlpha(color: string, alpha: number): string {
  const v = processColor(color);
  if (typeof v !== 'number') return color;
  return `rgba(${(v >>> 16) & 255}, ${(v >>> 8) & 255}, ${v & 255}, ${alpha})`;
}

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
  },
  bar: { height: 68.4, paddingHorizontal: 3.5 },
  tile: { borderRadius: 16, borderCurve: 'continuous' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1, paddingTop: 1 },
  // A fixed line box, so the label sits the same in Nunito (the demo) and the system font.
  label: { fontSize: 10.6, lineHeight: 14 },
  systemWeight: { fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
  },
});
