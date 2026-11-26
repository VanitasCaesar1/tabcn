/**
 * Sub-Tabs: a drawer of sub-tabs that slides up from behind one tab when it is long-pressed,
 * such as Albums, Artists and Songs above a Library tab, or the accounts above a Profile tab.
 * It is centred on the tab, as wide as the tab or as `width`, and kept on screen; choosing an
 * item runs it and closes the drawer, and so do another long press, switching tabs, the
 * screen-reader escape gesture and Android back. While it is open the tab reads as
 * "expanded".
 *
 * Two parts: `useSubTabs(name)` inside the bar design, on the tab it belongs to, and
 * `<SubTabs name items>` under the `TabBarProvider` (beside the bar, like Quick Create):
 *
 * ```tsx
 * function LibraryTab({ tab }: { tab: TabItem }) {
 *   const sub = useSubTabs('library', { width: 168 });
 *   return (
 *     <TabButton tab={tab} {...sub.tabProps}>
 *       <LibraryIcon />
 *       <View {...sub.anchorProps} />
 *     </TabButton>
 *   );
 * }
 *
 * <SubTabs
 *   name="library"
 *   items={[
 *     { label: 'Albums', onPress: () => router.navigate('/library/albums') },
 *     { label: 'Artists', onPress: () => router.navigate('/library/artists') },
 *   ]}
 * />
 * ```
 *
 * `TabButton`'s `onLongPress` runs after the navigator's `tabLongPress` event and is offered
 * to VoiceOver and TalkBack as a named action ("Show sub-tabs" by default), so screen-reader
 * users reach the drawer too. Choosing an item is a tap after lifting the finger. The drawer
 * slides on tabcnSpring (critically damped, no overshoot) and fades on tabcnTiming; nothing
 * scales, bounces or turns. With "reduce motion" on, both are instant. Not drawn while the
 * bar is a rail. On iOS 26 the drawer is light Liquid Glass that comes and goes with it (the
 * items fade over it); elsewhere, or with `material="solid"`, it is a near-white card.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  type AccessibilityActionInfo,
  I18nManager,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TabPanel, tabcnTiming, usePanelAnchor, useTabBar, useTabPanel } from 'react-native-tabcn';

const defaultColors = {
  /** The drawer's surface. */
  surface: 'rgba(250, 250, 252, 0.97)',
  /** Hairline edge. Not drawn over Liquid Glass. */
  border: 'rgba(0, 0, 0, 0.08)',
  /** Item labels. */
  foreground: '#151517',
  /** The highlight behind an item while it is pressed. */
  pressed: 'rgba(0, 0, 0, 0.06)',
  /** The fill behind a `selected` item. Default: the `pressed` colour. */
  selected: 'rgba(0, 0, 0, 0.06)',
  /** The soft shadow under the drawer. Not drawn over Liquid Glass. */
  shadow: 'rgba(0, 0, 0, 0.12)',
  /** Tint over the Liquid Glass (iOS 26). Unset, the glass is clear. */
  glassTint: undefined as string | undefined,
};

export type SubTabsColors = typeof defaultColors;

export interface SubTabItem {
  /** Short, one line: the drawer is only as wide as its tab, or its `width`. */
  label: string;
  /** Runs after the drawer starts to close. */
  onPress: () => void;
  /** Screen-reader label. Default `label`. */
  accessibilityLabel?: string;
  /**
   * Marks the item as the current one, such as the sub-tab last chosen: it rests on the
   * `selected` fill and reads as selected. Default: not marked.
   */
  selected?: boolean;
}

export interface SubTabsProps {
  /** The name the tab passes to `useSubTabs(name)`. */
  name: string;
  /** Top to bottom. */
  items: readonly SubTabItem[];
  colors?: Partial<SubTabsColors>;
  /**
   * Clear space under the drawer, in points. A panel's bottom edge sits 16 pt behind a
   * floating bar (0 behind a docked one), so the default 24 leaves 8 pt above the tab. Use 8
   * under a docked bar.
   */
  spacing?: number;
  /** A selection haptic when an item is pressed. Default true. */
  haptics?: boolean;
  /**
   * The drawer's surface: `'glass'` (Liquid Glass, iOS 26), `'solid'` (a near-white card with
   * a hairline edge and a soft shadow), or `'auto'` (glass where the system has it, solid
   * elsewhere). Default `'auto'`.
   */
  material?: 'auto' | 'glass' | 'solid';
}

/** The panel id of the drawer for tab `name`. */
const panelId = (name: string) => `sub-tabs:${name}`;

/** Declares the drawer. Renders nothing here: it is drawn behind the bar, above its tab. */
export function SubTabs({
  name,
  items,
  colors: custom,
  spacing = 24,
  haptics = true,
  material = 'auto',
}: SubTabsProps) {
  const glass = material === 'glass' || (material === 'auto' && isLiquidGlassAvailable());
  // A passed `pressed` colour is also the selected fill unless `selected` is given too.
  const colors = {
    ...defaultColors,
    selected: custom?.pressed ?? defaultColors.selected,
    ...custom,
  };
  return (
    <TabPanel id={panelId(name)} anchor={{ name }}>
      <Drawer
        name={name}
        items={items}
        colors={colors}
        spacing={spacing}
        haptics={haptics}
        glass={glass}
      />
    </TabPanel>
  );
}

/** Options for `useSubTabs`. */
export interface UseSubTabsOptions {
  /**
   * The drawer's width in points, centred on the tab and kept 12 pt inside the screen's
   * edges. Default: the tab's own width (about 70 pt on a five-tab phone bar).
   */
  width?: number;
  /** What screen readers call the tab's long-press action. Default "Show sub-tabs". */
  actionLabel?: string;
  /** A selection haptic when the drawer opens or closes. Default true. */
  haptics?: boolean;
}

/** What a tab spreads to own a sub-tab drawer. */
export interface SubTabsHandle {
  /** Spread onto the `TabButton`: the long press, its spoken action and `expanded`. */
  tabProps: {
    onLongPress: () => void;
    accessibilityActions: AccessibilityActionInfo[];
    accessibilityState: { expanded?: boolean };
  };
  /**
   * Spread onto an empty `<View />` inside the `TabButton`. It is invisible and covers the tab
   * (or `width` around its centre); the drawer lines up with it.
   */
  anchorProps: {
    ref: (node: ComponentRef<typeof View> | null) => void;
    onLayout: (event: LayoutChangeEvent) => void;
    pointerEvents: 'none';
    importantForAccessibility: 'no';
    style: ViewStyle;
  };
  open: boolean;
  close: () => void;
}

/** Points a widened drawer keeps from the screen's edges. */
const EDGE = 12;

/** Hooks a tab up to the drawer `<SubTabs name={name}>` declares. Call it in the bar design. */
export function useSubTabs(name: string, options: UseSubTabsOptions = {}): SubTabsHandle {
  const { width, actionLabel = 'Show sub-tabs', haptics = true } = options;
  const anchor = usePanelAnchor(name);
  const panel = useTabPanel(panelId(name));
  const { width: screenWidth } = useWindowDimensions();

  // A wider drawer is centred on the tab, then moved sideways just enough to stay on screen.
  const node = useRef<ComponentRef<typeof View> | null>(null);
  const [shift, setShift] = useState(0);
  const shiftRef = useRef(0);
  const anchorRef = anchor.ref;
  const anchorLayout = anchor.onLayout;
  const ref = useCallback(
    (n: ComponentRef<typeof View> | null) => {
      node.current = n;
      anchorRef(n);
    },
    [anchorRef],
  );
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      anchorLayout(event);
      if (!width || !node.current) return;
      node.current.measureInWindow((x) => {
        // Where the drawer would sit without a shift.
        const base = x - shiftRef.current;
        let next = 0;
        if (base + width > screenWidth - EDGE) next = screenWidth - EDGE - base - width;
        if (base + next < EDGE) next = EDGE - base;
        next = Math.round(next);
        if (next === shiftRef.current) return;
        shiftRef.current = next;
        setShift(next);
      });
    },
    [anchorLayout, width, screenWidth],
  );

  // `shift` is a move to the right on screen. In a right-to-left layout React Native swaps
  // `left` and `marginLeft` to the right side, so the margin's sign flips with it.
  const margin = (I18nManager.isRTL ? -shift : shift) - (width ?? 0) / 2;
  const style: ViewStyle = width
    ? { position: 'absolute', top: 0, bottom: 0, left: '50%', width, marginLeft: margin }
    : { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 };

  return {
    tabProps: {
      onLongPress: () => {
        if (haptics) Haptics.selectionAsync();
        panel.toggle();
      },
      accessibilityActions: [{ name: 'longpress', label: actionLabel }],
      accessibilityState: anchor.accessibilityState,
    },
    anchorProps: { ref, onLayout, pointerEvents: 'none', importantForAccessibility: 'no', style },
    open: panel.state === 'open',
    close: panel.hide,
  };
}

/** The drawer's content. It renders inside the tab bar, under the same provider. */
function Drawer({
  name,
  items,
  colors,
  spacing,
  haptics,
  glass,
}: {
  name: string;
  items: readonly SubTabItem[];
  colors: SubTabsColors;
  spacing: number;
  haptics: boolean;
  glass: boolean;
}) {
  const { state, hide } = useTabPanel(panelId(name));
  const open = state === 'open';
  const { activeIndex } = useTabBar();

  // Switching tabs closes the drawer: it belongs to the tab it came from.
  const lastActive = useRef(activeIndex);
  useEffect(() => {
    if (lastActive.current === activeIndex) return;
    lastActive.current = activeIndex;
    hide();
  }, [activeIndex, hide]);

  // The whole drawer fades while it slides, so it is gone before it passes behind the tab.
  const shown = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    shown.value = withTiming(open ? 1 : 0, tabcnTiming);
  }, [open, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  const reduceMotion = useReducedMotion();

  const list = items.map((item, index) => (
    <Pressable
      // A fixed list from props: labels may repeat, positions can't.
      key={index}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      accessibilityState={item.selected === undefined ? undefined : { selected: item.selected }}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
      onPress={() => {
        hide();
        item.onPress();
      }}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: pressed
            ? colors.pressed
            : item.selected
              ? colors.selected
              : 'transparent',
        },
      ]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.label, { color: colors.foreground }]}
      >
        {item.label}
      </Text>
    </Pressable>
  ));

  // Liquid Glass stops drawing under opacity 0, so with glass the drawer itself stays opaque:
  // the glass comes and goes on its own, and the items fade over it.
  if (glass) {
    return (
      <View style={{ paddingBottom: spacing }}>
        <View style={[styles.surface, styles.surfaceGlass]}>
          <GlassView
            glassEffectStyle={{
              style: open ? 'regular' : 'none',
              animate: !reduceMotion,
              animationDuration: (tabcnTiming.duration ?? 200) / 1000,
            }}
            tintColor={colors.glassTint}
            colorScheme="light"
            style={[StyleSheet.absoluteFill, styles.glass]}
          />
          <Animated.View style={fade}>{list}</Animated.View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[{ paddingBottom: spacing }, fade]}>
      <View
        style={[
          styles.surface,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            boxShadow: `0 8px 24px ${colors.shadow}`,
          },
        ]}
      >
        {list}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingVertical: 4,
  },
  // Liquid Glass brings its own edge and depth: no hairline, no drawn shadow.
  surfaceGlass: {
    borderWidth: 0,
  },
  glass: {
    borderRadius: 18,
  },
  // 44 pt: the least comfortable touch target.
  item: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  label: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
  },
});
