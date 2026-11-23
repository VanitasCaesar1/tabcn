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
 * Motion: as in Drive and Material 3, the new tab's pill grows out of its centre (from half
 * its width to full, fading in, on tabcnTiming) while the old one shrinks back and fades out,
 * and the icons crossfade from outlined to filled and the colours change. Nothing bounces.
 * With "reduce motion" on, every change is instant.
 * Changed for clarity: earlier copies glided one pill between tabs (a departure from Drive);
 * it now grows out of the tab's centre the way Drive's does.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
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
/** The new pill starts at this fraction of its width and grows out of its centre to full. */
const PILL_FROM = 0.5;

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
            <View style={styles.menuLayer}>
              <StateLayer pressed={pressed} color={colors.pressed} shape={styles.menuLayer} />
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
              <StateLayer pressed={pressed} color={colors.pressed} shape={styles.fabLayer} />
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
  // Outlined to filled, grey to blue; the icon and label don't move or change size.
  const progress = useFocusProgress(tab);
  // The pill grows out of its centre: scaleX from PILL_FROM to 1 as it fades in (and back as
  // it fades out). A transform only, so the layout never changes; it is drawn inside the tab's
  // own slot, so it lines up in right-to-left layouts too.
  // By transforms only, with round ends at every width (scaleX squashed them into ovals).
  const pillW = useDerivedValue(
    () => pillWidth * interpolate(progress.value, [0, 1], [PILL_FROM, 1]),
  );
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
            <GrowingPill
              width={pillW}
              maxWidth={pillWidth}
              height={PILL_HEIGHT}
              color={colors.indicator}
              opacity={progress}
            />
            <StateLayer pressed={pressed} color={colors.pressed} shape={styles.round} />
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
      // The tab's label already reads the badge; on its own it was an extra stop on Android.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {/^\d+$/.test(text) ? (
        <BadgeCount value={Number(text)} max={999} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </Animated.View>
  );
}

/**
 * Material's pressed state layer: fades in while pressed and out after, on tabcnTiming (instant
 * with reduce motion on). It used to appear and vanish in a single frame.
 */
function StateLayer({
  pressed,
  color,
  shape,
}: {
  pressed: boolean;
  color: string;
  shape: StyleProp<ViewStyle>;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(pressed ? 1 : 0, tabcnTiming);
  }, [pressed, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, shape, { backgroundColor: color }, style]}
    />
  );
}

/**
 * A fully round pill drawn from two end caps and a middle strip, so it changes width by
 * transforms only (no layout per frame) and its ends stay round at every width. Narrower than
 * it is tall, it is a circle of that width. Centred in a `maxWidth` x `height` box.
 */
function GrowingPill({
  width,
  maxWidth,
  height,
  color,
  opacity,
}: {
  width: SharedValue<number>;
  maxWidth: number;
  height: number;
  color: string;
  opacity: SharedValue<number>;
}) {
  const box = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cap = (side: -1 | 1) => () => {
    'worklet';
    const w = Math.max(0, width.value);
    return {
      transform: [
        { translateX: side * (Math.max(w, height) / 2 - height / 2) },
        { scale: Math.max(0.001, Math.min(1, w / height)) },
      ],
    };
  };
  const start = useAnimatedStyle(cap(-1));
  const end = useAnimatedStyle(cap(1));
  const strip = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.001, width.value - height) / maxWidth }],
  }));
  const capStyle = {
    position: 'absolute' as const,
    top: 0,
    left: (maxWidth - height) / 2,
    width: height,
    height,
    borderRadius: height / 2,
    backgroundColor: color,
  };
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, width: maxWidth, height }, box]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: maxWidth,
            height,
            backgroundColor: color,
          },
          strip,
        ]}
      />
      <Animated.View style={[capStyle, start]} />
      <Animated.View style={[capStyle, end]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
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
