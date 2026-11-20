/**
 * Center CTA: a dark bar with a wide text button in the middle and image tabs
 * on either side. Inactive tabs dim; the active one brightens.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  type TabItem,
  TabList,
  useFocusProgress,
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
  return (
    <TabBarRoot placement="floating" style={styles.outer}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        {tabs.slice(0, half).map((tab) => (
          <Tab key={tab.key} tab={tab} haptics={haptics} />
        ))}
        <View style={styles.middle}>
          <PressableScale
            accessibilityLabel={actionLabel}
            onPress={onActionPress}
            onPressIn={
              haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) : undefined
            }
            style={[styles.button, { backgroundColor: colors.button }]}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.buttonText },
                fontFamily ? { fontFamily } : null,
              ]}
            >
              {actionLabel}
            </Text>
          </PressableScale>
        </View>
        {tabs.slice(half).map((tab) => (
          <Tab key={tab.key} tab={tab} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({ tab, haptics }: { tab: TabItem; haptics: boolean }) {
  const progress = useFocusProgress(tab);
  const icon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={icon}>
        {tab.renderIcon?.({ focused: tab.focused, color: '#ffffff', size: 42 })}
      </Animated.View>
    </TabButton>
  );
}

const styles = StyleSheet.create({
  outer: { width: 371, maxWidth: '100%' },
  bar: { height: 69, borderRadius: 24, alignItems: 'stretch', paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  middle: { justifyContent: 'center' },
  button: {
    width: 113,
    height: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 19 },
});
