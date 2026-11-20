/**
 * Glass Expand: GO Club's tab bar. A wide, near-white lavender glass pill floats low over the
 * screen, with icon-only tabs and no labels. The active tab sits in a flat grey-lavender
 * capsule; the inactive icons are spaced evenly to the right of it. All icons are the same
 * near-black in both states, so the capsule is the only active cue. When the tab changes, the
 * capsule glides to its new place and the icons ease into theirs, with no bounce.
 *
 * The pill is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS, and a
 * translucent tint on Android (no blur there). Force one with `material`. Outside Liquid Glass
 * it gets a soft top-to-bottom shading and a 1 pt white rim, as in the app.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Fragment } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Easing, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { TabBarRoot, TabButton, TabIndicator, type TabItem, TabList, useTabBar } from 'tabcn';

const defaultColors = {
  /**
   * Fill of the pill over the blur (iOS before 26), or the whole surface on Android. Over the
   * app's #ebe9ff card it comes out as the measured #f2f1ff.
   */
  background: 'rgba(245, 244, 255, 0.7)',
  /** Top of the pill's vertical shading: the measured #ecebfc at the top... */
  shade: 'rgba(60, 50, 140, 0.035)',
  /** ...to #f5f3ff at the bottom. */
  sheen: 'rgba(255, 255, 255, 0.23)',
  /** Tint of the Liquid Glass (iOS 26+). */
  glassTint: 'rgba(245, 244, 255, 0.6)',
  /** The 1 pt near-white rim (#f9f7fb in the app). Not drawn over Liquid Glass. */
  border: 'rgba(255, 255, 255, 0.85)',
  /** Flat capsule behind the active icon. */
  capsule: '#dad9e7',
  /** The app's capsule has no border; set a colour to add a 1 pt one. */
  capsuleBorder: 'transparent',
  /** Every icon, active or not. */
  foreground: '#141417',
};

export type GlassExpandColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: translucent fill, no blur. */
export type GlassExpandMaterial = 'auto' | 'glass' | 'blur' | 'tint';

export interface GlassExpandProps {
  colors?: Partial<GlassExpandColors>;
  /** Default `auto`: glass where available, blur on older iOS, tint on Android. */
  material?: GlassExpandMaterial;
  haptics?: boolean;
}

/**
 * Measured on GO Club's App Store screenshot 1, the only one that shows the bar. The phone is
 * held tilted and turned, so the shot was straightened (rotated 21.8°) and corrected for the
 * turn, taking the pill as centred: about 1.32 px/pt across and 1.46 px/pt down at the bar,
 * ±5%. Pill 322 x 82 pt with round ends, about 40 pt from each screen edge and 22 pt above the
 * screen's bottom edge. Capsule 94 x 70 pt, 6 pt inside the pill. Icon centres 53, 148, 213
 * and 276 pt from the pill's left end: that is, the capsule, then the icons and the far end
 * spaced 30 pt apart.
 */
const PILL_WIDTH = 322;
const INSET = 6;
const CAPSULE_WIDTH = 94;
const CAPSULE_HEIGHT = 70;
/** Gap from the pill's bottom edge to the screen's bottom edge. */
const BOTTOM = 22;
/** Keeps the pill clear of the screen's sides on narrow phones. */
const MIN_MARGIN = 16;

/** Icons and the capsule ease into their new places on one curve; no spring, no bounce. */
const layout = LinearTransition.duration(340)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

function resolveMaterial(material: GlassExpandMaterial): Exclude<GlassExpandMaterial, 'auto'> {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'ios' ? 'blur' : 'tint';
}

export function GlassExpand({
  colors: custom,
  material = 'auto',
  haptics = true,
}: GlassExpandProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const width = Math.min(PILL_WIDTH, window.width - insets.left - insets.right - MIN_MARGIN * 2);
  // The app's pill sits 22 pt above the screen edge, partly over the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(BOTTOM, Platform.OS === 'ios' ? insets.bottom - 12 : insets.bottom + 8);
  const last = tabs.length - 1;
  return (
    <TabBarRoot placement="floating" offset={bottom - insets.bottom}>
      <View style={[styles.pill, { width }]}>
        <View style={[StyleSheet.absoluteFill, styles.clip]}>
          {surface === 'glass' ? (
            <GlassView
              glassEffectStyle="regular"
              tintColor={colors.glassTint}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <>
              {surface === 'blur' ? (
                <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
              ) : null}
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.background,
                    backgroundImage: `linear-gradient(180deg, ${colors.shade}, ${colors.sheen})`,
                  },
                ]}
              />
            </>
          )}
        </View>
        {surface === 'glass' ? null : (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.rim, { borderColor: colors.border }]}
          />
        )}
        <TabList style={styles.list}>
          <TabIndicator
            style={[
              styles.capsule,
              { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
            ]}
          />
          {/* The capsule keeps 6 pt from the pill's end; an icon at the end gets a full gap. */}
          <View style={tabs[0]?.focused ? styles.edge : styles.gap} />
          {tabs.map((tab) => (
            <Fragment key={tab.key}>
              <Tab tab={tab} colors={colors} haptics={haptics} />
              <View style={tab.index === last && tab.focused ? styles.edge : styles.gap} />
            </Fragment>
          ))}
        </TabList>
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
  colors: GlassExpandColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      layout={layout}
      hitSlop={HIT_SLOP}
      style={[styles.tab, tab.focused && styles.tabFocused]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: ICON })}
    </TabButton>
  );
}

/** The icons' 40-unit box, in points: the sneaker draws about 33 x 31 pt, the drop 23 x 29. */
const ICON = 34;
/** Inactive tabs are only as wide as their icon; this reaches into the gaps around them. */
const HIT_SLOP = { left: 12, right: 12, top: INSET, bottom: INSET };

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingVertical: INSET },
  clip: { borderRadius: 999, overflow: 'hidden' },
  rim: {
    borderRadius: 999,
    borderWidth: 1,
    // The faint darker edge inside the rim, top left, that gives the app's pill its bevel.
    boxShadow: 'inset 1px 1.5px 3px rgba(60, 50, 140, 0.07)',
  },
  list: { alignItems: 'center', height: CAPSULE_HEIGHT },
  capsule: { borderRadius: 999, borderWidth: 1 },
  tab: { width: ICON, height: CAPSULE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  tabFocused: { width: CAPSULE_WIDTH },
  gap: { flex: 1 },
  edge: { width: INSET },
});
