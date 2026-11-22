/**
 * Glass Expand: GO Club's tab bar. A wide, near-white lavender glass pill floats low over the
 * screen, with icon-only tabs and no labels. The active tab sits in a flat grey-lavender
 * capsule; the inactive icons are spaced evenly to the right of it. All icons are the same
 * near-black in both states, so the capsule is the only active cue. When the tab changes, the
 * capsule glides to its new place and every icon glides to its own, all on one critically
 * damped spring: no bounce, no jump, no squeeze. With Reduce Motion on, they move at once.
 *
 * The pill is Apple's Liquid Glass on iOS 26 and later, a frosted blur on older iOS and on the
 * web, and a translucent tint on Android (no blur there). Force one with `material`. Outside Liquid Glass
 * it gets a soft top-to-bottom shading and a 1 pt white rim, as in the app.
 *
 * Contrast: the capsule, the only active cue, is kept as the app has it (low contrast against
 * the pill). Set `colors.activeForeground` to give the active icon a colour of its own, which
 * crossfades in on tabcnTiming, so the active tab can meet 3:1.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { Fragment, useEffect, useRef } from 'react';
import { I18nManager, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnSpring,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

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
  /** Every icon, active or not (the inactive ones when `activeForeground` is set). */
  foreground: '#141417',
  /**
   * The active tab's icon, crossfaded in on tabcnTiming. Unset (the default), it is
   * `foreground` like the rest, as in the app.
   */
  activeForeground: undefined as string | undefined,
  /** Badge fill. The app shows none; drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
};

export type GlassExpandColors = typeof defaultColors;

/**
 * `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur (iOS and web). `tint`: translucent
 * fill, no blur.
 */
export type GlassExpandMaterial = 'auto' | 'glass' | 'blur' | 'tint';

export interface GlassExpandProps {
  colors?: Partial<GlassExpandColors>;
  /** Default `auto`: glass where available, blur on older iOS and web, tint on Android. */
  material?: GlassExpandMaterial;
  /** Light haptic tick on press. Default true. */
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

/** Where each tab and the capsule sit for one active tab, in points. */
interface Slots {
  /**
   * `start`: offset from the row's start edge (the right in RTL), for layout styles.
   * `left` and `center`: from the row's physical left edge, for transforms.
   */
  tabs: { start: number; left: number; width: number; center: number }[];
  /** Physical left edge of the capsule, or null with no active tab. */
  capsule: number | null;
  /** The capsule's width: 94 pt, narrower only when the row can't hold it (7 tabs, 320 pt). */
  capsuleWidth: number;
  /** The flexible gap between icons. */
  gap: number;
}

/**
 * Lays the row out the way the app does: the capsule keeps 6 pt from the pill's end when it is
 * the first or last tab, and every other gap (between icons, and an icon to the pill's end) is
 * the same flexible width. Computed rather than measured, so the capsule and the icons get
 * their final places on the very render that changes the tab.
 */
function computeSlots(width: number, count: number, active: number): Slots {
  const isEdge = (spacer: number) =>
    (spacer === 0 && active === 0) || (spacer === count && active === count - 1);
  const hasActive = active >= 0 && active < count;
  // Everything but the capsule: the inactive icons and the 6 pt edge spaces.
  let rest = 0;
  let gaps = 0;
  for (let i = 0; i < count; i++) if (i !== active) rest += ICON;
  for (let spacer = 0; spacer <= count; spacer++) {
    if (isEdge(spacer)) rest += INSET;
    else gaps += 1;
  }
  // The capsule gives up width (never below an icon's) before the row overflows the pill.
  const capsuleWidth = hasActive
    ? Math.max(ICON, Math.min(CAPSULE_WIDTH, width - rest))
    : CAPSULE_WIDTH;
  const fixed = rest + (hasActive ? capsuleWidth : 0);
  const gap = gaps > 0 ? Math.max(0, (width - fixed) / gaps) : 0;
  const tabs: Slots['tabs'] = [];
  let x = 0;
  let capsule: number | null = null;
  for (let i = 0; i < count; i++) {
    x += isEdge(i) ? INSET : gap;
    const w = i === active ? capsuleWidth : ICON;
    // Layout reads `start` right to left in RTL by itself; transforms are physical, so the
    // drawn parts mirror their own offset.
    const left = I18nManager.isRTL ? width - x - w : x;
    tabs.push({ start: x, left, width: w, center: left + w / 2 });
    if (i === active) capsule = left;
    x += w;
  }
  return { tabs, capsule, capsuleWidth, gap };
}

/**
 * A position that jumps into place on first render and glides on tabcnSpring (critically
 * damped, overshoot clamped, instant with Reduce Motion) when the active tab changes. Every
 * moving part uses it, so the capsule and the icons start on the same frame and arrive together.
 */
function useGlide(target: number, activeIndex: number): SharedValue<number> {
  const value = useSharedValue(target);
  const shown = useRef(activeIndex);
  useEffect(() => {
    const from = shown.current;
    shown.current = activeIndex;
    value.value =
      from !== activeIndex && from >= 0 && activeIndex >= 0
        ? withSpring(target, tabcnSpring)
        : target;
  }, [target, activeIndex, value]);
  return value;
}

function resolveMaterial(material: GlassExpandMaterial): Exclude<GlassExpandMaterial, 'auto'> {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  // expo-blur blurs on web too (CSS backdrop-filter); only Android gets the plain tint.
  return Platform.OS === 'android' ? 'tint' : 'blur';
}

export function GlassExpand({
  colors: custom,
  material = 'auto',
  haptics = true,
}: GlassExpandProps) {
  const colors = { ...defaultColors, ...custom };
  const surface = resolveMaterial(material);
  const { tabs, insets, activeIndex } = useTabBar();
  const window = useWindowDimensions();
  const width = Math.min(PILL_WIDTH, window.width - insets.left - insets.right - MIN_MARGIN * 2);
  // The app's pill sits 22 pt above the screen edge, partly over the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(BOTTOM, Platform.OS === 'ios' ? insets.bottom - 12 : insets.bottom + 8);
  const slots = computeSlots(width, tabs.length, activeIndex);
  // Inactive tabs are only as wide as their icon; the slop reaches into the gaps around them,
  // but never past the middle of a gap, where the next tab's slop begins.
  const side = Math.min(HIT_SLOP, slots.gap / 2);
  const hitSlop = { left: side, right: side, top: INSET, bottom: INSET };
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
          <Capsule
            left={slots.capsule}
            width={slots.capsuleWidth}
            activeIndex={activeIndex}
            colors={colors}
          />
          {tabs.map((tab) => {
            const slot = slots.tabs[tab.index];
            if (!slot) return null;
            return (
              <Tab
                key={tab.key}
                tab={tab}
                slot={slot}
                hitSlop={hitSlop}
                activeIndex={activeIndex}
                colors={colors}
                haptics={haptics}
              />
            );
          })}
        </TabList>
      </View>
    </TabBarRoot>
  );
}

/** The flat capsule: a fixed 94 x 70 pt that only slides, so it never squeezes mid-move. */
function Capsule({
  left,
  width,
  activeIndex,
  colors,
}: {
  left: number | null;
  width: number;
  activeIndex: number;
  colors: GlassExpandColors;
}) {
  const x = useGlide(left ?? 0, activeIndex);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  if (left === null) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.capsule,
        PHYSICAL_LEFT,
        { width, backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
        style,
      ]}
    />
  );
}

/**
 * The button is the touch target and takes its new place at once (it draws nothing). The icon
 * is drawn beside it, not inside it, and glides from its old centre to its new one, so the
 * button's change of width can't snap it sideways.
 */
function Tab({
  tab,
  slot,
  hitSlop,
  activeIndex,
  colors,
  haptics,
}: {
  tab: TabItem;
  slot: Slots['tabs'][number];
  hitSlop: { left: number; right: number; top: number; bottom: number };
  activeIndex: number;
  colors: GlassExpandColors;
  haptics: boolean;
}) {
  const center = useGlide(slot.center, activeIndex);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: center.value - ICON / 2 }],
  }));
  // With `activeForeground`, the active colour fades in over the idle one, which stays opaque
  // until late in the change, so the icon never looks dimmed half-way.
  const progress = useFocusProgress(tab);
  const outgoing = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [1, 0], 'clamp'),
  }));
  const incoming = useAnimatedStyle(() => ({ opacity: progress.value }));
  const icon = (color: string) =>
    tab.renderIcon?.({ focused: tab.focused, color, size: ICON }) ?? null;
  return (
    <Fragment>
      <TabButton
        tab={tab}
        hitSlop={hitSlop}
        style={[styles.tab, { start: slot.start, width: slot.width }]}
        onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
      />
      <Animated.View pointerEvents="none" style={[styles.icon, PHYSICAL_LEFT, iconStyle]}>
        {colors.activeForeground === undefined ? (
          icon(colors.foreground)
        ) : (
          <>
            <Animated.View style={[styles.layer, outgoing]}>
              {icon(colors.foreground)}
            </Animated.View>
            <Animated.View style={[styles.layer, incoming]}>
              {icon(colors.activeForeground)}
            </Animated.View>
          </>
        )}
        <Badge badge={tab.badge} colors={colors} />
      </Animated.View>
    </Fragment>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: GlassExpandColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) return <View style={[styles.dot, { backgroundColor: colors.badge }]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

/** The icons' 40-unit box, in points: the sneaker draws about 33 x 31 pt, the drop 23 x 29. */
const ICON = 34;
/** How far an inactive tab's touch target reaches into the gaps beside its icon, at most. */
const HIT_SLOP = 12;

/**
 * The capsule and icons move by physical x (transforms don't flip in RTL), but React Native
 * reads `left` as the start edge in a right-to-left layout unless the app turned that swap
 * off. Pin them to the physical left either way.
 */
const PHYSICAL_LEFT =
  I18nManager.isRTL && (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 };

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
  capsule: {
    position: 'absolute',
    top: 0,
    height: CAPSULE_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
  },
  tab: { position: 'absolute', top: 0, height: CAPSULE_HEIGHT },
  icon: {
    position: 'absolute',
    top: (CAPSULE_HEIGHT - ICON) / 2,
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // One colour of the icon, stacked over the other in the icon's box.
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  count: {
    position: 'absolute',
    top: -3,
    left: ICON - 12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
