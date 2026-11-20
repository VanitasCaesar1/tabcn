/**
 * Light Icons: the Amble app's tab bar. Five icons straight on the near-black
 * screen: no labels, no surface of its own, no border, shadow, blur or
 * indicator. Docked and flush with the bottom, five equal columns across the
 * full width. Idle tabs are grey outline glyphs; the active tab crossfades to
 * its white glyph (filled for chat and profile, heavier for search). The record
 * tab is an ordinary tab drawn larger than the rest, and dimmer when idle.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { TabBarRoot, TabButton, type TabItem, TabList, useFocusProgress, useTabBar } from 'tabcn';

const defaultColors = {
  /** The screen colour: the bar has no surface of its own. Measured #0e0e0c. */
  background: '#0e0e0e',
  /** Active glyph: measured pure white. */
  active: '#ffffff',
  /** Idle glyphs: thin strokes peak at #9b to #a1 through the photo's blur. */
  inactive: '#a6a6a6',
  badge: '#ff453a',
};

export type LightIconsColors = typeof defaultColors;

export interface LightIconsProps {
  colors?: Partial<LightIconsColors>;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function LightIcons({ colors: custom, haptics = true }: LightIconsProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <TabList style={styles.bar}>
        {tabs.map((tab) => (
          <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  colors,
  haptics,
}: {
  tab: TabItem;
  colors: LightIconsColors;
  haptics: boolean;
}) {
  const progress = useFocusProgress(tab);
  const idle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const active = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.iconBox}>
        <Animated.View style={[StyleSheet.absoluteFill, idle]}>
          {tab.renderIcon?.({ focused: false, color: colors.inactive, size: ICON })}
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, active]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        {tab.badge != null ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.badge, borderColor: colors.background },
            ]}
          />
        ) : null}
      </View>
    </TabButton>
  );
}

// Measured on the app's App Store screenshot 3 (a phone held in a hand) at about
// 1.65 px/pt on a 393 pt wide screen: the tab pitch is 130.3 px = 393/5 pt.
/** The icons' 40-unit box, in points: one unit is one point, so glyphs draw 25 to 36 pt. */
const ICON = 40;
/** Icon centres sit about 50 pt above the screen's bottom edge: 16 pt above the safe area. */
const CENTRE_ABOVE_INSET = 16;
/** The page content ends 23 pt above the icon tops, 37 pt above their centres. */
const BAR_HEIGHT = CENTRE_ABOVE_INSET + 37;

const styles = StyleSheet.create({
  bar: { height: BAR_HEIGHT },
  // Five equal columns across the full width, no side inset, as in the app.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  // The 40 pt box only has empty margin below its 36 pt record glyph, so it may hang 4 pt
  // into the safe area to put the centres where the app has them.
  iconBox: { width: ICON, height: ICON, marginBottom: CENTRE_ABOVE_INSET - ICON / 2 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
});
