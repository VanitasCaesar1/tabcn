/**
 * Quick Create: a create menu that slides up from behind the bar's + button. Tapping +
 * opens a column of actions (an icon over a short label, as the tabs are drawn in Labeled +
 * Plus) exactly as wide as the button and lined up with it; choosing one closes the menu and
 * runs it. Tapping + again, the screen-reader escape gesture or Android back closes it too.
 *
 * It is a `TabPanel` anchored to the bar's `usePanelAnchor('action')` element, so it needs a
 * `TabBarProvider` around the tabs navigator and a bar design that marks its action button
 * (Labeled + Plus, Pill + Plus, Glow Glass, Segment + Search, Center CTA):
 *
 * ```tsx
 * function Bar() {
 *   const toggleCreate = useQuickCreate();
 *   return (
 *     <>
 *       <LabeledPlus onActionPress={toggleCreate} />
 *       <QuickCreate
 *         actions={[
 *           { label: 'Voice', icon: MicIcon, onPress: startRecording },
 *           { label: 'Text', icon: TextIcon, onPress: newScript },
 *         ]}
 *       />
 *     </>
 *   );
 * }
 * // <Tabs tabBar={tabBar(<Bar />)}> inside <TabBarProvider>
 * ```
 *
 * The panel slides on `tabcnSpring` (critically damped, no overshoot) and its content fades
 * in and out on `tabcnTiming`; nothing scales, bounces or turns. With "reduce motion" on,
 * both are instant. Defaults match Labeled + Plus's light surface; pass `colors` for others.
 * Not drawn while the bar is a rail (Side Rail on tablets): `TabBarRoot` leaves panels out
 * there, so opening it changes its state but shows nothing.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabPanel, tabcnTiming, useTabPanel } from 'react-native-tabcn';

const defaultColors = {
  /** The menu's surface. Close to Labeled + Plus's frosted fill, a little more opaque. */
  surface: 'rgba(250, 250, 250, 0.96)',
  /** Hairline edge of the surface. */
  border: 'rgba(0, 0, 0, 0.07)',
  /** Icons and labels. */
  foreground: '#1a1a1a',
  /** The round highlight behind an action while it is pressed (Labeled + Plus's capsule). */
  pressed: 'rgba(0, 0, 0, 0.065)',
};

export type QuickCreateColors = typeof defaultColors;

/** What an action's icon is drawn with. Tab icon components (`TabIconProps`) fit too. */
export interface QuickCreateIconProps {
  color: string;
  size: number;
}

export interface QuickCreateAction {
  /** Short, one line: the menu is as wide as the + button (62 pt in Labeled + Plus). */
  label: string;
  icon: (props: QuickCreateIconProps) => ReactNode;
  /** Runs after the menu starts to close. */
  onPress: () => void;
  /** Screen-reader label. Default `label`. */
  accessibilityLabel?: string;
}

export interface QuickCreateProps {
  /** Panel id, for `useQuickCreate(id)` and `useTabPanel(id)`. Default `'create'`. */
  id?: string;
  /** Top to bottom. */
  actions: readonly QuickCreateAction[];
  /** Anchor name the bar design marks with `usePanelAnchor`. Default `'action'`. */
  anchor?: string;
  colors?: Partial<QuickCreateColors>;
  /**
   * Clear space under the menu, in points. A panel's bottom edge sits 16 pt behind a floating
   * bar (0 behind a docked one), so the default 24 leaves an 8 pt gap above the button, the
   * gap between Labeled + Plus's pill and its button. Use 8 under a docked bar.
   */
  spacing?: number;
  /** Selection haptic when an action is pressed. Default true. */
  haptics?: boolean;
}

/**
 * Measured to match Labeled + Plus: each action is a 62 pt cell with a 22 pt icon centred
 * 23.5 pt below its top and a 10 pt semibold label 5.3 pt under the icon, like its tabs. The
 * pressed highlight sits 4 pt inside the cell, as the capsule sits inside the pill, so on a
 * 62 pt button it is a circle concentric with the menu's round ends.
 */
const CELL = 62;
const ICON = 22;
const INSET = 4;
const SPACING = 24;

/** Declares the menu. Renders nothing here: the menu is drawn behind the bar's + button. */
export function QuickCreate({
  id = 'create',
  actions,
  anchor = 'action',
  colors: custom,
  spacing = SPACING,
  haptics = true,
}: QuickCreateProps) {
  const colors = { ...defaultColors, ...custom };
  return (
    <TabPanel id={id} anchor={{ name: anchor }}>
      <ActionList id={id} actions={actions} colors={colors} spacing={spacing} haptics={haptics} />
    </TabPanel>
  );
}

/**
 * Opens the menu, or closes it when it is open. Pass it to the bar's action button
 * (`onActionPress` in Labeled + Plus). Call it anywhere under the `TabBarProvider`.
 */
export function useQuickCreate(id = 'create'): () => void {
  return useTabPanel(id).toggle;
}

/** The panel's content. It renders inside the tab bar, under the same provider. */
function ActionList({
  id,
  actions,
  colors,
  spacing,
  haptics,
}: {
  id: string;
  actions: readonly QuickCreateAction[];
  colors: QuickCreateColors;
  spacing: number;
  haptics: boolean;
}) {
  const { state, hide } = useTabPanel(id);
  const open = state === 'open';

  // The whole menu fades while it slides, so it is gone before it passes behind the
  // (translucent) button. Opacity only: nothing scales or moves on its own.
  const shown = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(open ? 1 : 0, tabcnTiming);
  }, [open, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View style={[{ paddingBottom: spacing }, fade]}>
      <View
        style={[styles.surface, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {actions.map((action, index) => (
          <Pressable
            // A fixed list from props: labels may repeat, positions can't.
            key={index}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
            onPress={() => {
              hide();
              action.onPress();
            }}
            style={styles.cell}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.highlight,
                    { backgroundColor: pressed ? colors.pressed : 'transparent' },
                  ]}
                />
                <View style={styles.icon}>
                  {action.icon({ color: colors.foreground, size: ICON })}
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.label, { color: colors.foreground }]}
                >
                  {action.label}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: CELL / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  cell: {
    height: CELL,
    alignItems: 'center',
    paddingTop: 23.5 - ICON / 2,
    paddingHorizontal: INSET,
    gap: 5.3,
  },
  highlight: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    right: INSET,
    borderRadius: CELL / 2,
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  label: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
