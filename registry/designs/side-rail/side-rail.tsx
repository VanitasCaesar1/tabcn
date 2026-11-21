/**
 * Side Rail: Google Drive's tablet navigation, a Material 3 navigation rail. A 96 pt column
 * on the left edge, the same pale blue-grey as the app's chrome, with no divider or shadow
 * against the screens. Each tab is an icon over a sentence-case label; the active one sits on
 * a light-blue pill (56 x 32 pt, behind the icon only), its icon turns filled and dark blue,
 * and its label turns blue. Above the tabs there's an optional header: a menu button and a
 * "New" button (a 56 pt rounded square with a plus), shown when you pass their callbacks.
 *
 * One component serves phones and tablets. When the navigator's `tabBarPosition` is `left`
 * it draws the rail; otherwise it draws the same tabs as a docked Material 3 bottom bar
 * (80 pt, a 64 x 32 pt pill), as Drive does on phones.
 *
 * Panels (Mini Player, Quick Create) are not drawn while the bar is a rail: `TabBarRoot`
 * leaves them out there, so on tablets their `peek()` and `open()` change state but show
 * nothing. Give those screens another way to reach the player or the create actions.
 *
 * Motion: the pill glides to the new tab on tabcn's critically damped spring (vertically on
 * the rail, sideways in the bottom bar) while the icons crossfade from outlined to filled and
 * the colours change. Nothing scales or bounces. Drive itself grows the new pill out of its
 * centre; the glide is tabcn's variant. With "reduce motion" on, every change is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import {
  I18nManager,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  BadgeCount,
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  useTabBar,
  useTabIndicator,
} from 'react-native-tabcn';

/** Google's Material 3 light tokens, as measured on the screenshots. */
const defaultColors = {
  /** The rail or bar surface (surfaceContainer). */
  background: '#f0f4f9',
  /** The pill behind the active icon (secondaryContainer). */
  indicator: '#c2e7ff',
  /** Active icon (onSecondaryContainer). */
  activeIcon: '#004a77',
  /** Active label (secondary): lighter and bluer than the icon. */
  activeLabel: '#00639b',
  /** Inactive icons and labels, and the menu glyph (onSurfaceVariant). */
  inactive: '#444746',
  /** The state layer drawn while a tab or button is pressed. */
  pressed: 'rgba(31, 31, 31, 0.1)',
  /** The "New" button's fill (primaryContainer). */
  action: '#d3e3fd',
  /** The plus on the "New" button (onPrimaryContainer). */
  actionIcon: '#0842a0',
  /** Badge fill and text (error, onError). */
  badge: '#b3261e',
  badgeText: '#ffffff',
};

export type SideRailColors = typeof defaultColors;

export interface SideRailProps {
  /** Shows the rail's menu button (rail only) and runs this when it's pressed. */
  onMenuPress?: () => void;
  /** Screen-reader label for the menu button. Default "Menu". */
  menuLabel?: string;
  /** Shows the "New" button under the menu (rail only) and runs this when it's pressed. */
  onActionPress?: () => void;
  /** Screen-reader label for the "New" button. Default "New". */
  actionLabel?: string;
  colors?: Partial<SideRailColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on Drive's Play Store tablet screenshots (1.07 px per dp; dp used as pt). The rail
 * is 96 pt wide with everything centred on its middle. Positions are from the top of the
 * screen: the menu glyph's centre at 92 pt, the "New" button's top at 125 pt, the first
 * pill's top at 228 pt, then a tab every 68.5 pt. A tab is a 56 x 32 pt pill holding a 24 pt
 * icon, a 4 pt gap and a 16 pt label line (12 pt medium); each tab button spans the pitch,
 * with the leftover 16.5 pt split above and below. The "New" button is 56 pt with 16 pt
 * corners and a 14 pt plus; the menu glyph is 18 x 12 pt in a 48 pt button.
 */
const RAIL = 96;
const PITCH = 68.5;
const PILL = 56;
const PILL_HEIGHT = 32;
const ICON = 24;
const LABEL_GAP = 4;
const LABEL_LINE = 16;
const TAB_PAD = (PITCH - PILL_HEIGHT - LABEL_GAP - LABEL_LINE) / 2;
const MENU = 48;
const MENU_TOP = 92 - MENU / 2;
const FAB = 56;
const FAB_TOP = 125;
const FAB_TO_PILL = 47;
const PLUS = 14;
/** Without a header, the first pill's centre lines up with where the menu's would be. */
const BARE_PILL_TOP = 92 - PILL_HEIGHT / 2;
/** With only the menu, the first pill starts 24 pt under the menu button. */
const MENU_TO_PILL = 24;
/** Without the menu, the "New" button starts where the menu button would. */
const BARE_FAB_TOP = MENU_TOP + 4;

/**
 * The phone form is Material 3's navigation bar: 80 pt tall, a 64 x 32 pt pill 12 pt from its
 * top, the same icon and label below it.
 */
const BAR = 80;
const BAR_PILL = 64;
const BAR_PAD = 12;

/** Badges fade in and out on tabcn's timing (200 ms ease-out); instant with reduce motion. */
const FADE_MS = tabcnTiming.duration ?? 200;
const FADE_EASING = tabcnTiming.easing ?? Easing.bezier(0.25, 0.1, 0.25, 1);
const badgeIn = FadeIn.duration(FADE_MS).easing(FADE_EASING).reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(FADE_MS).easing(FADE_EASING).reduceMotion(ReduceMotion.System);

export function SideRail({
  onMenuPress,
  menuLabel = 'Menu',
  onActionPress,
  actionLabel = 'New',
  colors: custom,
  haptics = true,
}: SideRailProps) {
  const colors = { ...defaultColors, ...custom };
  const { position } = useTabBar();
  if (position === 'left') {
    return (
      <Rail
        colors={colors}
        haptics={haptics}
        onMenuPress={onMenuPress}
        menuLabel={menuLabel}
        onActionPress={onActionPress}
        actionLabel={actionLabel}
      />
    );
  }
  return <Bar colors={colors} haptics={haptics} />;
}

function Rail({
  colors,
  haptics,
  onMenuPress,
  menuLabel,
  onActionPress,
  actionLabel,
}: {
  colors: SideRailColors;
  haptics: boolean;
  onMenuPress?: () => void;
  menuLabel: string;
  onActionPress?: () => void;
  actionLabel: string;
}) {
  const { tabs, insets } = useTabBar();
  const tick = haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined;
  // Positions are measured from the screen's top; the rail's content starts below the inset.
  const fromScreenTop = (y: number) => Math.max(0, y - insets.top);
  const hasMenu = onMenuPress != null;
  const hasAction = onActionPress != null;
  const fabTop = hasMenu ? FAB_TOP : BARE_FAB_TOP;
  const pillTop = hasAction
    ? fabTop + FAB + FAB_TO_PILL
    : hasMenu
      ? MENU_TOP + MENU + MENU_TO_PILL
      : BARE_PILL_TOP;
  // Where the element above the tabs ends, so the list's margin lands the pill on `pillTop`.
  const above = hasAction ? fabTop + FAB : hasMenu ? MENU_TOP + MENU : null;
  const listMargin =
    above === null ? fromScreenTop(pillTop - TAB_PAD) : Math.max(0, pillTop - TAB_PAD - above);

  return (
    <TabBarRoot
      placement="rail"
      style={[styles.rail, { width: RAIL + insets.left, backgroundColor: colors.background }]}
    >
      {hasMenu ? (
        <PressableScale
          scale={1}
          accessibilityLabel={menuLabel}
          onPress={onMenuPress}
          onPressIn={tick}
          style={[styles.menu, { marginTop: fromScreenTop(MENU_TOP) }]}
        >
          {({ pressed }) => (
            <View style={[styles.menuLayer, pressed && { backgroundColor: colors.pressed }]}>
              <View style={styles.menuGlyph}>
                {[0, 5, 10].map((top) => (
                  <View
                    key={top}
                    style={[styles.menuBar, { top, backgroundColor: colors.inactive }]}
                  />
                ))}
              </View>
            </View>
          )}
        </PressableScale>
      ) : null}
      {hasAction ? (
        <PressableScale
          scale={1}
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          onPressIn={tick}
          style={[
            styles.fab,
            {
              backgroundColor: colors.action,
              marginTop: hasMenu ? fabTop - (MENU_TOP + MENU) : fromScreenTop(fabTop),
            },
          ]}
        >
          {({ pressed }) => (
            <>
              {pressed ? (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.fabLayer,
                    { backgroundColor: colors.pressed },
                  ]}
                />
              ) : null}
              <View style={styles.plus}>
                <View style={[styles.plusBar, { backgroundColor: colors.actionIcon }]} />
                <View
                  style={[styles.plusBar, styles.plusStem, { backgroundColor: colors.actionIcon }]}
                />
              </View>
            </>
          )}
        </PressableScale>
      ) : null}
      {/* A short rail (a phone in landscape) scrolls instead of pushing tabs off the bottom. */}
      <ScrollView style={styles.railScroll} showsVerticalScrollIndicator={false} bounces={false}>
        <TabList style={[styles.railList, { marginTop: listMargin }]}>
          <Pill width={PILL} top={TAB_PAD} color={colors.indicator} />
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              tab={tab}
              colors={colors}
              haptics={haptics}
              pillWidth={PILL}
              style={styles.railTab}
            />
          ))}
        </TabList>
      </ScrollView>
    </TabBarRoot>
  );
}

function Bar({ colors, haptics }: { colors: SideRailColors; haptics: boolean }) {
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={styles.barList}>
        <Pill width={BAR_PILL} top={BAR_PAD} color={colors.indicator} />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            colors={colors}
            haptics={haptics}
            pillWidth={BAR_PILL}
            style={styles.barTab}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/**
 * The active pill: a fixed size, centred across the active tab at `top` inside it. It follows
 * the tab's measured frame on tabcnSpring, so it only ever slides.
 */
function Pill({ width, top, color }: { width: number; top: number; color: string }) {
  const { activeIndex } = useTabBar();
  const frame = useTabIndicator();
  const style = useAnimatedStyle(() => ({
    opacity: frame.ready.value && activeIndex >= 0 ? 1 : 0,
    transform: [
      { translateX: frame.x.value + (frame.width.value - width) / 2 },
      { translateY: frame.y.value + top },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pill, PHYSICAL_LEFT, { width, backgroundColor: color }, style]}
    />
  );
}

function Tab({
  tab,
  colors,
  haptics,
  pillWidth,
  style,
}: {
  tab: TabItem;
  colors: SideRailColors;
  haptics: boolean;
  pillWidth: number;
  style: StyleProp<ViewStyle>;
}) {
  // Outlined to filled, grey to blue; nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const outlined = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const filled = useAnimatedStyle(() => ({ opacity: progress.value }));
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.inactive, colors.activeLabel]),
  }));

  return (
    <TabButton
      tab={tab}
      style={style}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.slot, { width: pillWidth }]}>
            {pressed ? (
              <View
                style={[StyleSheet.absoluteFill, styles.round, { backgroundColor: colors.pressed }]}
              />
            ) : null}
            <View style={styles.icon}>
              <Animated.View style={[StyleSheet.absoluteFill, outlined]}>
                {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, filled]}>
                {tab.renderIcon?.({ focused: true, color: colors.activeIcon, size: ICON })}
              </Animated.View>
              <Badge badge={tab.badge} colors={colors} />
            </View>
          </View>
          <Animated.Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.label, label]}
          >
            {tab.label}
          </Animated.Text>
        </>
      )}
    </TabButton>
  );
}

/**
 * Material 3 badges at the icon's top right: an empty `tabBarBadge` ('') draws a 6 pt dot,
 * a number a 16 pt count whose digits roll when it changes (999+ above 999), other text as is.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: SideRailColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) {
    return (
      <Animated.View
        entering={badgeIn}
        exiting={badgeOut}
        style={[styles.dot, { backgroundColor: colors.badge }]}
      />
    );
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <Animated.View
      entering={badgeIn}
      exiting={badgeOut}
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {/^\d+$/.test(text) ? (
        <BadgeCount value={Number(text)} max={999} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={textStyle}>
          {text}
        </Text>
      )}
    </Animated.View>
  );
}

/**
 * Tab frames are physical (from the left edge), but in a right-to-left layout React Native reads
 * `left` as the start edge, the right, unless the app turned that swap off. Pin the pill to the
 * physical left either way, so `translateX` by a frame's `x` lands on the tab.
 */
const PHYSICAL_LEFT =
  I18nManager.isRTL && (I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true)
    ? { right: 0 }
    : { left: 0 };

const styles = StyleSheet.create({
  railScroll: { flexShrink: 1 },
  rail: {
    alignItems: 'center',
  },
  menu: {
    width: MENU,
    height: MENU,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLayer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGlyph: {
    width: 18,
    height: 12,
  },
  menuBar: {
    position: 'absolute',
    left: 0,
    width: 18,
    height: 2,
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLayer: {
    borderRadius: 16,
  },
  plus: {
    width: PLUS,
    height: PLUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBar: {
    position: 'absolute',
    width: PLUS,
    height: 2,
  },
  plusStem: {
    width: 2,
    height: PLUS,
  },
  railList: {
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  railTab: {
    height: PITCH,
    alignItems: 'center',
    paddingTop: TAB_PAD,
  },
  barList: {
    height: BAR,
  },
  barTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: BAR_PAD,
  },
  pill: {
    position: 'absolute',
    top: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
  slot: {
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: {
    borderRadius: PILL_HEIGHT / 2,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  label: {
    marginTop: LABEL_GAP,
    fontSize: 12,
    lineHeight: LABEL_LINE,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dot: {
    position: 'absolute',
    top: -1,
    left: ICON - 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  count: {
    position: 'absolute',
    top: -4,
    left: ICON / 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    includeFontPadding: false,
  },
});
