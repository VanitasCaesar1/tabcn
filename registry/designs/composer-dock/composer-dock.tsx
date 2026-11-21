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
 * Motion: menus, the name pill and the composer's controls crossfade; the composer's card
 * and the keyboard ride on eased glides; colours change instantly; nothing scales, bounces
 * or turns. With "reduce motion" on, every change is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import {
  type ComponentRef,
  createContext,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  ReduceMotion,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import {
  TabBarRoot,
  TabButton,
  type TabItem,
  tabcnTiming,
  useTabBar,
  useTabIndicator,
} from 'react-native-tabcn';
import { TabScrub } from 'react-native-tabcn/gestures';

const defaultColors = {
  /** The dock, the same as the screen behind it. */
  background: '#f8f8f6',
  /** Tints the Liquid Glass surfaces so they take the screen's tone, as in the app. */
  glassTint: 'rgba(248, 248, 246, 0.72)',
  /** The composer's pill and card: a faint lift off the screen colour. */
  composer: 'rgba(255, 255, 255, 0.6)',
  /** Hairline edge of the composer and the menus. */
  border: 'rgba(0, 0, 0, 0.07)',
  /** Text, the active tab's icon, and the voice and Send buttons. */
  foreground: '#1f1e1d',
  /** The other tabs' icons. */
  muted: '#a3a29e',
  /** The text field's placeholder. */
  placeholder: '#9b9a96',
  /** The model chip. */
  control: 'rgba(0, 0, 0, 0.05)',
  /** The dictation glyph. */
  dictate: '#5f5e5a',
  /** The voice and Send buttons' glyphs. */
  onForeground: '#ffffff',
  /** The menus' cards. */
  menu: '#ffffff',
  /** Icons in the menus. */
  menuIcon: '#6f6e69',
  /** A menu row while pressed. */
  menuPressed: 'rgba(0, 0, 0, 0.045)',
  /** The dot on an unread item. */
  unread: '#2f7df6',
  /** Laid over the screen while a hold menu is open. */
  scrim: 'rgba(248, 248, 246, 0.74)',
  /** The capsule behind a held tab (without glass). */
  held: 'rgba(0, 0, 0, 0.06)',
  /** Tints the held tab's glass capsule, a shade darker than the screen. */
  heldGlassTint: 'rgba(222, 221, 216, 0.6)',
  /** The pill naming the tab under the finger. */
  label: '#1f1e1d',
  /** Its text. */
  labelText: '#ffffff',
};

export type ComposerDockColors = typeof defaultColors;

/** An icon in a menu row. */
export type ComposerDockIcon = (props: { color: string; size: number }) => ReactNode;

export interface ComposerDockMenuItem {
  /** Stable key for the row. */
  key: string;
  /** The row's text. */
  label: string;
  /** Drawn before the label. */
  icon?: ComposerDockIcon;
  /** The icon's colour (a project's own colour). Default `colors.menuIcon`. */
  color?: string;
  /** Shows a blue dot at the end of the row. */
  unread?: boolean;
  /** Runs when the row is chosen; the menu closes first. */
  onPress: () => void;
}

export interface ComposerDockMenu {
  /** Recent items, most recent last (the row nearest the tab). */
  items: readonly ComposerDockMenuItem[];
  /** A last row with a filled + ("New project"). Leave out for no row. */
  create?: { label: string; onPress: () => void };
}

export interface ComposerDockAttachment {
  /** Stable key for the row. */
  key: string;
  /** The row's text ("Camera"). */
  label: string;
  /** Drawn before the label. */
  icon?: ComposerDockIcon;
  /** Runs when the row is chosen; the menu closes first. */
  onPress: () => void;
}

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

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Height of the tab row, without the home indicator's inset. */
const TAB_ROW = 48;
/** Between the composer and the tabs. */
const COMPOSER_GAP = 10;
/** Between the composer and the keyboard. */
const KEYBOARD_GAP = 6;
const SIDE = 16;
/** The app's glass: the transparent kind, so surfaces take the screen's tone. */
const GLASS_STYLE = 'regular';
/** Pressable's long-press delay: holding a tab this long opens its menu. */
const LONG_PRESS_MS = 500;
/** Each tab's width; the row is centred. */
const TAB_WIDTH = 80;
const HOLD_CARD_WIDTH = 296;
const ATTACH_CARD_WIDTH = 168;

const fade = { ...tabcnTiming, reduceMotion: ReduceMotion.System };
const glide = LinearTransition.duration(240)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const appear = FadeIn.duration(160).reduceMotion(ReduceMotion.System);
const disappear = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

type ViewRef = RefObject<ComponentRef<typeof View> | null>;

function measure(ref: ViewRef, then: (frame: Frame) => void) {
  ref.current?.measureInWindow((x, y, width, height) => then({ x, y, width, height }));
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

function DockTab({
  tab,
  colors,
  lit,
  held,
  onHold,
  register,
  glass,
}: {
  tab: TabItem;
  colors: ComposerDockColors;
  lit: boolean;
  held: boolean;
  /** The held tab's capsule is Liquid Glass, as in the app. */
  glass: boolean;
  onHold?: (tab: TabItem, anchor: Frame) => void;
  /** Hands the dock this tab's icon, which its menu opens from. */
  register: (key: string, node: ComponentRef<typeof View> | null) => void;
}) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const square = useSharedValue(held ? 1 : 0);
  useEffect(() => {
    square.value = withTiming(held ? 1 : 0, fade);
  }, [held, square]);
  const squareStyle = useAnimatedStyle(() => ({ opacity: square.value }));
  const color = lit ? colors.foreground : colors.muted;

  const open = () => {
    if (onHold) measure(ref, (frame) => onHold(tab, frame));
  };
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      // Touch holds are handled by the row's hold gesture (see ComposerDock); this long press is
      // the screen readers' way in.
      onLongPress={onHold ? open : undefined}
      accessibilityActions={onHold ? [{ name: 'longpress', label: 'Show recent' }] : undefined}
    >
      <View
        ref={(node) => {
          ref.current = node;
          register(tab.key, node);
        }}
        collapsable={false}
        style={styles.iconBox}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.heldCapsule, glass ? null : { backgroundColor: colors.held }, squareStyle]}
        >
          {glass ? (
            <GlassView
              glassEffectStyle={GLASS_STYLE}
              tintColor={colors.heldGlassTint}
              style={[StyleSheet.absoluteFill, styles.heldGlass]}
            />
          ) : null}
        </Animated.View>
        {tab.renderIcon?.({ focused: tab.focused, color, size: 20 })}
      </View>
    </TabButton>
  );
}

/** The dark pill over the tab under the finger. It rides on the scrub indicator. */
function ScrubLabel({ tab, colors }: { tab: TabItem | null; colors: ComposerDockColors }) {
  const { x, width } = useTabIndicator();
  // Keeps the last name while the pill fades out.
  const [text, setText] = useState(tab?.label ?? '');
  if (tab && tab.label !== text) setText(tab.label);
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(tab ? 1 : 0, fade);
  }, [tab, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    width: width.value,
    transform: [{ translateX: x.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.labelTrack, style]}
    >
      <View style={[styles.labelPill, { backgroundColor: colors.label }]}>
        <Text numberOfLines={1} style={[styles.labelText, { color: colors.labelText }]}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

function Composer({
  composerRef,
  colors,
  placeholder,
  model,
  onModelPress,
  onSend,
  onVoicePress,
  onDictatePress,
  onAttachPress,
  dimmed,
  glass,
}: {
  composerRef: ViewRef;
  colors: ComposerDockColors;
  placeholder: string;
  model?: string;
  onModelPress?: () => void;
  onSend?: (text: string) => void;
  onVoicePress?: () => void;
  onDictatePress?: () => void;
  onAttachPress?: () => void;
  dimmed: boolean;
  glass: boolean;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const hasText = text.trim().length > 0;

  const dim = useSharedValue(dimmed ? 1 : 0);
  useEffect(() => {
    dim.value = withTiming(dimmed ? 1 : 0, fade);
  }, [dimmed, dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: 1 - dim.value * 0.6 }));

  const send = () => {
    const value = text.trim();
    if (!value) return;
    onSend?.(value);
    setText('');
  };

  const plus = onAttachPress ? (
    <CircleButton
      key="plus"
      label="Add files and more"
      onPress={onAttachPress}
      glass={glass}
      tint={colors.glassTint}
    >
      <PlusGlyph color={colors.foreground} />
    </CircleButton>
  ) : null;
  const dictate = onDictatePress ? (
    <CircleButton
      key="dictate"
      label="Dictate"
      onPress={onDictatePress}
      glass={glass}
      tint={colors.glassTint}
    >
      <MicGlyph color={colors.dictate} />
    </CircleButton>
  ) : null;
  const action = (
    <CircleButton
      key="action"
      label={hasText ? 'Send' : 'Voice mode'}
      onPress={hasText ? send : onVoicePress}
      background={colors.foreground}
    >
      {hasText ? (
        <Animated.View key="send" entering={appear} exiting={disappear}>
          <ArrowUpGlyph color={colors.onForeground} />
        </Animated.View>
      ) : (
        <Animated.View key="voice" entering={appear} exiting={disappear}>
          <WaveGlyph color={colors.onForeground} />
        </Animated.View>
      )}
    </CircleButton>
  );

  return (
    <Animated.View
      ref={composerRef}
      collapsable={false}
      layout={glide}
      style={[
        styles.composer,
        focused ? styles.composerOpen : null,
        glass
          ? styles.composerGlass
          : { backgroundColor: colors.composer, borderColor: colors.border },
        dimStyle,
      ]}
    >
      {glass ? (
        <GlassView
          glassEffectStyle={GLASS_STYLE}
          tintColor={colors.glassTint}
          isInteractive
          style={[StyleSheet.absoluteFill, { borderRadius: focused ? 22 : 24 }]}
        />
      ) : null}
      {/* Every child is keyed, so the field stays mounted (and focused) when the pill opens
          into the card and the buttons move to the second row. */}
      <Animated.View layout={glide} style={styles.firstRow}>
        {focused ? null : (
          <Animated.View key="plus-rest" entering={appear} exiting={disappear}>
            {plus}
          </Animated.View>
        )}
        <Animated.View key="field" layout={glide} style={styles.fieldBox}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={placeholder}
            multiline
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.field, focused ? styles.fieldOpen : null, { color: colors.foreground }]}
          />
        </Animated.View>
        {focused ? null : (
          <Animated.View key="end-rest" entering={appear} exiting={disappear} style={styles.ends}>
            {dictate}
            {action}
          </Animated.View>
        )}
      </Animated.View>
      {focused ? (
        <Animated.View entering={appear} exiting={disappear} style={styles.secondRow}>
          <View style={styles.ends}>
            {plus}
            {model ? (
              <Pressable
                role="button"
                accessibilityLabel={`Model, ${model}`}
                onPress={onModelPress}
                hitSlop={6}
                style={[styles.chip, glass ? null : { backgroundColor: colors.control }]}
              >
                {glass ? (
                  <GlassView
                    glassEffectStyle={GLASS_STYLE}
                    tintColor={colors.glassTint}
                    isInteractive
                    style={[StyleSheet.absoluteFill, styles.chipGlass]}
                  />
                ) : null}
                <Text style={[styles.chipText, { color: colors.foreground }]}>{model}</Text>
                <GaugeGlyph color={colors.foreground} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.ends}>
            {dictate}
            {action}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function CircleButton({
  label,
  onPress,
  background,
  glass,
  tint,
  children,
}: {
  label: string;
  onPress?: () => void;
  background?: string;
  /** Sits in its own small Liquid Glass circle, as the app's + and dictation buttons do. */
  glass?: boolean;
  tint?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.circle,
        background ? { backgroundColor: background } : null,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {glass ? (
        <GlassView
          glassEffectStyle={GLASS_STYLE}
          tintColor={tint}
          style={[StyleSheet.absoluteFill, styles.circleGlass]}
        />
      ) : null}
      {children}
    </Pressable>
  );
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface RowFrame {
  y: number;
  height: number;
}

/** What a card tells its rows: the row under a held finger, and where each row sits. */
const PopoverContext = createContext<{
  hovered: string | null;
  place: (id: string, frame: RowFrame | null, run?: () => void) => void;
}>({ hovered: null, place: () => {} });

/**
 * A card drawn over the whole screen from inside the dock (`origin` is where the dock sits),
 * `gap` points above the given bottom edge. The screen above
 * `scrimBottom` is washed with `scrim`; a tap anywhere outside the card closes it.
 *
 * With `grow`, the card grows out of the point it opened from (`centerX`, at its bottom edge)
 * while a blur over it clears, as iOS menus do, on an eased curve with no overshoot; closing
 * reverses it. Otherwise it crossfades. With `pointer` (a finger still down from the long
 * press), the row under it is highlighted, and when `lifts` counts up the highlighted row runs.
 */
function Popover({
  open,
  onClose,
  scrim,
  scrimBottom,
  width,
  centerX,
  left,
  bottom,
  gap,
  grow,
  pointer,
  lifts,
  haptics,
  colors,
  glass,
  origin,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  scrim: string;
  scrimBottom: number;
  width: number;
  centerX?: number;
  left?: number;
  bottom: number;
  gap: number;
  grow?: boolean;
  pointer?: { x: number; y: number } | null;
  lifts?: number;
  haptics: boolean;
  colors: ComposerDockColors;
  glass: boolean;
  /** Where the dock sits in the window: the overlay is drawn from there to cover the screen. */
  origin: { x: number; y: number };
  label: string;
  children: (close: (then?: () => void) => void) => ReactNode;
}) {
  const screen = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const shown = useSharedValue(0);
  // Runs once the card has gone: unmounts the overlay, then the chosen row's action (so a screen
  // it opens doesn't appear under a closing menu).
  const after = useRef<(() => void) | undefined>(undefined);
  const finish = useRef(() => {
    setMounted(false);
    const then = after.current;
    after.current = undefined;
    then?.();
  }).current;
  useEffect(() => {
    if (open)
      shown.value = withTiming(1, {
        duration: grow ? 260 : tabcnTiming.duration,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
    else
      shown.value = withTiming(
        0,
        {
          duration: grow ? 180 : tabcnTiming.duration,
          easing: Easing.in(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (done) => {
          if (done) runOnJS(finish)();
        },
      );
  }, [open, shown, finish, grow]);

  const close = (then?: () => void) => {
    after.current = then;
    onClose();
  };
  // Android back closes an open menu.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const x = Math.min(
    Math.max(left ?? (centerX ?? 0) - width / 2, SIDE),
    screen.width - SIDE - width,
  );
  const cardBottom = bottom - gap;
  // The card grows from the tab: from its bottom edge, at the tab's centre.
  const originX = Math.min(Math.max((centerX ?? x) - x, 0), width);

  // Rows report where they sit, so a held finger can be matched to one.
  const [frames, setFrames] = useState<Record<string, RowFrame>>({});
  const runs = useRef(new Map<string, () => void>());
  const [cardHeight, setCardHeight] = useState(0);
  const place = (id: string, frame: RowFrame | null, run?: () => void) => {
    if (run) runs.current.set(id, run);
    if (frame)
      setFrames((all) =>
        all[id]?.y === frame.y && all[id]?.height === frame.height ? all : { ...all, [id]: frame },
      );
  };
  const cardTop = cardBottom - cardHeight;
  let hovered: string | null = null;
  if (pointer && open && pointer.x >= x && pointer.x <= x + width) {
    for (const [id, f] of Object.entries(frames)) {
      if (pointer.y >= cardTop + f.y && pointer.y < cardTop + f.y + f.height) hovered = id;
    }
  }
  // A selection tick for each row the finger slides onto; lifting on one chooses it.
  const lastHovered = useRef<string | null>(null);
  useEffect(() => {
    if (hovered && hovered !== lastHovered.current && haptics) Haptics.selectionAsync();
    lastHovered.current = hovered;
  }, [hovered, haptics]);
  const seenLifts = useRef(lifts ?? 0);
  useEffect(() => {
    if (lifts === undefined || lifts === seenLifts.current) return;
    seenLifts.current = lifts;
    const id = lastHovered.current;
    if (id) runs.current.get(id)?.();
  }, [lifts]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const cardStyle = useAnimatedStyle(() =>
    grow
      ? {
          opacity: interpolate(shown.value, [0, 0.45, 1], [0, 0.85, 1]),
          transform: [{ scale: 0.55 + 0.45 * shown.value }],
        }
      : { opacity: shown.value },
  );
  const blurProps = useAnimatedProps(() => ({ intensity: (1 - shown.value) * 45 }));

  return mounted ? (
    <View
      pointerEvents={open ? 'box-none' : 'none'}
      style={[
        styles.overlay,
        { left: -origin.x, top: -origin.y, width: screen.width, height: screen.height },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => close()}
          style={[styles.scrim, { height: scrimBottom || screen.height, backgroundColor: scrim }]}
        />
        <Pressable
          importantForAccessibility="no"
          accessibilityElementsHidden
          onPress={() => close()}
          style={[styles.scrimRest, { top: scrimBottom || screen.height }]}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={label}
        onAccessibilityEscape={() => close()}
        onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
        style={[
          styles.card,
          grow ? styles.cardLarge : null,
          {
            width,
            left: x,
            bottom: screen.height - cardBottom,
            transformOrigin: `${originX}px 100%`,
          },
          glass ? styles.cardGlass : { backgroundColor: colors.menu, borderColor: colors.border },
          cardStyle,
        ]}
      >
        {glass ? (
          <GlassView
            glassEffectStyle={GLASS_STYLE}
            tintColor={colors.glassTint}
            style={[StyleSheet.absoluteFill, grow ? styles.cardLargeFill : styles.cardGlassFill]}
          />
        ) : null}
        <PopoverContext value={{ hovered, place }}>{children(close)}</PopoverContext>
        {grow ? (
          <AnimatedBlurView
            pointerEvents="none"
            tint="light"
            animatedProps={blurProps}
            style={[StyleSheet.absoluteFill, styles.cardLargeFill]}
          />
        ) : null}
      </Animated.View>
    </View>
  ) : null;
}

function MenuRow({
  id,
  label,
  icon: Icon,
  iconSize,
  iconColor,
  unread,
  create,
  large,
  colors,
  onPress,
}: {
  id: string;
  label: string;
  icon?: ComposerDockIcon;
  iconSize?: number;
  iconColor?: string;
  unread?: boolean;
  create?: boolean;
  /** The hold menu's rows: taller, larger text and icons. */
  large?: boolean;
  colors: ComposerDockColors;
  onPress: () => void;
}) {
  const { hovered, place } = use(PopoverContext);
  const size = iconSize ?? (large ? 18 : 16);
  useEffect(() => {
    place(id, null, onPress);
  });
  return (
    <Pressable
      role="button"
      accessibilityLabel={unread ? `${label}, unread` : label}
      onPress={onPress}
      onLayout={(e) =>
        place(id, { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })
      }
      style={({ pressed }) => [
        styles.row,
        large ? styles.rowLarge : null,
        pressed || hovered === id ? { backgroundColor: colors.menuPressed } : null,
      ]}
    >
      <View style={[styles.rowIcon, large ? styles.rowIconLarge : null]}>
        {create ? (
          <View
            style={[
              styles.createDot,
              large ? styles.createDotLarge : null,
              { backgroundColor: colors.foreground },
            ]}
          >
            <PlusGlyph color={colors.onForeground} size={large ? 14 : 12} />
          </View>
        ) : Icon ? (
          <Icon color={iconColor ?? colors.menuIcon} size={size} />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.rowText, large ? styles.rowTextLarge : null, { color: colors.foreground }]}
      >
        {label}
      </Text>
      {unread ? <View style={[styles.unread, { backgroundColor: colors.unread }]} /> : null}
    </Pressable>
  );
}

const stroke = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function PlusGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...stroke} />
    </Svg>
  );
}

function MicGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} {...stroke} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke={color} {...stroke} />
    </Svg>
  );
}

function WaveGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M4 10.5v3M8 7v10M12 4v16M16 8v8M20 10.5v3" stroke={color} {...stroke} />
    </Svg>
  );
}

function ArrowUpGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M12 19V5M6 11l6-6 6 6" stroke={color} {...stroke} strokeWidth={2.1} />
    </Svg>
  );
}

/** A small dial: the model's effort, beside its name in the chip. */
function GaugeGlyph({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M19.8 16.5A9 9 0 1 0 4.2 16.5" stroke={color} {...stroke} strokeWidth={2} />
      <Path d="m12 13 3.5-4" stroke={color} {...stroke} strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  composer: {
    marginHorizontal: 18,
    marginBottom: COMPOSER_GAP,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  composerGlass: { borderWidth: 0 },
  composerOpen: {
    marginHorizontal: 10,
    borderRadius: 22,
    paddingTop: 4,
    paddingBottom: 6,
  },
  firstRow: { flexDirection: 'row', alignItems: 'center' },
  fieldBox: { flex: 1 },
  field: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 132,
    paddingHorizontal: 6,
    paddingTop: 13,
    paddingBottom: 13,
  },
  fieldOpen: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ends: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  circleGlass: { borderRadius: 17 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 11,
    borderRadius: 14,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  chipGlass: { borderRadius: 14 },
  tabRow: { height: TAB_ROW, justifyContent: 'center' },
  tab: { width: TAB_WIDTH, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 60, height: 42, alignItems: 'center', justifyContent: 'center' },
  // Wider than the icon box: it reaches past it, as the app's does.
  heldCapsule: {
    position: 'absolute',
    left: -2,
    right: -2,
    top: -3,
    bottom: -3,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  heldGlass: { borderRadius: 24 },
  labelTrack: { position: 'absolute', left: 0, top: -20, alignItems: 'center' },
  labelPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: { fontSize: 12, fontWeight: '600' },
  dock: { alignSelf: 'stretch' },
  overlay: { position: 'absolute', zIndex: 10, elevation: 10 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  scrimRest: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  card: {
    position: 'absolute',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.10)',
  },
  cardGlass: { borderWidth: 0, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)' },
  cardGlassFill: { borderRadius: 16 },
  cardLarge: { borderRadius: 24, paddingVertical: 6, borderWidth: 0 },
  cardLargeFill: { borderRadius: 24 },
  groupGap: { marginTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
    gap: 10,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  rowLarge: {
    minHeight: 43,
    paddingHorizontal: 14,
    gap: 14,
    marginHorizontal: 6,
    borderRadius: 14,
  },
  rowIcon: { width: 20, alignItems: 'center' },
  rowIconLarge: { width: 24 },
  rowText: { flex: 1, fontSize: 14 },
  rowTextLarge: { fontSize: 16 },
  createDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createDotLarge: { width: 21, height: 21, borderRadius: 10.5 },
  unread: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
});
