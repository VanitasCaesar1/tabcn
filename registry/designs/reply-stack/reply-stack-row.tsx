/**
 * Reply Stack's reply row: the viewer's photo and "Post your reply" (one press area that opens
 * your composer), then the action buttons, each its own button. It sits over the tabs; while the
 * bar is minimized it drops into the tabs' row, beside the minimized circle, and narrows from its
 * start edge: the actions stay put and the placeholder ends in an ellipsis. Over Liquid Glass
 * (the bar's `material`) the glass comes and goes on its own and only the content dips and grows,
 * so the glass is never scaled.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ReplyAction, ReplyConfig, ReplyStackColors } from './reply-stack';
import { Glass, type Tint } from './reply-stack-glass';
import { ExpandIcon, GifIcon, PhotoIcon } from './reply-stack-icons';

const defaultActions: readonly ReplyAction[] = [
  { label: 'Add photo', icon: PhotoIcon },
  { label: 'Add GIF', icon: GifIcon },
  { label: 'Expand', icon: ExpandIcon },
];

export function ReplyRow({
  reply,
  presence,
  minimized,
  drop,
  travel,
  colors,
  tint,
  intensity,
  width,
  height,
  dockHeight,
  haptics,
  glass,
  visible,
}: {
  reply: ReplyConfig;
  /** 0 (gone) to 1 (shown): the row rising in or sinking away. */
  presence: SharedValue<number>;
  /** The bar's minimize progress, 0 (full) to 1 (minimized). */
  minimized: SharedValue<number>;
  /** Points the row moves down to sit in the tabs' row while minimized. */
  drop: number;
  /** Points its start edge moves in while minimized, to clear the minimized circle. */
  travel: number;
  colors: ReplyStackColors;
  tint: Tint;
  intensity: number;
  width: number;
  height: number;
  /** Its height while docked: the minimized circle's, as in X, so the two line up. */
  dockHeight: number;
  haptics: boolean;
  /** Liquid Glass instead of the blur. */
  glass: boolean;
  /** Whether the row is wanted: it is still drawn while it sinks away. */
  visible: boolean;
}) {
  const placeholder = reply.placeholder ?? 'Post your reply';
  const actions = reply.actions ?? defaultActions;
  const scale = useSharedValue(1);
  // The start edge is the left, or the right in a right-to-left layout.
  const inward = I18nManager.isRTL ? -travel : travel;
  // The glass starts out absent and comes in once mounted, so it materializes as the row rises.
  const [glassShown, setGlassShown] = useState(false);
  useEffect(() => setGlassShown(visible), [visible]);
  // Rises 12 pt from behind the tabs as it fades in, and drops into the tabs' row while the bar
  // is minimized; dips while the field is pressed. Over Liquid Glass only the content grows and
  // dips (below): a scaled glass draws its edge stretched.
  const motion = useAnimatedStyle(() => {
    const y = interpolate(presence.value, [0, 1], [12, 0]) + minimized.value * drop;
    if (glass) return { transform: [{ translateY: y }] };
    return {
      transform: [
        { translateY: y },
        { scale: interpolate(presence.value, [0, 1], [0.96, 1]) * scale.value },
      ],
    };
  });
  // The content fades with the glass. It sits beside the blur, not around it: iOS draws a blur
  // inside a fading view sharp.
  // Docked, the glass shrinks to the circle's height about its bottom edge, so the content moves
  // down to stay centred in it.
  const sink = (height - dockHeight) / 2;
  const contentFade = useAnimatedStyle(() => {
    const y = minimized.value * sink;
    if (!glass) return { opacity: presence.value, transform: [{ translateY: y }] };
    return {
      opacity: presence.value,
      transform: [
        { translateY: y },
        { scale: interpolate(presence.value, [0, 1], [0.96, 1]) * scale.value },
      ],
    };
  });
  // The photo shrinks with the row, to half the docked height (X's proportion).
  const avatarSize = useAnimatedStyle(() => {
    const size = interpolate(minimized.value, [0, 1], [AVATAR, Math.round(dockHeight * 0.5)]);
    return { width: size, height: size, borderRadius: size / 2 };
  });
  // The photo and placeholder ride the start edge in; the actions stay where they are.
  const fieldShift = useAnimatedStyle(() => ({
    transform: [{ translateX: minimized.value * inward }],
  }));
  // The placeholder is laid out twice, at the full row's width and at the docked row's. As in
  // X's clip, the full text stays while the row moves and gives way to the short one (ending in
  // an ellipsis) only as it lands; on the way back the full text returns as soon as it leaves.
  const fullText = useAnimatedStyle(() => ({
    opacity: interpolate(minimized.value, [DOCK_SWAP, 1], [1, 0], 'clamp'),
  }));
  const shortText = useAnimatedStyle(() => ({
    opacity: interpolate(minimized.value, [DOCK_SWAP, 1], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View pointerEvents="box-none" style={[{ width, height }, motion]}>
      <Glass
        colors={colors}
        tint={tint}
        intensity={intensity}
        width={width}
        height={height}
        presence={presence}
        progress={minimized}
        to={{ width: width - travel, height: dockHeight }}
        moves="start"
        glass={glass}
        shown={glassShown}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[styles.row, StyleSheet.absoluteFill, contentFade]}
      >
        <Animated.View style={[styles.fieldBox, fieldShift]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={placeholder}
            onPressIn={() => {
              scale.value = withTiming(0.98, PRESS_DOWN);
              if (haptics) Haptics.selectionAsync();
            }}
            onPressOut={() => {
              scale.value = withSpring(1, PRESS_UP);
            }}
            onPress={reply.onPress}
            style={styles.field}
          >
            <Animated.View style={[styles.avatar, { backgroundColor: colors.avatar }, avatarSize]}>
              {reply.avatar}
            </Animated.View>
            <View style={styles.textBox}>
              <Animated.Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                // At large text sizes it shrinks a little before it would cut off.
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.placeholder, { color: colors.placeholder }, fullText]}
              >
                {placeholder}
              </Animated.Text>
              <View style={[styles.short, shortInset(travel - ACTION_SLACK)]}>
                <Animated.Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                  style={[styles.placeholder, { color: colors.placeholder }, shortText]}
                >
                  {placeholder}
                </Animated.Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
            >
              <action.icon color={colors.foreground} size={ACTION_ICON} />
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const ACTION_ICON = 24;
/** The viewer's photo at full size. */
const AVATAR = 38;
/** Each action button is wider than its glyph: the docked text may run into this much of the
 * first button's empty side, as X's runs up to the glyph. */
const ACTION_SLACK = 8;
/** Minimize progress from which the docked placeholder takes over. */
const DOCK_SWAP = 0.75;

/**
 * The docked placeholder's box: the text box less `travel` on the side toward the actions (the
 * right, or the left in a right-to-left layout). Written with physical sides, because React
 * Native reads `left` as the start edge in a right-to-left layout unless the app turned that swap
 * off (as the web does), and then `start` and `end` stay physical too.
 */
function shortInset(travel: number) {
  const rtl = Boolean(I18nManager.isRTL);
  const swaps = I18nManager.getConstants?.().doLeftAndRightSwapInRTL ?? true;
  // The style key that means the physical left, and the one that means the physical right.
  const [left, right] = rtl && swaps ? ['right', 'left'] : ['left', 'right'];
  return rtl ? { [left]: travel, [right]: 0 } : { [left]: 0, [right]: travel };
}

const PRESS_DOWN = {
  duration: 100,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
};
const PRESS_UP = { duration: 320, dampingRatio: 0.7, reduceMotion: ReduceMotion.System };

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fieldBox: { flex: 1, alignSelf: 'stretch' },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingStart: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  textBox: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  // The docked placeholder: as wide as the docked row leaves it.
  short: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  placeholder: { fontSize: 17.5 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingEnd: 9 },
  action: { width: 56, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
