/**
 * Mono Type: CHANI's tab bar. A white bar docked flush to the bottom edge, topped by a
 * rough, hand-inked black rule across the full width. Five outline line icons sit over
 * uppercase monospace labels; the active tab only changes colour (icon and label turn
 * magenta). Nothing moves, grows or fills: the colours change on tabcnTiming and that's it.
 * The accent icon fades in over an always-opaque plain copy, so the icon never dims mid-way;
 * the badge dot fades (no scale pop); presses show no dim or scale; reduce motion is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 *
 * Measured on the app's App Store screenshots (iPhone 17 Pro, 402 pt wide, 2.211 px/pt):
 * a 1.2 pt white paper edge, then a 3 pt black rule with a grainy top edge. From the rule's
 * bottom edge: icon ink starts 15 pt down and is 26-28.5 pt; label caps run 56.5-64.7 pt;
 * the screen ends 93.5 pt down (the labels sit 9 pt into the home-indicator area).
 * Tabs are 76.2 pt apart with a 10.5 pt inset at each side.
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, which also fills the home-indicator area, and the rule's paper flecks. */
  background: '#ffffff',
  /** The inked rule along the top edge. */
  rule: '#000000',
  /** The active tab's icon and label. */
  accent: '#b615a3',
  /** The other tabs' icons and labels. */
  foreground: '#2a2a2c',
  /** The badge dot. */
  badge: '#b615a3',
};

export type MonoTypeColors = typeof defaultColors;

export interface MonoTypeProps {
  colors?: Partial<MonoTypeColors>;
  /**
   * Label font. The app uses a regular-weight grotesque mono (IBM Plex Mono is close:
   * load `IBMPlexMono_400Regular` and pass it here). Default: Menlo on iOS, monospace elsewhere.
   */
  fontFamily?: string;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/** Icon box in points: the traced glyphs fill about 92% of it, giving the app's 26-28.5 pt ink. */
const ICON = 30.5;
/** The rule strip: a 1.2 pt white paper edge, then 3 pt of black ink. */
const RULE_HEIGHT = 4.2;
/** From the rule's bottom edge to the top of the home-indicator overlap. */
const BAR = 68.5;
/** The app lets the labels sit this far into the bottom safe area. */
const INSET_OVERLAP = 9;
const MIN_BOTTOM = 8;

/**
 * The inked rule, in a 402 x 4.2 box stretched to the bar's width: solid black over its
 * bottom 3 pt with a grainy top edge, and a few paper-coloured flecks (even-odd holes).
 */
const RULE_PATH =
  'M0 4.2L0 1.6L2 1.6L3.9 1.6L5.7 1.3L8.1 1.2L10.4 1.4L11.8 1.6L13.3 1.5L14.9 1.2L15.9 1.2L17.8 1.3L19 1.9L21.2 1.3L22.1 1.5L23.2 1.5L24.8 1.3L26.5 1.4L28.8 1.5L31.2 1.4L32.3 1.4L33.8 1.6L34.9 1.9L36.3 1.5L37.9 1.9L39 1.4L40 1.5L41.3 1.2L42.7 1.8L44.3 1.9L46 1.3L47.1 1.3L48.3 1.3L49.7 1.4L51.6 1.8L53.4 1.4L55.7 1.3L57 1.5L58.3 1.6L60.7 1.4L62.3 1.2L63.5 1.6L65.2 1.6L67.5 1.5L68.9 1.5L71.3 1.2L73.1 1.4L74.9 1.3L75.8 1.5L77.3 1.5L78.6 1.5L79.6 1.5L81.7 1.3L83.1 1.7L84.1 1.7L85.4 1.3L86.3 1.5L87.4 1.3L88.7 1.4L90.4 1.5L92.2 1.5L94.2 1.2L95.7 1.3L97.9 1.4L100.1 1.6L101.9 1.5L103.8 1.4L105.8 1.5L107.3 1.3L108.6 1.4L110.9 1.3L112.6 1.6L113.8 1.3L115.7 1.2L116.7 1.3L117.7 1.2L119.6 1.4L121.5 1.3L123.2 1.4L124.8 1.5L126.4 1.3L127.7 1.3L128.7 1.5L130.6 1.2L132.8 1.5L135 1.3L136.6 1.4L137.8 1.5L139.6 1.5L141 1.4L143.3 1.6L144.3 1.4L145.2 1.5L147 1.2L149.1 1.5L151.4 1.2L153.6 1.5L155.5 1.4L156.7 1.6L157.8 1.4L159.3 1.3L161.3 1.4L163 1.3L165 1.3L166.7 1.5L169 1.2L169.9 1.4L171.1 1.3L172.7 1.9L174.2 1.6L175.8 1.3L177.3 1.5L179.5 1.3L180.7 1.4L181.6 1.3L182.8 1.3L185.2 1.6L187 1.4L188.4 1.5L189.5 1.6L190.4 1.2L192 1.5L194.4 1.3L196.8 1.5L197.9 1.6L199.5 1.5L200.5 1.4L202.8 1.6L204.8 1.2L206.4 1.3L208 1.4L208.9 2L210.5 1.4L211.5 1.5L213 1.8L214 1.5L216.3 1.4L218.2 1.2L219.2 1.4L220.2 1.2L221.9 1.5L224.1 1.3L225.6 1.2L226.7 1.2L227.9 1.4L228.9 1.2L231.2 1.5L232.3 1.3L233.6 1.4L235.9 1.3L236.8 1.6L239 1.5L241.3 1.3L243.5 1.4L244.7 1.3L246.5 1.5L248.5 1.9L249.8 1.9L251.6 1.2L253.2 1.4L255.5 1.4L257.6 1.5L259 1.4L261.3 1.3L263.2 1.4L264.4 1.5L266.7 1.2L267.9 1.4L269.6 1.3L271.2 1.3L273.5 1.3L275.8 1.8L277.1 1.5L279.5 1.3L281 1.3L282.8 1.2L284.4 1.4L285.4 1.2L286.6 1.3L288.5 1.2L289.6 1.6L291 1.2L292.1 1.5L293.1 1.3L294.9 1.5L295.9 1.4L297 1.5L298.7 1.5L300.9 1.5L303.1 1.6L305.4 1.2L307.6 1.3L309.7 1.5L310.6 1.3L312.5 1.5L313.5 1.5L315.2 1.9L316.7 1.4L318.8 1.4L320.6 1.4L322.3 1.3L324.2 1.6L325.9 1.4L327.2 1.4L328.2 1.5L329.2 1.6L330.3 1.3L332 1.3L334.1 1.4L335.2 1.6L337.4 1.3L338.8 1.8L340.9 1.6L343.2 1.6L344.7 1.3L346.8 1.4L348.6 1.5L349.8 1.5L350.8 1.5L353.1 1.3L355.3 1.4L357.4 1.5L359.1 1.9L361.3 1.5L363.2 1.4L365.5 1.6L366.5 1.5L368.3 1.3L370.6 1.5L371.6 1.4L373.8 1.4L375.3 1.3L377.1 1.5L379.2 1.5L380.6 1.4L382.1 1.5L383.3 1.8L384.4 1.4L386.6 1.4L387.9 1.4L390.2 1.4L392 1.3L393.3 1.4L395.3 1.5L396.6 1.3L397.6 1.5L398.7 1.4L401 1.2L402 1.6L402 4.2Z' +
  'M101.8 2.9h0.3v0.3h-0.3ZM292.7 2.0h0.3v0.3h-0.3ZM221.1 3.2h0.8v0.3h-0.8ZM315.8 2.9h0.8v0.3h-0.8ZM331.5 1.8h0.5v0.3h-0.5ZM45.1 1.9h0.9v0.3h-0.9ZM23.7 3.3h0.5v0.3h-0.5ZM206.5 2.3h0.7v0.3h-0.7ZM164.1 2.2h0.3v0.3h-0.3ZM346.5 1.9h0.8v0.3h-0.8ZM333.7 1.8h0.3v0.3h-0.3ZM141.9 3.0h0.4v0.3h-0.4ZM53.1 2.9h0.9v0.3h-0.9ZM102.2 3.3h0.3v0.3h-0.3ZM194.9 2.5h0.9v0.3h-0.9ZM390.9 2.7h0.8v0.3h-0.8ZM249.2 2.0h0.9v0.3h-0.9ZM47.7 2.2h1.0v0.3h-1.0ZM369.5 2.9h0.6v0.3h-0.6ZM119.8 2.3h0.4v0.3h-0.4ZM15.9 1.9h0.7v0.3h-0.7ZM233.9 3.3h0.9v0.3h-0.9ZM170.4 1.9h0.8v0.3h-0.8ZM313.6 2.2h0.4v0.3h-0.4ZM395.1 2.9h0.5v0.3h-0.5ZM299.8 1.9h0.5v0.3h-0.5ZM363.6 2.5h0.8v0.3h-0.8ZM302.4 2.9h0.6v0.3h-0.6ZM144.0 2.6h0.8v0.3h-0.8ZM201.8 1.8h0.6v0.3h-0.6ZM194.1 2.7h0.6v0.3h-0.6ZM199.8 3.1h0.8v0.3h-0.8ZM123.0 1.9h0.9v0.3h-0.9ZM234.6 1.8h0.6v0.3h-0.6ZM252.5 3.4h0.5v0.3h-0.5ZM53.9 2.5h0.4v0.3h-0.4Z';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function MonoType({ colors: custom, fontFamily, haptics = true }: MonoTypeProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const bottom = Math.max(insets.bottom - INSET_OVERLAP, MIN_BOTTOM);
  return (
    <TabBarRoot
      placement="docked"
      style={{
        backgroundColor: colors.background,
        paddingBottom: bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View style={styles.rule} pointerEvents="none">
        <Svg
          width="100%"
          height={RULE_HEIGHT}
          viewBox={`0 0 402 ${RULE_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Path d={RULE_PATH} fill={colors.rule} fillRule="evenodd" />
        </Svg>
      </View>
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            colors={colors}
            fontFamily={fontFamily ?? mono}
            haptics={haptics}
          />
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
  colors: MonoTypeColors;
  fontFamily: string | undefined;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  // Strings, not `colors`: a worklet that captured the object made on each render would
  // restart its animated style on every render.
  const fromColor = colors.foreground;
  const toColor = colors.accent;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [fromColor, toColor]),
  }));
  // The accent copy fades in over the plain one, which stays opaque until the last stretch
  // (no dip in ink mid-change) and then drops out, so the accent icon rests with no dark
  // anti-aliased fringe from the copy under it.
  const inactive = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));
  const accent = useAnimatedStyle(() => ({ opacity: progress.value }));

  // The badge dot stays mounted so it can fade out as well as in (opacity only).
  const hasBadge = tab.badge != null;
  const badgeOpacity = useSharedValue(hasBadge ? 1 : 0);
  useEffect(() => {
    badgeOpacity.value = withTiming(hasBadge ? 1 : 0, tabcnTiming);
  }, [hasBadge, badgeOpacity]);
  const badge = useAnimatedStyle(() => ({ opacity: badgeOpacity.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, inactive]}>
          {tab.renderIcon?.({ focused: false, color: colors.foreground, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, accent]}>
          {tab.renderIcon?.({ focused: false, color: colors.accent, size: ICON })}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.badge,
            { backgroundColor: colors.badge, borderColor: colors.background },
            badge,
          ]}
        />
      </View>
      {/* A long label (TRANSITS on a 320 pt screen) shrinks a little to fit its slot rather
          than being cut short; at the app's widths it never needs to. */}
      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, { fontFamily }, label]}
      >
        {tab.label.toUpperCase()}
      </Animated.Text>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  // Docked full width with no radius or shadow; the rule is the only edge.
  rule: { height: RULE_HEIGHT },
  // Icon box top 14 pt below the rule (ink starts at 15 pt); 10.5 pt side insets give the
  // app's 76.2 pt pitch on a 402 pt screen.
  bar: { height: BAR, paddingTop: 14, paddingHorizontal: 10.5 },
  // 9.2 pt from the icon box to the label's line box puts the caps at 56.5-65 pt.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 9.2 },
  iconBox: { width: ICON, height: ICON },
  center: { alignItems: 'center', justifyContent: 'center' },
  // Menlo at 12.4 pt matches the app's 7.5 pt character advance; no letter spacing.
  label: { fontSize: 12.4, letterSpacing: 0, includeFontPadding: false },
  // A ring in the bar's colour separates the dot from the icon's ink; the coloured dot keeps
  // its size inside it.
  badge: {
    position: 'absolute',
    top: -0.5,
    right: -1.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
