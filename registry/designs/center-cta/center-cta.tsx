/**
 * Center CTA: a dark bar with a wide text button in the middle and image tabs
 * on either side.
 *
 * Motion, as in the app: none in the bar. The full-colour illustrations stay at full opacity
 * whichever tab is focused (no dimming, no indicator); a tab change shows only in the screen.
 * Pass `selectionIndicator` for a small dot under the active illustration, which fades in and
 * out on `tabcnTiming` (instant with reduce motion).
 * The centre button darkens a little while held (10% of the bar colour mixed in, 100 ms in,
 * `tabcnTiming` out) instead of shrinking; with reduce motion on it changes instantly.
 * The button is marked with `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 *
 * The bar is 371 pt wide where that fits, and narrows to keep 8 pt from the screen's edges
 * on a smaller screen. The button's text stays on one line, shrinking a little if it must.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
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
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar. Also the colour mixed into the button while it is held. */
  background: '#2f302a',
  /** The centre button's face. */
  button: '#f1eecb',
  /** The centre button's text. */
  buttonText: '#2f302a',
  /** The colour handed to tab icons. The bundled illustrations are full colour and ignore it. */
  icon: '#ffffff',
  /** Badge fill (the app shows none; iOS system red), ringed in `background`. */
  badge: '#ff3b30',
  /** The count on a badge. */
  badgeText: '#ffffff',
  /** The dot under the active tab's illustration, drawn with `selectionIndicator`. */
  indicator: '#f1eecb',
};

export type CenterCtaColors = typeof defaultColors;

export interface CenterCtaProps {
  /** Runs when the centre button is pressed. */
  onActionPress: () => void;
  /** Centre button text. Default "Step Into". */
  actionLabel?: string;
  /** Font for the centre button, e.g. a handwritten face. Default: system font. */
  fontFamily?: string;
  colors?: Partial<CenterCtaColors>;
  /** Selection haptic on tabs, a medium impact on the centre button. Default true. */
  haptics?: boolean;
  /**
   * Draws a small dot (`colors.indicator`) under the active tab's illustration, fading in and
   * out on tabcnTiming. The app has none. Default false.
   */
  selectionIndicator?: boolean;
}

export function CenterCta({
  onActionPress,
  actionLabel = 'Step Into',
  fontFamily,
  colors: custom,
  haptics = true,
  selectionIndicator = false,
}: CenterCtaProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const window = useWindowDimensions();
  // The measured width where it fits; narrower, keeping EDGE from each side, where it doesn't.
  const width = Math.min(WIDTH, window.width - insets.left - insets.right - EDGE * 2);
  const half = Math.ceil(tabs.length / 2);
  // 42 pt illustrations, smaller only when a slot is narrower than that (many tabs, small screens).
  const slot = (width - BAR_PADDING * 2 - BUTTON_WIDTH) / Math.max(1, tabs.length);
  const iconSize = Math.max(0, Math.min(ICON, slot));
  const anchor = usePanelAnchor('action');
  const pressed = useSharedValue(0);
  const { button, background } = colors;
  // While held, the button takes on 10% of the bar colour: a colour dip, not a scale dip.
  const face = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value * PRESS_MIX, [0, 1], [button, background]),
  }));
  return (
    <TabBarRoot placement="floating" style={{ width }}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        {tabs.slice(0, half).map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            size={iconSize}
            colors={colors}
            haptics={haptics}
            indicator={selectionIndicator}
          />
        ))}
        <View style={styles.middle}>
          <PressableScale
            {...anchor}
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            onPressIn={() => {
              pressed.value = withTiming(1, PRESS_IN);
              if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            onPressOut={() => {
              pressed.value = withTiming(0, tabcnTiming);
            }}
            scale={1}
            style={styles.button}
          >
            <Animated.View style={[styles.face, face]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.buttonText,
                  { color: colors.buttonText },
                  fontFamily ? { fontFamily } : null,
                ]}
              >
                {actionLabel}
              </Text>
            </Animated.View>
          </PressableScale>
        </View>
        {tabs.slice(half).map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            size={iconSize}
            colors={colors}
            haptics={haptics}
            indicator={selectionIndicator}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/** The bar's measured width, and the space kept from each screen edge when it can't fit. */
const WIDTH = 371;
const EDGE = 8;
/** The illustrations' size, the centre button's width and the bar's side padding. */
const ICON = 42;
const BUTTON_WIDTH = 113;
const BAR_PADDING = 6;
/** The selection dot's diameter. */
const INDICATOR = 5;
/** Share of the bar colour mixed into the button while it is held. */
const PRESS_MIX = 0.1;
const PRESS_IN = {
  duration: 100,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.System,
};

/**
 * Side tabs never change look: the illustrations can't be recoloured, and the app doesn't dim
 * them. With `indicator`, a dot under the active one is the only change.
 */
function Tab({
  tab,
  size,
  colors,
  haptics,
  indicator,
}: {
  tab: TabItem;
  size: number;
  colors: CenterCtaColors;
  haptics: boolean;
  indicator: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.icon, size })}
        <Badge badge={tab.badge} colors={colors} />
        {indicator ? <SelectionDot tab={tab} color={colors.indicator} /> : null}
      </View>
    </TabButton>
  );
}

/** The active tab's dot under its illustration: fades in and out on tabcnTiming. */
function SelectionDot({ tab, color }: { tab: TabItem; color: string }) {
  const progress = useFocusProgress(tab);
  const fade = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.indicator, { backgroundColor: color }, fade]}
    />
  );
}

/**
 * A badge on the illustration's top right: a dot for an empty badge, a count otherwise, ringed
 * in the bar colour so it reads over the artwork. The tab's accessibility label already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: CenterCtaColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  const fill = { backgroundColor: colors.badge, borderColor: colors.background };
  if (text === '') return <View pointerEvents="none" style={[styles.dot, fill]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, fill]}
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

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  bar: { height: 69, borderRadius: 24, alignItems: 'stretch', paddingHorizontal: BAR_PADDING },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  middle: { justifyContent: 'center' },
  button: { width: BUTTON_WIDTH, height: 49 },
  face: {
    flex: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  buttonText: { fontSize: 19 },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  count: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '700', includeFontPadding: false },
  // 5 pt, centred 6.5 pt below the illustration: inside the 13.5 pt under a 42 pt one.
  indicator: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    marginTop: 4,
    marginLeft: -INDICATOR / 2,
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: INDICATOR / 2,
  },
});
