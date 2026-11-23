/**
 * Button Row: Uber Eats' tab bar. No bar at all: five separate white buttons float in one row
 * at the bottom of the screen (circle, circle, a wide Search pill, circle, circle), each with
 * a thin light-grey border and a soft shadow. Behind them a white fade rises from the bottom
 * of the screen, so content scrolling under the row dissolves into white instead of meeting
 * a hard edge.
 *
 * The circles are icon-only (their names are read by screen readers); the pill shows its icon
 * and its label side by side. The active tab's icon turns from a grey outline into a filled
 * black glyph. Nothing else changes: no capsule, dot or tint, and the buttons never move.
 *
 * Motion (inferred: the store has only stills, all with Home active): the outline and filled
 * icons crossfade on tabcnTiming (200 ms, ease-out), and the pill's label changes colour with
 * them. Nothing scales, lifts or bounces; presses show no dim or shrink. With Reduce Motion
 * on, the swap is instant.
 *
 * Not glass: the buttons are solid white. Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The buttons' fill. */
  background: '#ffffff',
  /**
   * The buttons' 1 pt edge. Translucent, so it stays a hairline on a tinted fill: over white
   * it comes out as the measured #dbdbdb.
   */
  border: 'rgba(0, 0, 0, 0.14)',
  /** The drop shadow, heavier below: about 7% dark right under a button, gone 18 pt down. */
  shadow: 'rgba(0, 0, 0, 0.1)',
  /** Inactive icons and the pill's label (measured #5e5e5e, the same in both screenshots). */
  foreground: '#5e5e5e',
  /** The active tab's filled icon (and the pill's label while it is active). */
  active: '#000000',
  /** The fade behind the row: the screen's own background colour. */
  scrim: '#ffffff',
  /** Not shown in the app's screenshots; black with white text, in Uber's colours. */
  badge: '#000000',
  badgeText: '#ffffff',
};

export type ButtonRowColors = typeof defaultColors;

export interface ButtonRowProps {
  colors?: Partial<ButtonRowColors>;
  /**
   * Index of the tab drawn as the wide pill, with its label beside its icon (the app's
   * Search). Default: the middle tab, index 2 of 5. Pass -1 to draw every tab as a circle.
   */
  wideTab?: number;
  /**
   * The pill's label font. The app uses Uber Move Text Medium, which isn't freely licensed.
   * Default: the system font at weight 500.
   */
  fontFamily?: string;
  /**
   * The white fade behind the row. Default true. Turn it off on screens that pad their content
   * clear of the bar anyway, or when a panel peeks above the bar (the fade covers its foot).
   */
  scrim?: boolean;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on Uber Eats' App Store screenshots (an iPhone 17 Pro screen, 402 pt wide, at
 * 2.448 px per pt): 49 pt buttons (outer size, border included), centres 56 pt apart so 7 pt
 * between them, 16 pt from the screen's sides, so the pill takes the 146 pt left over and its
 * centre is the screen's. Button bottoms sit 35 pt above the screen's bottom edge: the
 * home-indicator inset (34) plus 1. Icons are drawn in a 24 pt box (0.6 pt per unit of their
 * 40-unit artwork), centred in their buttons. The pill's magnifier and label are centred
 * together, 8.2 pt of space between the glyph's ink and the word's; the label is 15 pt medium
 * (a 10.6 pt cap height, in Uber Move in the app).
 */
const BUTTON = 49;
const SIDE = 16;
const GAP = 7;
/** Above the bottom safe-area inset (iOS home indicator). */
const ABOVE_INSET = 1;
/** From the screen's bottom edge where there is no inset to sit above. */
const MIN_BOTTOM = 12;
const ICON = 24;
/** Blank space each side of the magnifier inside its 24 pt box (the glyph is 14.8 pt wide). */
const ICON_SIDE_SPACE = 4.6;
/** Glyph to word: 8.2 pt measured between the inks, less the 'S's own ~0.5 pt side bearing. */
const LABEL_GAP = 7.7;
/**
 * Below this width (a 320 pt screen leaves the pill about 64 pt) the label would be cut to a
 * letter, so the pill shows its icon alone; its name is still read by screen readers.
 */
const MIN_LABELLED_PILL = 100;

/**
 * The fade, measured over photos scrolling under the row by how much of their contrast is
 * left: clear 27 pt above the buttons' tops, about 58% white 8 pt above them, 80% at their
 * tops, 90% at their middles, 97% at their bottoms and solid from 10 pt below them down to
 * the screen's edge. No blur: the photos stay sharp up to where they fade.
 */
const SCRIM_ABOVE = 27;
/**
 * The fade's stops: points below the buttons' tops (negative is above), white's opacity. The
 * last one's colour carries on down to the screen's edge.
 */
const scrimStops = (button: number): readonly (readonly [number, number])[] => [
  [-SCRIM_ABOVE, 0],
  [-8, 0.58],
  [0, 0.8],
  [button / 2, 0.9],
  [button, 0.97],
  [button + 10, 1],
];

export function ButtonRow({
  colors: custom,
  wideTab,
  fontFamily,
  scrim = true,
  haptics = true,
}: ButtonRowProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  const wide = wideTab ?? Math.floor(tabs.length / 2);
  // 49 pt buttons, as in the app, shrunk only when the row can't hold them all (7 tabs): every
  // button, the pill included, then gets the same share of the row.
  const row = window.width - insets.left - insets.right - SIDE * 2;
  const count = Math.max(1, tabs.length);
  const size = Math.max(0, Math.min(BUTTON, (row - GAP * (count - 1)) / count));

  // The app's buttons end 1 pt above the home indicator's inset. Where there's no inset
  // (older iPhones, some Android navigation modes) they keep a small gap from the edge.
  const bottom =
    Platform.OS === 'ios' && insets.bottom > 0
      ? insets.bottom + ABOVE_INSET
      : insets.bottom + MIN_BOTTOM;
  const surface: ViewStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    boxShadow: `0 3px 14px ${colors.shadow}`,
  };

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot placement="floating" offset={bottom - insets.bottom} style={styles.root}>
      {scrim ? (
        <Scrim
          color={colors.scrim}
          button={size}
          bottom={bottom}
          left={SIDE + insets.left}
          right={SIDE + insets.right}
        />
      ) : null}
      <TabList style={[styles.list, wide < 0 || wide >= tabs.length ? styles.spread : null]}>
        {tabs.map((tab) =>
          tab.index === wide ? (
            <WideTab
              key={tab.key}
              tab={tab}
              colors={colors}
              surface={surface}
              size={size}
              fontFamily={fontFamily}
              haptics={haptics}
            />
          ) : (
            <CircleTab
              key={tab.key}
              tab={tab}
              colors={colors}
              surface={surface}
              size={size}
              haptics={haptics}
            />
          ),
        )}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The white fade behind the row. It reaches from SCRIM_ABOVE over the buttons down to the
 * screen's bottom edge and out to its sides, outside the bar's own box, and takes no touches.
 */
function Scrim({
  color,
  button,
  bottom,
  left,
  right,
}: {
  color: string;
  /** The buttons' height. */
  button: number;
  bottom: number;
  left: number;
  right: number;
}) {
  const height = SCRIM_ABOVE + button + bottom;
  // Where a point below the buttons' tops falls along the fade, 0 at its top and 1 at the
  // screen's edge.
  const at = (belowTops: number) => Math.min(1, (SCRIM_ABOVE + belowTops) / height);
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.scrim, { bottom: -bottom, left: -left, right: -right }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="button-row-scrim" x1={0} y1={0} x2={0} y2={1}>
            {scrimStops(button).map(([belowTops, opacity]) => (
              <Stop
                key={belowTops}
                offset={at(belowTops)}
                stopColor={color}
                stopOpacity={opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#button-row-scrim)" />
      </Svg>
    </View>
  );
}

/**
 * The outline icon and the filled one, stacked. The filled copy fades in over the outline,
 * which stays opaque until the last stretch (no dip in ink mid-change) and then drops out, so
 * the active glyph rests alone.
 */
function Icon({ tab, colors }: { tab: TabItem; colors: ButtonRowColors }) {
  const progress = useFocusProgress(tab);
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, inactive]}>
        {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, active]}>
        {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
      </Animated.View>
    </>
  );
}

/** An icon-only round button. The tab's label is its accessibility label. */
function CircleTab({
  tab,
  colors,
  surface,
  size,
  haptics,
}: {
  tab: TabItem;
  colors: ButtonRowColors;
  surface: ViewStyle;
  size: number;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={[styles.button, surface, { width: size, height: size, borderRadius: size / 2 }]}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Icon tab={tab} colors={colors} />
      </View>
      <Badge tab={tab} colors={colors} />
    </TabButton>
  );
}

/** The wide pill (the app's Search): its icon and label side by side, centred together. */
function WideTab({
  tab,
  colors,
  surface,
  size,
  fontFamily,
  haptics,
}: {
  tab: TabItem;
  colors: ButtonRowColors;
  surface: ViewStyle;
  size: number;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // Strings, not `colors`: a worklet that captured the object made on each render would
  // restart its animated style on every render.
  const fromColor = colors.foreground;
  const toColor = colors.active;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [fromColor, toColor]),
  }));
  const [narrow, setNarrow] = useState(false);
  return (
    <TabButton
      tab={tab}
      style={[styles.button, styles.pill, surface, { height: size, borderRadius: size / 2 }]}
      onLayout={(e) => setNarrow(e.nativeEvent.layout.width < MIN_LABELLED_PILL)}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={[styles.icon, !narrow && styles.pillIcon]}>
        <Icon tab={tab} colors={colors} />
      </View>
      {narrow ? null : (
        <Animated.Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.label, fontFamily ? { fontFamily } : styles.medium, label]}
        >
          {tab.label}
        </Animated.Text>
      )}
      <Badge tab={tab} colors={colors} />
    </TabButton>
  );
}

/** A count badge at the button's top right. Read with the tab's label, not on its own. */
function Badge({ tab, colors }: { tab: TabItem; colors: ButtonRowColors }) {
  if (tab.badge == null) return null;
  // An empty badge is a dot.
  if (String(tab.badge).trim() === '') {
    return (
      <View
        pointerEvents="none"
        style={[styles.dot, { backgroundColor: colors.badge, borderColor: colors.background }]}
      />
    );
  }
  const text = { color: colors.badgeText };
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, { backgroundColor: colors.badge, borderColor: colors.background }]}
    >
      {typeof tab.badge === 'number' ? (
        <BadgeCount value={tab.badge} textStyle={[styles.badgeText, text]} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[styles.badgeText, text, styles.badgeTextCap]}
        >
          {tab.badge}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  root: {
    alignSelf: 'stretch',
    marginHorizontal: SIDE,
  },
  list: {
    gap: GAP,
    alignItems: 'center',
  },
  spread: {
    justifyContent: 'space-between',
  },
  scrim: {
    position: 'absolute',
    top: -SCRIM_ABOVE,
  },
  button: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  // The 24 pt box is wider than the 15 pt magnifier: pull it out so the glyph and the word
  // centre together, with the measured space between them.
  pillIcon: {
    marginLeft: -ICON_SIDE_SPACE,
    marginRight: LABEL_GAP - ICON_SIDE_SPACE,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    flexShrink: 1,
  },
  medium: {
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
});
