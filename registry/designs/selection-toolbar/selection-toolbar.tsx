/**
 * Selection Toolbar: while a screen is selecting items, the tab bar turns into an action bar for
 * the selection, and turns back when selection ends. A count on the leading side ("3 selected",
 * its digits rolling as it changes), then the actions as icons with short labels, then a round
 * done button.
 *
 * It is content for `useTabBarOverride` (from `react-native-tabcn/expo-router` or
 * `react-native-tabcn/react-navigation`), so it needs a `TabBarProvider` around the tabs
 * navigator:
 *
 * ```tsx
 * useTabBarOverride(
 *   selecting ? (
 *     <SelectionToolbar
 *       count={selected.size}
 *       actions={[
 *         { id: 'share', label: 'Share', icon: ShareIcon, onPress: share },
 *         { id: 'move', label: 'Move', icon: MoveIcon, onPress: move },
 *         { id: 'delete', label: 'Delete', icon: DeleteIcon, onPress: remove, destructive: true },
 *       ]}
 *       onDone={() => setSelecting(false)}
 *     />
 *   ) : null,
 * );
 * ```
 *
 * The bar's tabs fade out and the toolbar fades in on its surface, in the bar's place; its items
 * rise into it one after another, starting with the count. When selection ends the toolbar fades
 * out as one piece, quicker than it came. With "reduce motion" on, the items fade in together
 * without rising.
 *
 * While nothing is selected the actions are dimmed and can't be pressed. The done button, Android
 * back, Escape on the web and the screen-reader escape gesture all call `onDone`.
 *
 * It fills the bar's area: the pill of a floating bar (keep `radius` at its default) or the strip
 * of a docked one (`radius={0}` and the bar's own colour as `colors.surface`). On a floating pill
 * narrower than the labels need, the labels hide and the icons stay; under about 260 pt it is too
 * cramped. On a rail it stacks.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BadgeCount, PressableScale, tabcnTiming, useTabBar } from 'react-native-tabcn';

const defaultColors = {
  /** The toolbar's surface. Defaults suit light floating pills (Soft Pill). */
  surface: '#fafafa',
  /** 1 pt rim around the surface. */
  border: 'rgba(17, 17, 19, 0.06)',
  /** The surface's soft shadow; `'transparent'` for none, as on a docked bar. */
  shadow: 'rgba(40, 32, 24, 0.14)',
  /** The count, the actions' icons and labels, and the done glyph. */
  foreground: '#151517',
  /** A destructive action's icon and label (about 5:1 on `surface`). */
  destructive: '#d1291f',
  /** Behind an action while pressed, and the done button's fill. */
  control: '#ececee',
  /** The done button's fill while pressed. */
  controlPressed: '#dedee2',
};

export type SelectionToolbarColors = typeof defaultColors;

/** The dark palette: pass it as `colors` over a dark bar or in dark mode. */
export const selectionToolbarDarkColors: SelectionToolbarColors = {
  surface: '#1c1c1f',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.36)',
  foreground: '#f4f4f6',
  destructive: '#ff6b61',
  control: '#2c2c31',
  controlPressed: '#38383e',
};

const defaultLabels = {
  /** The word after the rolling count. */
  selected: 'selected',
  /** What a screen reader reads for the count. */
  count: (count: number) => `${count} selected`,
  /** The done button's screen-reader label. */
  done: 'Done',
};

/** The toolbar's words, for translation: pass the ones to change as `labels`. */
export type SelectionToolbarLabels = typeof defaultLabels;

export interface SelectionToolbarIconProps {
  color: string;
  size: number;
}

export interface SelectionAction {
  /** Stable key for the action. */
  id: string;
  /** The short label under the icon, and the action's screen-reader label. */
  label: string;
  icon: ComponentType<SelectionToolbarIconProps>;
  onPress: () => void;
  /** Draws the action in the destructive colour, as for Delete. */
  destructive?: boolean;
  /** Turns the action off even while items are selected. All actions are off at a count of 0. */
  disabled?: boolean;
}

export interface SelectionToolbarProps {
  /** How many items are selected. Its digits roll when it changes; at 0 the actions are off. */
  count: number;
  /** Three or four actions, in order from the count to the done button. */
  actions: readonly SelectionAction[];
  /**
   * Ends selection. Runs from the done button, Android back, Escape on the web and the
   * screen-reader escape gesture.
   */
  onDone: () => void;
  colors?: Partial<SelectionToolbarColors>;
  /** The count's word and the screen-reader labels, merged over the English defaults. */
  labels?: Partial<SelectionToolbarLabels>;
  /**
   * Corner radius of the surface. Default 999, a capsule: the shape of a floating pill. 0 fills
   * a docked bar edge to edge.
   */
  radius?: number;
  /** Light haptic on an action, selection tick on the done button. Default true. */
  haptics?: boolean;
}

/** The entry: each item rises this far, over RISE_MS, STAGGER_MS after the one before. */
const RISE_BY = 8;
const RISE_MS = 180;
const STAGGER_MS = 20;
/** The bar's override fades in over the last 70% of its 200 ms, so the items wait for it. */
const LEAD_MS = 60;
/** Items after the fifth rise with the fifth, so a long row doesn't trail. */
const MAX_STAGGERED = 4;
/** The whole entry: 320 ms. The exit is the bar's 200 ms fade, about 60% of it. */
const ENTER_MS = LEAD_MS + MAX_STAGGERED * STAGGER_MS + RISE_MS;
/** With "reduce motion" on, the items fade in together over this. */
const FADE_MS = 200;
/** Opacity of an action that is off. */
const DIMMED = 0.32;

const ICON = 22;
/** An action's width with its label, and with the icon alone. */
const ACTION_W = 52;
const ACTION_W_COMPACT = 42;
/** The count, the done button and the padding: what the actions leave room for. */
const FIXED_W = 150;
const DONE = 40;
/** The done glyph: two strokes this long, crossing at the centre. */
const GLYPH = 13;
const STROKE = 1.8;

/** Labels stop growing with the system text size here, as the bar's do. */
const MAX_FONT = 1.3;

/** The bit of the DOM's `document` the web Escape handler uses (no DOM types here). */
interface KeyTarget {
  addEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
  removeEventListener: (type: 'keydown', fn: (e: { key: string }) => void) => void;
}

export function SelectionToolbar({
  count,
  actions,
  onDone,
  colors: custom,
  labels: customLabels,
  radius = 999,
  haptics = true,
}: SelectionToolbarProps) {
  // Merged once per change of the colours themselves, not per render: a themed wrapper hands
  // over a new object every time.
  const colorKey = custom ? JSON.stringify(custom) : '';
  const colors = useMemo<SelectionToolbarColors>(
    () => ({ ...defaultColors, ...(colorKey ? JSON.parse(colorKey) : null) }),
    [colorKey],
  );
  const labels = { ...defaultLabels, ...customLabels };
  const rail = useTabBar().position === 'left';
  const reduced = useReducedMotion();
  useEndOnEscape(onDone);

  // Labels show when the bar's area is wide enough for them; measured once per size change.
  const [width, setWidth] = useState<number | null>(null);
  const wide = rail || width === null || width >= FIXED_W + actions.length * ACTION_W;

  // One clock for the whole entry; each item reads its own stretch of it on the UI thread and
  // eases it itself. It runs with "reduce motion" on too: the items then fade instead of rising.
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, {
      duration: ENTER_MS,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
  }, [enter]);

  const done = () => {
    if (haptics) Haptics.selectionAsync();
    onDone();
  };

  return (
    <View
      accessibilityRole="toolbar"
      onAccessibilityEscape={onDone}
      onLayout={(e) => {
        const next = Math.round(e.nativeEvent.layout.width);
        setWidth((current) => (current === next ? current : next));
      }}
      style={[
        styles.toolbar,
        rail && styles.railToolbar,
        {
          borderRadius: rail ? Math.min(radius, 24) : radius,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `0 8px 24px ${colors.shadow}`,
        },
      ]}
    >
      <Item
        index={0}
        enter={enter}
        reduced={reduced}
        style={[styles.count, rail && styles.railCount]}
      >
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={labels.count(count)}
          accessibilityLiveRegion="polite"
          style={[styles.countRow, rail && styles.railCountRow]}
        >
          <BadgeCount
            value={count}
            max={999}
            textStyle={[styles.countText, { color: colors.foreground }]}
          />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT}
            style={[styles.countText, styles.countWord, { color: colors.foreground }]}
          >
            {labels.selected}
          </Text>
        </View>
      </Item>
      <View style={[styles.actions, rail && styles.railActions]}>
        {actions.map((action, i) => (
          <Item key={action.id} index={i + 1} enter={enter} reduced={reduced}>
            <Action
              action={action}
              enabled={count > 0 && !action.disabled}
              wide={wide}
              rail={rail}
              colors={colors}
              haptics={haptics}
            />
          </Item>
        ))}
      </View>
      <Item index={actions.length + 1} enter={enter} reduced={reduced}>
        <PressableScale
          accessibilityLabel={labels.done}
          hitSlop={6}
          onPress={done}
          style={[styles.done, rail && styles.railDone]}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.doneFill,
                { backgroundColor: pressed ? colors.controlPressed : colors.control },
              ]}
            >
              <View
                style={[styles.stroke, styles.strokeDown, { backgroundColor: colors.foreground }]}
              />
              <View
                style={[styles.stroke, styles.strokeUp, { backgroundColor: colors.foreground }]}
              />
            </View>
          )}
        </PressableScale>
      </Item>
    </View>
  );
}

/**
 * One of the toolbar's items, rising into place in its turn: from 8 pt below, fading in, on an
 * ease-out. With "reduce motion" on it only fades, with the others.
 */
function Item({
  index,
  enter,
  reduced,
  style,
  children,
}: {
  index: number;
  enter: SharedValue<number>;
  reduced: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const start = LEAD_MS + Math.min(index, MAX_STAGGERED) * STAGGER_MS;
  const rise = useAnimatedStyle(() => {
    const t = enter.value * ENTER_MS;
    if (reduced) {
      const x = Math.min(1, t / FADE_MS);
      return { opacity: 1 - (1 - x) * (1 - x) };
    }
    const x = Math.min(1, Math.max(0, (t - start) / RISE_MS));
    const eased = 1 - (1 - x) ** 3;
    return { opacity: eased, transform: [{ translateY: (1 - eased) * RISE_BY }] };
  });
  return <Animated.View style={[style, rise]}>{children}</Animated.View>;
}

function Action({
  action,
  enabled,
  wide,
  rail,
  colors,
  haptics,
}: {
  action: SelectionAction;
  enabled: boolean;
  wide: boolean;
  rail: boolean;
  colors: SelectionToolbarColors;
  haptics: boolean;
}) {
  const Icon = action.icon;
  const tint = action.destructive ? colors.destructive : colors.foreground;
  // Off and on fade into each other; with "reduce motion" on, they swap.
  const on = useSharedValue(enabled ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(enabled ? 1 : 0, tabcnTiming);
  }, [enabled, on]);
  const dim = useAnimatedStyle(() => ({ opacity: DIMMED + (1 - DIMMED) * on.value }));

  return (
    <PressableScale
      accessibilityLabel={action.label}
      disabled={!enabled}
      hitSlop={4}
      onPress={() => {
        if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        action.onPress();
      }}
      style={[
        styles.action,
        { width: wide ? ACTION_W : ACTION_W_COMPACT },
        rail && styles.railAction,
      ]}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.pressed,
              { backgroundColor: pressed ? colors.control : 'transparent' },
            ]}
          />
          <Animated.View style={[styles.actionContent, dim]}>
            <Icon color={tint} size={ICON} />
            {wide ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={MAX_FONT}
                style={[styles.actionLabel, { color: tint }]}
              >
                {action.label}
              </Text>
            ) : null}
          </Animated.View>
        </>
      )}
    </PressableScale>
  );
}

/** Android back and Escape on the web end selection while the toolbar is up. */
function useEndOnEscape(onDone: () => void) {
  const latest = useRef(onDone);
  useEffect(() => {
    latest.current = onDone;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      latest.current();
      return true;
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const doc = (globalThis as { document?: KeyTarget }).document;
    if (Platform.OS !== 'web' || !doc) return;
    const onKey = (event: { key: string }) => {
      if (event.key === 'Escape') latest.current();
    };
    doc.addEventListener('keydown', onKey);
    return () => doc.removeEventListener('keydown', onKey);
  }, []);
}

const styles = StyleSheet.create({
  // Fills the bar's area: the override slot is the bar's own box.
  toolbar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderCurve: 'continuous',
    paddingLeft: 18,
    paddingRight: 8,
    gap: 6,
  },
  count: { flex: 1, minWidth: 0 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  countWord: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { height: 46, alignItems: 'center', justifyContent: 'center' },
  actionContent: { alignItems: 'center', gap: 3 },
  pressed: { borderRadius: 14, borderCurve: 'continuous' },
  actionLabel: { fontSize: 10.5, lineHeight: 13, fontWeight: '500' },
  done: { width: DONE, height: DONE, marginLeft: 2 },
  doneFill: {
    flex: 1,
    borderRadius: DONE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stroke: {
    position: 'absolute',
    width: GLYPH * Math.SQRT2,
    height: STROKE,
    borderRadius: STROKE / 2,
  },
  strokeDown: { transform: [{ rotate: '45deg' }] },
  strokeUp: { transform: [{ rotate: '-45deg' }] },
  // On a rail: a column at the top of the rail, the count over its word, the done button last.
  railToolbar: {
    flex: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 8,
  },
  railCount: { flex: 0, alignItems: 'center' },
  railCountRow: { flexDirection: 'column', gap: 0 },
  railActions: { flexDirection: 'column', alignItems: 'stretch', gap: 2 },
  railAction: { width: '100%', height: 54 },
  railDone: { alignSelf: 'center', marginLeft: 0 },
});
