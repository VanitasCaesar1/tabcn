/**
 * Frosted Media: a see-through pill that blurs whatever is behind it, with
 * white icons and labels; a raised glass capsule slides to the active tab.
 * Uses iOS Liquid Glass where available, and a dark blur elsewhere (on Android, where
 * expo-blur doesn't blur by default, a dark translucent fill).
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** Warm tint over the blur, and the Liquid Glass tint. */
  tint: 'rgba(120, 84, 56, 0.18)',
  /** The pill's 1 pt edge. */
  border: 'rgba(255, 255, 255, 0.28)',
  /** The raised glass capsule behind the active tab. */
  capsule: 'rgba(255, 255, 255, 0.14)',
  /** The capsule's 1 pt edge. */
  capsuleBorder: 'rgba(255, 255, 255, 0.42)',
  /** Icons and labels, active and inactive alike: only the capsule marks the active tab. */
  foreground: '#ffffff',
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
};

export type FrostedMediaColors = typeof defaultColors;

export interface FrostedMediaProps {
  colors?: Partial<FrostedMediaColors>;
  /** Blur strength when Liquid Glass isn't available. Default 60. */
  intensity?: number;
  /** Light haptic tick on pressing a tab that isn't active. Default true. */
  haptics?: boolean;
}

export function FrostedMedia({
  colors: custom,
  intensity = 60,
  haptics = true,
}: FrostedMediaProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const glass = isLiquidGlassAvailable();
  // Tabs shrink from 82.5 pt down to 60 when the pill would outgrow the screen, and below 60
  // only when even that doesn't fit (6-7 tabs), so no tab is clipped off the pill's end.
  const room = window.width - insets.left - insets.right - LIST_PADDING * 2 - PILL_BORDER * 2;
  const minWidth = Math.max(0, Math.min(MIN_TAB, room / Math.max(1, tabs.length)));
  return (
    <TabBarRoot placement="floating">
      <View style={[styles.pill, { borderColor: colors.border }]}>
        {glass ? (
          // Liquid Glass carries the tint itself; a blur over it would hide it.
          <GlassView
            glassEffectStyle="clear"
            tintColor={colors.tint}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <>
            <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tint }]} />
          </>
        )}
        <TabList style={styles.list}>
          {/* Wider than its tab and nearly the pill's full height, as in the reference. */}
          <TabIndicator
            inset={{ x: -3.5, y: 0 }}
            style={[
              styles.capsule,
              { backgroundColor: colors.capsule, borderColor: colors.capsuleBorder },
            ]}
          />
          {tabs.map((tab) => (
            <Tab key={tab.key} tab={tab} colors={colors} minWidth={minWidth} haptics={haptics} />
          ))}
        </TabList>
      </View>
    </TabBarRoot>
  );
}

/** Every tab is the same white, active or not: only the capsule marks the active tab. */
function Tab({
  tab,
  colors,
  minWidth,
  haptics,
}: {
  tab: TabItem;
  colors: FrostedMediaColors;
  minWidth: number;
  haptics: boolean;
}) {
  const color = colors.foreground;
  const label = (
    <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>
      {tab.label}
    </Text>
  );
  return (
    <TabButton
      tab={tab}
      style={[styles.tab, { minWidth }]}
      // No tick for the tab that's already active: nothing changes.
      onPressIn={haptics && !tab.focused ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.content}>
        {tab.renderIcon ? (
          <View>
            {tab.renderIcon({ focused: tab.focused, color, size: ICON })}
            <Badge badge={tab.badge} colors={colors} />
          </View>
        ) : null}
        {tab.renderIcon ? (
          label
        ) : (
          // Without an icon, the badge sits on the label instead.
          <View style={styles.labelBox}>
            {label}
            <Badge badge={tab.badge} colors={colors} onLabel />
          </View>
        )}
      </View>
    </TabButton>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({
  badge,
  colors,
  onLabel = false,
}: {
  badge: TabItem['badge'];
  colors: FrostedMediaColors;
  /** Drawn on the label's top right (a tab without an icon). */
  onLabel?: boolean;
}) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) {
    return (
      <View
        style={[styles.dot, onLabel ? styles.labelDot : null, { backgroundColor: colors.badge }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, onLabel ? styles.labelCount : null, { backgroundColor: colors.badge }]}
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

/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 23.6;
/** The least tab width while the tabs fit, the list's end padding and the pill's border. */
const MIN_TAB = 60;
const LIST_PADDING = 5.2;
const PILL_BORDER = 1;

const styles = StyleSheet.create({
  pill: {
    // Fits the screen when the tabs' full width doesn't: they shrink instead.
    maxWidth: '100%',
    borderRadius: 999,
    borderWidth: PILL_BORDER,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
  },
  list: { paddingHorizontal: LIST_PADDING, paddingVertical: 2.55 },
  capsule: { borderRadius: 999, borderWidth: 1 },
  tab: {
    width: 82.5,
    flexShrink: 1,
    height: 51.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', gap: 3.5 },
  label: { fontSize: 9.8, fontWeight: '600' },
  labelBox: { maxWidth: '100%' },
  dot: { position: 'absolute', top: -1, right: -3, width: 8, height: 8, borderRadius: 4 },
  count: {
    position: 'absolute',
    top: -5,
    left: ICON - 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // On the label: its top right corner, overhanging a little.
  labelDot: { top: -3, right: -7 },
  labelCount: { left: undefined, top: -11, right: -12 },
  badgeText: { fontSize: 10, lineHeight: 13, fontWeight: '700' },
});
