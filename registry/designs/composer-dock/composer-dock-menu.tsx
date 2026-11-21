/**
 * Composer Dock's menus: a card drawn over the whole screen from inside the dock, with its rows.
 * A hold menu grows out of the held tab while a blur over it clears; a held finger can slide
 * onto a row and lift to choose it. Part of the Composer Dock design (composer-dock.tsx).
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { createContext, type ReactNode, use, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  processColor,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tabcnTiming } from 'react-native-tabcn';
import { PlusGlyph } from './composer-dock-composer';
import {
  type ComposerDockColors,
  type ComposerDockIcon,
  GLASS_STYLE,
  SIDE,
} from './composer-dock-theme';

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * The blur that clears over a growing menu takes the screen's tone: dark on a dark
 * `background`, light otherwise.
 */
function blurTint(background: string): 'light' | 'dark' {
  const value = processColor(background);
  if (typeof value !== 'number') return 'light';
  const r = (value >>> 16) & 255;
  const g = (value >>> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128 ? 'dark' : 'light';
}

interface RowFrame {
  y: number;
  height: number;
}

/** What a card tells its rows: the row under a held finger, and where each row sits. */
const PopoverContext = createContext<{
  hovered: string | null;
  place: (id: string, frame: RowFrame | null, run?: () => void) => void;
  forget: (id: string) => void;
}>({ hovered: null, place: () => {}, forget: () => {} });

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
export function Popover({
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
  // Rows report where they sit, so a held finger can be matched to one.
  const [frames, setFrames] = useState<Record<string, RowFrame>>({});
  const runs = useRef(new Map<string, () => void>());
  // Runs once the card has gone: unmounts the overlay, then the chosen row's action (so a screen
  // it opens doesn't appear under a closing menu). The rows go with it: the next menu (another
  // tab's) has rows of its own, and a finger must never land on one of these.
  const after = useRef<(() => void) | undefined>(undefined);
  const finish = useRef(() => {
    setMounted(false);
    setFrames({});
    runs.current.clear();
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

  const [cardHeight, setCardHeight] = useState(0);
  const place = (id: string, frame: RowFrame | null, run?: () => void) => {
    if (run) runs.current.set(id, run);
    if (frame)
      setFrames((all) =>
        all[id]?.y === frame.y && all[id]?.height === frame.height ? all : { ...all, [id]: frame },
      );
  };
  // A row that leaves an open card (its item was removed) takes its frame and action with it.
  const forget = (id: string) => {
    runs.current.delete(id);
    setFrames((all) => {
      if (!(id in all)) return all;
      const { [id]: _gone, ...rest } = all;
      return rest;
    });
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
        <PopoverContext value={{ hovered, place, forget }}>{children(close)}</PopoverContext>
        {grow ? (
          <AnimatedBlurView
            pointerEvents="none"
            tint={blurTint(colors.background)}
            animatedProps={blurProps}
            style={[StyleSheet.absoluteFill, styles.cardLargeFill]}
          />
        ) : null}
      </Animated.View>
    </View>
  ) : null;
}

export function MenuRow({
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
  const { hovered, place, forget } = use(PopoverContext);
  const size = iconSize ?? (large ? 18 : 16);
  useEffect(() => {
    place(id, null, onPress);
  });
  const forgetRef = useRef(forget);
  forgetRef.current = forget;
  useEffect(() => () => forgetRef.current(id), [id]);
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

const styles = StyleSheet.create({
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
