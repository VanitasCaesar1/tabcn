/**
 * Playful Tiles: a white bar with a colour per tab; a bordered tile slides to
 * the active tab. The tile's pale colours are kept as the reference has them.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import {
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useTabBar,
} from 'react-native-tabcn';

const defaultColors = {
  /** The bar, which also fills the home-indicator area. */
  background: '#ffffff',
  /** The tile that slides behind the active tab. */
  tile: '#e3f4ff',
  /** The tile's 2.5 pt outline. */
  tileBorder: '#8fd3ff',
  /** The badge dot. */
  badge: '#ff4b4b',
  /** Icon colour for a tab when `tabColors` is empty. */
  tabColor: '#1cb0f6',
};

/**
 * Icon colour per tab position; cycles when there are more tabs. This design's own icons are
 * full-colour stickers and ignore it; it tints single-colour icons passed as `tabBarIcon`.
 */
const defaultTabColors = ['#ff9600', '#ffc800', '#ce82ff', '#ff86d0', '#1cb0f6', '#58cc02'];

export type PlayfulTilesColors = typeof defaultColors;

export interface PlayfulTilesProps {
  colors?: Partial<PlayfulTilesColors>;
  /**
   * Each tab's icon colour, in tab order; repeats from the start when there are more tabs.
   * Passed to `tabBarIcon` as `color`. This design's own sticker icons keep their colours and
   * ignore it; it is for single-colour icons of your own.
   */
  tabColors?: string[];
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

export function PlayfulTiles({
  colors: custom,
  tabColors = defaultTabColors,
  haptics = true,
}: PlayfulTilesProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs } = useTabBar();
  return (
    <TabBarRoot placement="docked" style={[styles.dock, { backgroundColor: colors.background }]}>
      <TabList style={[styles.bar, { backgroundColor: colors.background }]}>
        <TabIndicator
          inset={{ x: 9, y: 11 }}
          style={[styles.tile, { backgroundColor: colors.tile, borderColor: colors.tileBorder }]}
        />
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            tab={tab}
            color={tabColors[tab.index % tabColors.length] ?? colors.tabColor}
            badgeColor={colors.badge}
            haptics={haptics}
          />
        ))}
      </TabList>
    </TabBarRoot>
  );
}

function Tab({
  tab,
  color,
  badgeColor,
  haptics,
}: {
  tab: TabItem;
  color: string;
  badgeColor: string;
  haptics: boolean;
}) {
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      {tab.renderIcon?.({ focused: tab.focused, color, size: 36 })}
      {tab.badge != null ? (
        <Animated.View
          entering={badgeIn}
          exiting={badgeOut}
          pointerEvents="none"
          style={[styles.badge, { backgroundColor: badgeColor }]}
        />
      ) : null}
    </TabButton>
  );
}

// The badge dot fades in and out on tabcnTiming, with no pop; instant with reduce motion on.
const BADGE_FADE_MS = tabcnTiming.duration ?? 200;
const BADGE_EASING = tabcnTiming.easing ?? Easing.linear;
const badgeIn = FadeIn.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);
const badgeOut = FadeOut.duration(BADGE_FADE_MS)
  .easing(BADGE_EASING)
  .reduceMotion(ReduceMotion.System);

const styles = StyleSheet.create({
  // Docked like the app it comes from: full width and flush with the bottom edge, with the
  // background running under the home indicator. Side padding keeps the reference's tab spacing.
  dock: {
    paddingHorizontal: 16,
    boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.08)',
  },
  bar: {
    height: 66,
  },
  tile: { borderRadius: 12, borderCurve: 'continuous', borderWidth: 2.5 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 16, right: '24%', width: 10, height: 10, borderRadius: 5 },
});
