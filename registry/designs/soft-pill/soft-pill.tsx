/**
 * Soft Pill: a white pill with icons and labels. One grey capsule slides to the
 * active tab on tabcnSpring (no overshoot), and the label turns bold instantly.
 * No press lift or scale: the tab moves only when the press commits.
 * Changed from the reference for clarity: labels are 10.5 pt instead of 9.5 pt, so they read
 * more easily; the tab keeps its 50.7 pt height.
 * On iOS 26 the pill is light Liquid Glass (expo-glass-effect) with no drawn shadow; elsewhere,
 * or with `material="solid"`, it is the white fill. Choose with `material`.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
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
  /** The pill's fill. */
  background: '#fafafa',
  /** The capsule that slides behind the active tab. */
  capsule: '#e5e6e8',
  /** Icons and labels, active and inactive alike (the label turns bold when active). */
  foreground: '#151517',
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text. */
  badgeText: '#ffffff',
  /** Tint over the Liquid Glass (iOS 26). Unset, the glass is clear. */
  glassTint: undefined as string | undefined,
};

export type SoftPillColors = typeof defaultColors;

export interface SoftPillProps {
  colors?: Partial<SoftPillColors>;
  /**
   * The pill's surface: `'glass'` (Liquid Glass, iOS 26), `'solid'` (the white fill with its
   * soft shadow), or `'auto'` (glass where the system has it, solid elsewhere). Default `'auto'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function SoftPill({ colors: custom, material = 'auto', haptics = true }: SoftPillProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  return (
    <TabBarRoot placement="floating">
      <TabList
        style={
          glass ? styles.pill : [styles.pill, styles.shadow, { backgroundColor: colors.background }]
        }
      >
        {glass ? (
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            colorScheme="light"
            tintColor={colors.glassTint}
            style={[StyleSheet.absoluteFill, styles.glass]}
          />
        ) : null}
        <TabIndicator
          inset={CAPSULE_INSET}
          style={[styles.capsule, { backgroundColor: colors.capsule }]}
        />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: SoftPillColors; haptics: boolean }) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon ? (
        <View style={styles.iconBox}>
          {tab.renderIcon({ focused: tab.focused, color: colors.foreground, size: ICON })}
          <Badge badge={tab.badge} colors={colors} />
        </View>
      ) : (
        // No icon: the badge sits where the icon's corner would be.
        <View style={styles.badgeOnly}>
          <Badge badge={tab.badge} colors={colors} />
        </View>
      )}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          styles.label,
          { color: colors.foreground, fontWeight: tab.focused ? '700' : '500' },
        ]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

/**
 * A badge at the icon's top right, drawn only when the tab sets one: an empty badge ('') is a
 * dot, a number a count. Hidden from screen readers: `TabButton` reads it with the label.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: SoftPillColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) {
    return (
      <View
        style={[styles.dot, { backgroundColor: colors.badge, borderColor: colors.background }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge, borderColor: colors.background }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

/** The traced icons' 40-unit box, in points, at the reference's scale. */
const ICON = 18;
const TAB_WIDTH = 63;
const TAB_HEIGHT = 50.7;
const PILL_PADDING = 3.8;
/** On a narrow screen the tabs shrink to fit, down to this width. */
/** Tabs shrink to fit down to this; low enough that seven fit a 320 pt screen. */
const MIN_TAB_WIDTH = 32;
/**
 * The active capsule is wider than its tab and overlaps its neighbours' padding:
 * a negative x inset grows the indicator past the tab's frame (63 + 2 * 3.75 = 70.5 pt).
 */
const CAPSULE_OVERHANG = 3.75;
const CAPSULE_INSET = { x: -CAPSULE_OVERHANG, y: 0 };

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  badgeOnly: { position: 'absolute', top: 4, right: 10 },
  pill: {
    // Fits the screen when the tabs' full width doesn't: they shrink instead.
    maxWidth: '100%',
    borderRadius: 999,
    paddingVertical: PILL_PADDING,
    paddingHorizontal: 8,
  },
  shadow: { boxShadow: '0 10px 28px rgba(60, 40, 20, 0.14)' },
  // The pill's own radius (half its 58.3 pt height), set exactly: the glass draws its corners
  // from it.
  glass: { borderRadius: (TAB_HEIGHT + PILL_PADDING * 2) / 2 },
  capsule: { borderRadius: 999 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    // Icon 18 + gap 5 + label line 13 + top padding 2.5 = 38.5 pt, inside the fixed 50.7 pt tab.
    gap: 5,
    paddingTop: 2.5,
    width: TAB_WIDTH,
    flexShrink: 1,
    minWidth: MIN_TAB_WIDTH,
    height: TAB_HEIGHT,
  },
  iconBox: { width: ICON, height: ICON },
  // 10.5 pt (the reference's is 9.5) with a fixed line height, so the tab's content is the
  // same height on every platform and font scale up to the 1.3 cap stays inside the tab.
  label: { fontSize: 10.5, lineHeight: 13 },
  // A ring in the bar's colour separates the dot from the icon's ink; the coloured dot keeps
  // its size inside it.
  dot: {
    position: 'absolute',
    top: -2.5,
    right: -4.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  count: {
    position: 'absolute',
    // Nudged out so it covers less of the icon, with the same ring as the dot.
    top: -7.5,
    left: ICON - 4.5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9.5, lineHeight: 12, fontWeight: '700' },
});
