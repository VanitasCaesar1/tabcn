/**
 * Center CTA: a dark bar with a wide text button in the middle and image tabs
 * on either side.
 *
 * Motion, as in the app: none in the bar. The full-colour illustrations stay at full opacity
 * whichever tab is focused (no dimming, no indicator); a tab change shows only in the screen.
 * The centre button darkens a little while held (10% of the bar colour mixed in, 100 ms in,
 * `tabcnTiming` out) instead of shrinking; with reduce motion on it changes instantly.
 * The button is marked with `usePanelAnchor('action')`, so a `TabPanel` can open from it.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  tabcnTiming,
  usePanelAnchor,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: '#2f302a',
  button: '#f1eecb',
  buttonText: '#2f302a',
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
  haptics?: boolean;
}

export function CenterCta({
  onActionPress,
  actionLabel = 'Step Into',
  fontFamily,
  colors: custom,
  haptics = true,
}: CenterCtaProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  const half = Math.ceil(tabs.length / 2);
  const anchor = usePanelAnchor('action');
  const pressed = useSharedValue(0);
  const { button, background } = colors;
  // While held, the button takes on 10% of the bar colour: a colour dip, not a scale dip.
  const face = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.value * PRESS_MIX, [0, 1], [button, background]),
  }));
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        {tabs.slice(0, half).map((tab) => (
          <Tab key={tab.key} tab={tab} haptics={haptics} />
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
          <Tab key={tab.key} tab={tab} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

/** Share of the bar colour mixed into the button while it is held. */
const PRESS_MIX = 0.1;
const PRESS_IN = {
  duration: 100,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  reduceMotion: ReduceMotion.System,
};

/** Side tabs never change look: the illustrations can't be recoloured, and the app doesn't dim them. */
function Tab({ tab, haptics }: { tab: TabItem; haptics: boolean }) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color: '#ffffff', size: 42 })}
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { width: 371, maxWidth: '100%' },
  bar: { height: 69, borderRadius: 24, alignItems: 'stretch', paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  middle: { justifyContent: 'center' },
  button: { width: 113, height: 49 },
  face: { flex: 1, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 19 },
});
