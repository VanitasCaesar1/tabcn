/**
 * Composer Dock: a chat composer over a row of four icon tabs, on the screen's own colour.
 *
 * - Tap a tab to switch. Press and slide along the row to scrub through the tabs: a small
 *   dark pill names the tab under the finger, the composer fades back, and lifting chooses
 *   the tab. `onScrubTab` reports the tab under the finger so a screen can preview it.
 * - Hold a tab that has a menu (`menus`, by route name) to open its recent items in a card
 *   above it, with an optional "New …" row. The held tab gets a soft square behind it and
 *   the screen fades back; tapping outside, Android back or the screen-reader escape
 *   gesture closes it.
 * - The composer is a pill: + (the attachment menu, `attachments`), the text field, a
 *   dictation button and a voice button that turns into Send once there is text. Focused,
 *   it opens into a two-row card with the model chip (`model`, `onModelPress`) and rides on
 *   top of the keyboard while the tabs slip behind it.
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
import * as Haptics from 'expo-haptics';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import 'react-native-gesture-handler';
import {
  type ComponentRef,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
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
  /** The composer's pill and card. */
  composer: '#ffffff',
  /** Hairline edge of the composer and the menus. */
  border: 'rgba(0, 0, 0, 0.07)',
  /** Text, the active tab's icon, and the voice and Send buttons. */
  foreground: '#1f1e1d',
  /** The other tabs' icons. */
  muted: '#a3a29e',
  /** The text field's placeholder. */
  placeholder: '#9b9a96',
  /** The dictation button's circle and the model chip. */
  control: '#f1f0ec',
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
  /** The square behind a held tab. */
  held: 'rgba(0, 0, 0, 0.06)',
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
const COMPOSER_GAP = 4;
/** Between the composer and the keyboard. */
const KEYBOARD_GAP = 8;
const SIDE = 16;
const HOLD_CARD_WIDTH = 232;
const ATTACH_CARD_WIDTH = 176;

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
  colors: custom,
  haptics = true,
}: ComposerDockProps) {
  const colors = { ...defaultColors, ...custom };
  const { tabs, insets } = useTabBar();
  const keyboard = useAnimatedKeyboard();
  const rowRef = useRef<ComponentRef<typeof View>>(null);
  const composerRef = useRef<ComponentRef<typeof View>>(null);

  const [scrubbing, setScrubbing] = useState<TabItem | null>(null);
  const [held, setHeld] = useState<{ key: string; anchor: Frame; rowTop: number } | null>(null);
  const [attach, setAttach] = useState<Frame | null>(null);

  const hover = (tab: TabItem | null) => {
    setScrubbing(tab);
    onScrubTab?.(tab);
  };

  const openMenu = (tab: TabItem, anchor: Frame) => {
    measure(rowRef, (row) => {
      if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setHeld({ key: tab.key, anchor, rowTop: row.y });
    });
  };
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
          attachments ? () => measure(composerRef, (frame) => setAttach(frame)) : undefined
        }
        dimmed={scrubbing !== null}
      />
      <Animated.View ref={rowRef} collapsable={false} style={rowStyle}>
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
              lit={scrubbing ? scrubbing.key === tab.key : tab.focused}
              held={held?.key === tab.key}
              onHold={menus?.[tab.routeName] ? openMenu : undefined}
            />
          ))}
        </TabScrub>
      </Animated.View>
      <Animated.View style={spacerStyle} />

      <Popover
        open={held !== null && menu !== undefined}
        onClose={() => setHeld(null)}
        scrimBottom={shownHeld?.rowTop ?? 0}
        scrim={colors.scrim}
        width={HOLD_CARD_WIDTH}
        centerX={shownHeld ? shownHeld.anchor.x + shownHeld.anchor.width / 2 : 0}
        bottom={shownHeld?.rowTop ?? 0}
        colors={colors}
        label={heldTab ? `${heldTab.label}, recent` : 'Recent'}
      >
        {(close) =>
          menu ? (
            <>
              {menu.items.map((item) => (
                <MenuRow
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  unread={item.unread}
                  colors={colors}
                  onPress={() => close(item.onPress)}
                />
              ))}
              {menu.create ? (
                <MenuRow
                  label={menu.create.label}
                  create
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
        colors={colors}
        label="Add to message"
      >
        {(close) =>
          attachments?.map((group, g) => (
            <View key={group.map((a) => a.key).join()} style={g > 0 ? styles.groupGap : null}>
              {group.map((a) => (
                <MenuRow
                  key={a.key}
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
}: {
  tab: TabItem;
  colors: ComposerDockColors;
  lit: boolean;
  held: boolean;
  onHold?: (tab: TabItem, anchor: Frame) => void;
}) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const square = useSharedValue(held ? 1 : 0);
  useEffect(() => {
    square.value = withTiming(held ? 1 : 0, fade);
  }, [held, square]);
  const squareStyle = useAnimatedStyle(() => ({ opacity: square.value }));
  const color = lit ? colors.foreground : colors.muted;
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onLongPress={onHold ? () => measure(ref, (frame) => onHold(tab, frame)) : undefined}
      accessibilityActions={onHold ? [{ name: 'longpress', label: 'Show recent' }] : undefined}
    >
      <View ref={ref} collapsable={false} style={styles.iconBox}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.heldSquare,
            { backgroundColor: colors.held },
            squareStyle,
          ]}
        />
        {tab.renderIcon?.({ focused: tab.focused, color, size: 22 })}
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
    <CircleButton key="plus" label="Add files and more" onPress={onAttachPress}>
      <PlusGlyph color={colors.foreground} />
    </CircleButton>
  ) : null;
  const dictate = onDictatePress ? (
    <CircleButton
      key="dictate"
      label="Dictate"
      onPress={onDictatePress}
      background={colors.control}
    >
      <MicGlyph color={colors.foreground} />
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
        { backgroundColor: colors.composer, borderColor: colors.border },
        dimStyle,
      ]}
    >
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
                style={[styles.chip, { backgroundColor: colors.control }]}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>{model}</Text>
                <ChevronGlyph color={colors.foreground} />
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
  children,
}: {
  label: string;
  onPress?: () => void;
  background?: string;
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
      {children}
    </Pressable>
  );
}

/**
 * A card in a transparent modal, above the given bottom edge. The screen above `scrimBottom`
 * is washed with `scrim`; a tap anywhere outside the card closes it. Crossfades in and out.
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
  colors,
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
  colors: ComposerDockColors;
  label: string;
  children: (close: (then?: () => void) => void) => ReactNode;
}) {
  const screen = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const shown = useSharedValue(0);
  // Runs once the card has faded out: unmounts the modal, then the chosen row's action (so a
  // screen it opens doesn't appear under a closing menu).
  const after = useRef<(() => void) | undefined>(undefined);
  const finish = useRef(() => {
    setMounted(false);
    const then = after.current;
    after.current = undefined;
    then?.();
  }).current;
  useEffect(() => {
    if (open) shown.value = withTiming(1, fade);
    else
      shown.value = withTiming(0, fade, (done) => {
        if (done) runOnJS(finish)();
      });
  }, [open, shown, finish]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));

  const close = (then?: () => void) => {
    after.current = then;
    onClose();
  };
  const x = Math.min(
    Math.max(left ?? (centerX ?? 0) - width / 2, SIDE),
    screen.width - SIDE - width,
  );

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => close()}
    >
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
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
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          onAccessibilityEscape={() => close()}
          style={[
            styles.card,
            {
              width,
              left: x,
              bottom: screen.height - bottom + 8,
              backgroundColor: colors.menu,
              borderColor: colors.border,
            },
          ]}
        >
          {children(close)}
        </View>
      </Animated.View>
    </Modal>
  );
}

function MenuRow({
  label,
  icon: Icon,
  iconSize = 16,
  unread,
  create,
  colors,
  onPress,
}: {
  label: string;
  icon?: ComposerDockIcon;
  iconSize?: number;
  unread?: boolean;
  create?: boolean;
  colors: ComposerDockColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={unread ? `${label}, unread` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed ? { backgroundColor: colors.menuPressed } : null,
      ]}
    >
      <View style={styles.rowIcon}>
        {create ? (
          <View style={[styles.createDot, { backgroundColor: colors.foreground }]}>
            <PlusGlyph color={colors.onForeground} size={12} />
          </View>
        ) : Icon ? (
          <Icon color={colors.menuIcon} size={iconSize} />
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.rowText, { color: colors.foreground }]}>
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

function ChevronGlyph({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path d="m6 9 6 6 6-6" stroke={color} {...stroke} strokeWidth={2.4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  composer: {
    marginHorizontal: SIDE,
    marginBottom: COMPOSER_GAP,
    minHeight: 54,
    borderRadius: 27,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    justifyContent: 'center',
    boxShadow: '0 1px 6px rgba(0, 0, 0, 0.04)',
  },
  composerOpen: {
    borderRadius: 24,
    paddingTop: 6,
    paddingBottom: 8,
  },
  firstRow: { flexDirection: 'row', alignItems: 'center' },
  fieldBox: { flex: 1 },
  field: {
    fontSize: 16,
    lineHeight: 21,
    maxHeight: 132,
    paddingHorizontal: 8,
    paddingTop: 15,
    paddingBottom: 15,
  },
  fieldOpen: { paddingTop: 10, paddingBottom: 8 },
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ends: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  tabRow: { height: TAB_ROW, paddingHorizontal: 49 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 46, height: 36, alignItems: 'center', justifyContent: 'center' },
  heldSquare: { borderRadius: 11, borderCurve: 'continuous' },
  labelTrack: { position: 'absolute', left: 0, top: -20, alignItems: 'center' },
  labelPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: { fontSize: 12, fontWeight: '600' },
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
  groupGap: { marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    gap: 10,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  rowIcon: { width: 20, alignItems: 'center' },
  rowText: { flex: 1, fontSize: 14 },
  createDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: { width: 7, height: 7, borderRadius: 3.5 },
});
