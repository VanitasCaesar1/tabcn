/**
 * Composer Dock: a chat composer over a row of four icon tabs, on the screen's own colour.
 *
 * - Tap a tab to switch. Press and slide along the row to scrub through the tabs: a small
 *   dark pill names the tab under the finger, the composer fades back, and lifting chooses
 *   the tab. `onScrubTab` reports the tab under the finger so a screen can preview it.
 * - Hold a tab that has a menu (`menus`, by route name) to open its recent items in a card
 *   that grows out of the tab, with an optional "New …" row. The held tab gets a soft
 *   capsule behind it and the screen fades back. Keep holding and slide onto a row, then lift,
 *   to choose it (as with iOS menus), or lift and tap. Tapping outside, Android back or the
 *   screen-reader escape gesture closes it.
 * - The composer is a pill: + (the attachment menu, `attachments`), the text field, a
 *   dictation button and a voice button that turns into Send once there is text. Focused,
 *   it opens into a two-row card with the model chip (`model`, `onModelPress`) and rides on
 *   top of the keyboard while the tabs slip behind it.
 *
 * On iOS 26 the composer, the menus' cards and the model chip are Liquid Glass (expo-glass-effect);
 * elsewhere, or with `material="solid"`, they are flat fills with a hairline edge.
 *
 * Scrubbing comes from `TabScrub` in 'react-native-tabcn/gestures', so this design needs
 * `react-native-gesture-handler` and a `GestureHandlerRootView` around the app.
 *
 * ```tsx
 * <Tabs tabBar={tabBar(<ComposerDock onSend={send} menus={{ projects: projectMenu }} />)}>
 *   <Tabs.Screen name="index" options={{ title: 'Chat', tabBarIcon: ChatIcon }} />
 *   <Tabs.Screen name="projects" options={{ title: 'Projects', tabBarIcon: ProjectsIcon }} />
 * </Tabs>
 * ```
 *
 * Motion: the name pill and the composer's controls crossfade; a hold menu grows out of the
 * held tab while a blur over it clears, on an eased curve with no overshoot; the composer's
 * card and the keyboard ride on eased glides; colours change instantly; nothing bounces or
 * turns. With "reduce motion" on, every change is instant.
 *
 * The design is split into files that install side by side in components/tabcn/:
 * composer-dock.tsx (this file), composer-dock-composer.tsx (the input bar),
 * composer-dock-tabs.tsx (tabs and the name pill), composer-dock-menu.tsx (menus),
 * composer-dock-theme.tsx (colours and shared types) and composer-dock-icons.tsx (glyphs).
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { TabBarRoot, type TabItem, useTabBar } from 'react-native-tabcn';
import { TabScrub } from 'react-native-tabcn/gestures';
import { Composer } from './composer-dock-composer';
import { MenuRow, Popover } from './composer-dock-menu';
import { DockTab, ScrubLabel } from './composer-dock-tabs';
import {
  ATTACH_CARD_WIDTH,
  COMPOSER_GAP,
  type ComposerDockAttachment,
  type ComposerDockColors,
  type ComposerDockMenu,
  defaultColors,
  type Frame,
  HOLD_CARD_WIDTH,
  KEYBOARD_GAP,
  LONG_PRESS_MS,
  measure,
  SIDE,
  TAB_ROW,
  TAB_WIDTH,
} from './composer-dock-theme';

export type {
  ComposerDockAttachment,
  ComposerDockColors,
  ComposerDockIcon,
  ComposerDockMenu,
  ComposerDockMenuItem,
} from './composer-dock-theme';

export interface ComposerDockProps {
  /** Runs with the text when Send is pressed; the field then clears. */
  onSend?: (text: string) => void;
  /** The text field's placeholder. Default 'Ask anything'. */
  placeholder?: string;
  /** The model chip's text, shown while the composer is open. Leave out for no chip. */
  model?: string;
  /** Runs when the model chip is pressed (open a model picker). */
  onModelPress?: () => void;
  /** Runs when the voice button is pressed (shown while the field is empty). */
  onVoicePress?: () => void;
  /** Runs when the dictation button is pressed. Leave out to hide the button. */
  onDictatePress?: () => void;
  /** The + button's menu, in groups split by a gap. Leave out to hide the + button. */
  attachments?: readonly (readonly ComposerDockAttachment[])[];
  /** Hold menus, keyed by the tab's route name. A tab without one has no hold menu. */
  menus?: Readonly<Record<string, ComposerDockMenu>>;
  /** The tab under the finger while scrubbing, then `null` when the finger lifts. */
  onScrubTab?: (tab: TabItem | null) => void;
  /** Press and slide along the tabs to move through them. Default true. */
  scrub?: boolean;
  /**
   * The composer's, the menus' and the chip's surface: `'glass'` (Liquid Glass, iOS 26),
   * `'solid'` (a flat fill), or `'auto'` (glass where the system has it). Default `'auto'`.
   */
  material?: 'auto' | 'glass' | 'solid';
  colors?: Partial<ComposerDockColors>;
  /** Selection haptics while scrubbing, and a light tap when a hold menu opens. Default true. */
  haptics?: boolean;
}

export function ComposerDock({
  onSend,
  placeholder = 'Ask anything',
  model,
  onModelPress,
  onVoicePress,
  onDictatePress,
  attachments,
  menus,
  onScrubTab,
  scrub = true,
  material = 'auto',
  colors: custom,
  haptics = true,
}: ComposerDockProps) {
  const colors = { ...defaultColors, ...custom };
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  const { tabs, insets } = useTabBar();
  const keyboard = useAnimatedKeyboard();
  const rowRef = useRef<ComponentRef<typeof View>>(null);
  const composerRef = useRef<ComponentRef<typeof View>>(null);

  const [scrubbing, setScrubbing] = useState<TabItem | null>(null);
  const [held, setHeld] = useState<{ key: string; anchor: Frame; rowTop: number } | null>(null);
  const [attach, setAttach] = useState<Frame | null>(null);
  // The finger that opened a hold menu, while it stays down: sliding it onto a row and lifting
  // chooses that row.
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  // Menus are drawn inside the dock (not in a modal, which would cancel the finger still down
  // from the long press), over the whole screen: this is where the dock sits in the window.
  const dockRef = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [lifts, setLifts] = useState(0);

  // Holding a tab opens its menu, and the same finger can then slide onto a row and lift to
  // choose it. One pan on the row starts after the long-press delay and follows that finger
  // natively, so it keeps going while the menu appears over it. A finger that moves first is
  // a scrub or a tap, and the pan lets it go.
  const icons = useRef(new Map<string, ComponentRef<typeof View>>()).current;
  const register = (key: string, node: ComponentRef<typeof View> | null) => {
    if (node) icons.set(key, node);
    else icons.delete(key);
  };
  const [rowWidth, setRowWidth] = useState(0);
  const latest = useRef({ tabs, menus, rowWidth });
  latest.current = { tabs, menus, rowWidth };
  const holdGesture = useMemo(() => {
    const holdAt = (x: number) => {
      const { tabs: list, menus: all, rowWidth: width } = latest.current;
      const index = Math.floor((x - (width - list.length * TAB_WIDTH) / 2) / TAB_WIDTH);
      const tab = list[index];
      const node = tab ? icons.get(tab.key) : undefined;
      if (!tab || !node || !all?.[tab.routeName]) return;
      node.measureInWindow((fx, fy, fw, fh) =>
        openRef.current(tab, { x: fx, y: fy, width: fw, height: fh }),
      );
    };
    const move = (x: number, y: number) => setPointer({ x, y });
    // The last position stays until the menu closes: the row under it is the one the lift
    // chooses.
    const lift = () => setLifts((n) => n + 1);
    return Gesture.Pan()
      .activateAfterLongPress(LONG_PRESS_MS)
      .failOffsetX([-8, 8])
      .failOffsetY([-8, 8])
      .onStart((e) => {
        'worklet';
        runOnJS(holdAt)(e.x);
      })
      .onUpdate((e) => {
        'worklet';
        runOnJS(move)(e.absoluteX, e.absoluteY);
      })
      .onEnd(() => {
        'worklet';
        runOnJS(lift)();
      });
  }, [icons]);

  const hover = (tab: TabItem | null) => {
    setScrubbing(tab);
    onScrubTab?.(tab);
  };

  const openMenu = (tab: TabItem, anchor: Frame) => {
    // The hold gesture and the tab's own long press can both ask; open once.
    if (held?.key === tab.key) return;
    measure(dockRef, (dock) => {
      setOrigin({ x: dock.x, y: dock.y });
      measure(rowRef, (row) => {
        if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPointer(null);
        setHeld({ key: tab.key, anchor, rowTop: row.y });
      });
    });
  };
  const openRef = useRef(openMenu);
  openRef.current = openMenu;
  // The last menu shown, kept while its card fades out after it closes.
  const [shownHeld, setShownHeld] = useState(held);
  if (held && held !== shownHeld) setShownHeld(held);
  const [shownAttach, setShownAttach] = useState(attach);
  if (attach && attach !== shownAttach) setShownAttach(attach);
  const heldTab = shownHeld ? tabs.find((t) => t.key === shownHeld.key) : undefined;
  const menu = heldTab ? menus?.[heldTab.routeName] : undefined;

  // The composer rides on top of the keyboard: a spacer under the tabs grows with it, so the
  // dock's own frame (and the height screens pad by) follows. The tabs fade out behind it.
  const spacerStyle = useAnimatedStyle(() => ({
    height: Math.max(
      0,
      keyboard.height.value + KEYBOARD_GAP - insets.bottom - TAB_ROW - COMPOSER_GAP,
    ),
  }));
  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      keyboard.height.value,
      [0, TAB_ROW + insets.bottom],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <TabBarRoot placement="docked" style={{ backgroundColor: colors.background }}>
      <View ref={dockRef} collapsable={false} style={styles.dock}>
        <Composer
          composerRef={composerRef}
          colors={colors}
          placeholder={placeholder}
          model={model}
          onModelPress={onModelPress}
          onSend={onSend}
          onVoicePress={onVoicePress}
          onDictatePress={onDictatePress}
          onAttachPress={
            attachments
              ? () =>
                  measure(dockRef, (dock) => {
                    setOrigin({ x: dock.x, y: dock.y });
                    measure(composerRef, (frame) => setAttach(frame));
                  })
              : undefined
          }
          dimmed={scrubbing !== null}
          glass={glass}
        />
        <GestureDetector gesture={holdGesture}>
          <Animated.View
            ref={rowRef}
            collapsable={false}
            style={rowStyle}
            onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          >
            <TabScrub
              enabled={scrub}
              style={styles.tabRow}
              onScrubStart={(tab) => {
                if (haptics) Haptics.selectionAsync();
                hover(tab);
              }}
              onTabCross={(tab) => {
                if (haptics) Haptics.selectionAsync();
                hover(tab);
              }}
              onScrubEnd={() => hover(null)}
            >
              <ScrubLabel tab={scrubbing} colors={colors} />
              {tabs.map((tab) => (
                <DockTab
                  key={tab.key}
                  tab={tab}
                  colors={colors}
                  lit={scrubbing ? scrubbing.key === tab.key : tab.focused || held?.key === tab.key}
                  held={held?.key === tab.key}
                  onHold={menus?.[tab.routeName] ? openMenu : undefined}
                  register={register}
                  glass={glass}
                />
              ))}
            </TabScrub>
          </Animated.View>
        </GestureDetector>
        <Animated.View style={spacerStyle} />
      </View>

      <Popover
        open={held !== null && menu !== undefined}
        onClose={() => setHeld(null)}
        scrimBottom={shownHeld?.rowTop ?? 0}
        scrim={colors.scrim}
        width={HOLD_CARD_WIDTH}
        centerX={shownHeld ? shownHeld.anchor.x + shownHeld.anchor.width / 2 : 0}
        bottom={shownHeld?.rowTop ?? 0}
        gap={12}
        grow
        pointer={pointer}
        lifts={lifts}
        haptics={haptics}
        colors={colors}
        glass={glass}
        origin={origin}
        label={heldTab ? `${heldTab.label}, recent` : 'Recent'}
      >
        {(close) =>
          menu ? (
            <>
              {menu.items.map((item) => (
                <MenuRow
                  key={item.key}
                  id={item.key}
                  label={item.label}
                  icon={item.icon}
                  iconColor={item.color}
                  unread={item.unread}
                  large
                  colors={colors}
                  onPress={() => close(item.onPress)}
                />
              ))}
              {menu.create ? (
                <MenuRow
                  id="create"
                  label={menu.create.label}
                  create
                  large
                  colors={colors}
                  onPress={() => close(menu.create?.onPress)}
                />
              ) : null}
            </>
          ) : null
        }
      </Popover>

      <Popover
        open={attach !== null}
        onClose={() => setAttach(null)}
        scrimBottom={0}
        scrim="transparent"
        width={ATTACH_CARD_WIDTH}
        left={shownAttach?.x ?? SIDE}
        bottom={shownAttach ? shownAttach.y + shownAttach.height : 0}
        gap={-8}
        haptics={haptics}
        colors={colors}
        glass={glass}
        origin={origin}
        label="Add to message"
      >
        {(close) =>
          attachments?.map((group, g) => (
            <View key={group.map((a) => a.key).join()} style={g > 0 ? styles.groupGap : null}>
              {group.map((a) => (
                <MenuRow
                  key={a.key}
                  id={a.key}
                  label={a.label}
                  icon={a.icon}
                  iconSize={18}
                  colors={colors}
                  onPress={() => close(a.onPress)}
                />
              ))}
            </View>
          ))
        }
      </Popover>
    </TabBarRoot>
  );
}

const styles = StyleSheet.create({
  tabRow: { height: TAB_ROW, justifyContent: 'center' },
  dock: { alignSelf: 'stretch' },
  groupGap: { marginTop: 10 },
});
