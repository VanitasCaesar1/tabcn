/**
 * Labeled + Plus: a labelled pill with a sliding capsule, next to a separate
 * round plus button that runs an action instead of switching tabs.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import {
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  useTabBar,
} from 'tabcn';

const defaultColors = {
  background: '#ffffff',
  capsule: '#ececee',
  foreground: '#141416',
  badge: '#ff3b30',
};

export type LabeledPlusColors = typeof defaultColors;

export interface LabeledPlusProps {
  /** Runs when the plus button is pressed. */
  onActionPress: () => void;
  /** Screen-reader label for the plus button. Default "Create". */
  actionLabel?: string;
  colors?: Partial<LabeledPlusColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function LabeledPlus({
  onActionPress,
  actionLabel = 'Create',
  colors: custom,
  haptics = true,
}: LabeledPlusProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();

  return (
    <TabBarRoot placement="floating" style={styles.row}>
      <TabList style={[styles.pill, { backgroundColor: colors.background }]}>
        <TabIndicator inset={5} style={[styles.capsule, { backgroundColor: colors.capsule }]} />
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
      <PressableScale
        accessibilityLabel={actionLabel}
        onPress={onActionPress}
        onPressIn={
          haptics ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : undefined
        }
        style={[styles.action, { backgroundColor: colors.background }]}
      >
        <View style={[styles.plusBar, { backgroundColor: colors.foreground }]} />
        <View
          style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: colors.foreground }]}
        />
      </PressableScale>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: LabeledPlusColors;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View>
        {tab.renderIcon?.({ focused: tab.focused, color: colors.foreground, size: 21 })}
        {tab.badge != null ? (
          <Animated.View
            entering={ZoomIn.springify().dampingRatio(0.8).duration(320)}
            exiting={ZoomOut}
            style={[styles.badge, { backgroundColor: colors.badge }]}
          />
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
        {tab.label}
      </Text>
    </TabButton>
  );
}

const PILL_HEIGHT = 58.5;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8.5,
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: 999,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
  },
  capsule: {
    borderRadius: 999,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: 71.5,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  action: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.18)',
  },
  plusBar: {
    position: 'absolute',
    width: 19,
    height: 1.8,
    borderRadius: 2,
  },
  plusBarVertical: {
    transform: [{ rotate: '90deg' }],
  },
});
