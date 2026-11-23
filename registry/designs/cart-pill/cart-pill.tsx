/**
 * Cart Pill: the tab bar of Shop (Shopify's shopping app). A pill of four icon-only tabs floats
 * centred near the bottom of the screen, the active icon black and the others the same filled
 * glyphs in grey. Two optional round buttons share the pill's row without moving it: a back
 * button at the left (Shop shows it on pushed screens) and a purple cart button at the right
 * with the item count cut out of the white basket (Shop shows it on product screens). Behind
 * the whole bottom edge the screen is softly blurred, more so toward the bottom, with no colour
 * wash. That edge is one blur under a gradient mask (@react-native-masked-view/masked-view, the
 * gradient drawn with react-native-svg).
 *
 * Search, as on Shop's shopping assistant (opt in with `search`): while the search tab is
 * active, the pill and the cart give way to a round back button and a wide "Ask a follow-up"
 * field across the row. Back returns to the tab that was active before search. When the field
 * is focused, the row rides above the keyboard. Keep `tabBarHideOnKeyboard` off for that
 * screen, or the bar hides instead.
 *
 * What is measured and what is not: the sizes, places, glyphs and colours below are measured
 * from Shop's App Store screenshots. The surfaces follow iOS 26 Liquid Glass rather than the
 * screenshots: the pill and the back button are clear glass that the content refracts through,
 * the cart is purple-tinted glass, and the active tab sits in a faint lens (a translucent fill,
 * like the iOS 26 tab bar's selection) instead of a white block. The search row reuses the
 * bar's measures (57 pt tall, 20 pt from the sides) rather than measured ones.
 *
 * Motion: the lens glides to the tapped tab on tabcnSpring (no overshoot, stretch or lift)
 * while the icons crossfade grey to black. The pill never moves or resizes. The back and cart
 * buttons fade in and out; their glyphs dim on touch and fade back on release, and on iOS 26
 * their glass answers the touch too. The cart count rolls to its new value with tabcn's
 * `BadgeCount`. Entering search, the tabs fade and shrink a little as the search row fades and
 * grows in; leaving it runs the other way, each exit taking about 70% of its entry. Reduce
 * motion makes all of it instant. The cart is marked with `usePanelAnchor('action')`, so a
 * `TabPanel` can open from it.
 *
 * The surfaces are Apple's Liquid Glass on iOS 26 and later; on older iOS and on the web a
 * frosted blur with a white capsule behind the active tab, as Shop drew it before Liquid Glass;
 * on Android the app's solid #f7f7f7 fallback (no blur there). Force one with `material`. The
 * edge blur is iOS only; turn it off with `edgeBlur={false}`. The grey of the inactive icons is
 * kept as the app has it (low contrast). The back chevron mirrors in a right-to-left layout.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import MaskedViewClass from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import {
  type ComponentRef,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  I18nManager,
  Platform,
  processColor,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  KeyboardState,
  LayoutAnimationConfig,
  ReduceMotion,
  runOnJS,
  useAnimatedKeyboard,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  BadgeCount,
  type Insets,
  PressableScale,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  tabcnTiming,
  useFocusProgress,
  usePanelAnchor,
  useTabBar,
} from 'react-native-tabcn';

// The package types MaskedView as a class component, which React 19's JSX types don't accept.
const MaskedView = MaskedViewClass as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

const defaultColors = {
  /**
   * Tint of the Liquid Glass (iOS 26+) under the pill, the back button and the search field.
   * Clear by default, so the content behind refracts through it; a very light white (alpha 0.1
   * to 0.2) frosts it a little. Not a milky white: that reads as plastic, not glass.
   */
  glassTint: 'transparent',
  /**
   * The white wash over the blur (older iOS and the web). Over white it reads #fcfcfc and over a
   * #6f7277 photo #dedede, as the app's pill did before Liquid Glass.
   */
  background: 'rgba(253, 253, 253, 0.78)',
  /** The whole surface where there's no blur (Android): the app's own solid fallback. */
  fallback: '#f7f7f7',
  /** The 1 pt brighter rim of the blur and fallback surfaces (Liquid Glass draws its own). */
  rim: 'rgba(255, 255, 255, 0.85)',
  /**
   * The soft drop shadow under the blur and fallback surfaces. Liquid Glass draws its own
   * depth, so it gets none.
   */
  shadow: 'rgba(0, 0, 0, 0.17)',
  /**
   * The lens behind the active tab on Liquid Glass: a faint translucent fill, like the iOS 26
   * tab bar's selection, so the glass still shows through it.
   */
  lens: 'rgba(0, 0, 0, 0.07)',
  /** The opaque capsule behind the active tab on the blur and fallback surfaces. */
  capsule: '#ffffff',
  /** Active icon, and the text typed in the search field. */
  active: '#000000',
  /** Inactive icons: black at 35%, #a6a6a6 over white. */
  inactive: 'rgba(0, 0, 0, 0.35)',
  /** The search field's placeholder. */
  placeholder: 'rgba(0, 0, 0, 0.4)',
  /** The back chevron. */
  chevron: '#000000',
  /**
   * The cart button's solid fill on the blur and fallback surfaces, and the colour of the count
   * cut out of the basket (measured #5432ea; Shop's brand purple is #5a31f4).
   */
  cart: '#5432ea',
  /** Tint of the cart button's Liquid Glass: Shop purple at a high alpha. */
  cartGlass: 'rgba(84, 50, 234, 0.92)',
  /** The cart glyph. The count is cut out of it in `cart`. */
  cartGlyph: '#ffffff',
  /** Tab badges (the app shows none on its tabs): Shop purple with white text. */
  badge: '#5432ea',
  /** The count on a tab badge. */
  badgeText: '#ffffff',
};

export type CartPillColors = typeof defaultColors;

/** `glass`: Liquid Glass (iOS 26+). `blur`: frosted blur. `tint`: solid fill, no blur. */
export type CartPillMaterial = 'auto' | 'glass' | 'blur' | 'tint';
type Surface = Exclude<CartPillMaterial, 'auto'>;

/** Shop's search screen: the tabs and cart give way to a back button and a text field. */
export interface CartPillSearch {
  /** Route name of the tab that is the search screen. */
  route: string;
  /** The field's placeholder, which screen readers also read as its label. Default "Ask a follow-up". */
  placeholder?: string;
  /** The field's text. Leave unset and the field keeps its own, cleared on submit. */
  value?: string;
  onChangeText?: (text: string) => void;
  /** Runs with the text when the keyboard's send key is pressed. */
  onSubmit?: (text: string) => void;
}

export interface CartPillProps {
  /** Shows the round back button at the left and runs on press. Leave unset to hide it. */
  onBackPress?: () => void;
  /** Screen-reader label for both back buttons (this one and search's). Default "Back". */
  backLabel?: string;
  /** Shows the purple cart button at the right and runs on press. Leave unset to hide it. */
  onCartPress?: () => void;
  /** Items in the cart, cut out of the basket. 0 or unset shows an empty basket. */
  cartCount?: number;
  /** Screen-reader label for the cart button; the count is added to it. Default "Cart". */
  cartLabel?: string;
  /**
   * Turns the row into a back button and a text field while the tab `search.route` names is
   * active. On that tab, its back (to the tab before search) replaces `onBackPress`.
   */
  search?: CartPillSearch;
  colors?: Partial<CartPillColors>;
  /** Default `auto`: glass where available, blur on older iOS and the web, solid fill on Android. */
  material?: CartPillMaterial;
  /** The soft blur behind the bottom edge of the screen (iOS only). Default true. */
  edgeBlur?: boolean;
  /** Light haptic tick on press. Default true. */
  haptics?: boolean;
}

/**
 * Measured on the app's App Store screenshots (a 402 pt wide iPhone at 2.42 px per pt; about
 * ±1 pt): the pill is 216 x 57 pt and its bottom edge is 19 pt above the bottom of the screen,
 * inside the home-indicator area. It has 6 pt of padding on every side and four 51 pt slots,
 * so the lens (or capsule) is 51 x 45 pt. The back and cart buttons are 57 pt circles 20 pt from the
 * screen's sides, on the pill's centre line; the pill stays centred whether they show or not.
 * Icon glyphs are 18-22 pt, centred in their slots. The edge blur starts about 80 pt above
 * the bottom of the screen, a little above the pill.
 */
const BAR = 57;
const INSET = 6;
const SLOT = 51;
const DISC = 57;
const SIDE = 20;
const BOTTOM = 19;
/** The least room kept between the pill and a button when the screen is narrow. */
const MIN_GAP = 8;
/** The tab icons' 40-unit box, in points (0.6 pt per unit). */
const ICON = 24;
/** The cart glyph's 44-unit box (the same 0.6 pt per unit), centred on the button. */
const CART = 26.4;
/** Where the count sits in the basket: 1 pt right of the button's centre and 0.3 pt up. */
const COUNT_DX = 1;
const COUNT_DY = -0.3;
/** Glyph opacity while a button is held. */
const PRESSED_OPACITY = 0.6;
/** Height of the edge blur, from the screen's bottom edge. */
const EDGE = 80;
/** How far down from its top the edge blur is fully in (the bottom 16 pt are all full). */
const EDGE_FULL = 64;
/** The edge blur's strength where it is fully in (expo-blur intensity, 0-100). */
const EDGE_INTENSITY = 25;

/** Between the search row's back button and its field. */
const FIELD_GAP = 10;
/** Between the search row and the top of the keyboard. */
const KEYBOARD_GAP = 10;

/** The buttons fade in and out on tabcnTiming's curve; instant with reduce motion on. */
const FADE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const fadeIn = FadeIn.duration(200).easing(FADE_EASING).reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(200).easing(FADE_EASING).reduceMotion(ReduceMotion.System);

/**
 * The swap between the tabs and the search row. What comes in eases out over 300 ms; what goes
 * leaves in 210 ms, 70% of that. Both shrink only a little (to 92% and from 96%), so it reads as
 * one row changing, not things flying away. Instant with reduce motion on.
 */
const SWAP_EASING = Easing.bezier(0.2, 0.8, 0.2, 1);
const swapIn = { duration: 300, easing: SWAP_EASING, reduceMotion: ReduceMotion.System };
const swapOut = { duration: 210, easing: SWAP_EASING, reduceMotion: ReduceMotion.System };
const TABS_GONE_SCALE = 0.92;
const SEARCH_FROM_SCALE = 0.96;

function resolveMaterial(material: CartPillMaterial): Surface {
  if (material !== 'auto') return material;
  if (isLiquidGlassAvailable()) return 'glass';
  return Platform.OS === 'android' ? 'tint' : 'blur';
}

export function CartPill({
  onBackPress,
  backLabel = 'Back',
  onCartPress,
  cartCount,
  cartLabel = 'Cart',
  search,
  colors: custom,
  material = 'auto',
  edgeBlur = true,
  haptics = true,
}: CartPillProps) {
  // Merged once per change of the colours themselves, not per render: a themed wrapper hands
  // over a new object every time.
  const colorsKey = custom ? JSON.stringify(custom) : '';
  const colors = useMemo<CartPillColors>(
    () => ({ ...defaultColors, ...(colorsKey ? JSON.parse(colorsKey) : null) }),
    [colorsKey],
  );
  const surface = resolveMaterial(material);
  const { tabs, activeIndex, insets } = useTabBar();
  const window = useWindowDimensions();
  // Liquid Glass draws its own edge and depth; the other surfaces get a soft shadow.
  const shadow = surface === 'glass' ? null : { boxShadow: `0 4px 24px ${colors.shadow}` };

  // 51 pt a tab, as in the app (216 pt for four), narrowed only when it would not fit. Room
  // for the buttons is kept on both sides (so the pill stays centred) only when one shows.
  const sides = onBackPress != null || onCartPress != null;
  const room =
    window.width - insets.left - insets.right - (sides ? (SIDE + DISC + MIN_GAP) * 2 : SIDE * 2);
  const pillWidth = Math.max(BAR, Math.min(INSET * 2 + SLOT * Math.max(1, tabs.length), room));

  // The app's bar sits 19 pt above the screen edge, inside the home indicator's inset.
  // Elsewhere (no inset, Android navigation bars) it keeps clear of the system area.
  const bottom = Math.max(BOTTOM, Platform.OS === 'ios' ? insets.bottom - 15 : insets.bottom + 8);

  // Search: while its tab is active the search row shows. Back goes to the last other tab.
  const active = tabs[activeIndex];
  const searching = search != null && active?.routeName === search.route;
  const lastTab = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (active && !searching) lastTab.current = active.routeName;
  }, [active, searching]);
  const leaveSearch = () => {
    const target =
      tabs.find((tab) => tab.routeName === lastTab.current) ??
      tabs.find((tab) => tab.routeName !== search?.route);
    target?.press();
  };

  // The search row stays mounted while it fades out, then goes (its glass with it).
  const [searchShown, setSearchShown] = useState(searching);
  if (searching && !searchShown) setSearchShown(true);
  const tabsGone = useSharedValue(searching ? 1 : 0);
  const searchIn = useSharedValue(searching ? 1 : 0);
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (searching) {
      tabsGone.value = withTiming(1, swapOut);
      searchIn.value = withTiming(1, swapIn);
      return;
    }
    field.current?.blur();
    tabsGone.value = withTiming(0, swapIn);
    searchIn.value = withTiming(0, swapOut, (finished) => {
      if (finished) runOnJS(setSearchShown)(false);
    });
  }, [searching, tabsGone, searchIn]);
  const tabsStyle = useAnimatedStyle(() => ({
    opacity: 1 - tabsGone.value,
    transform: [{ scale: interpolate(tabsGone.value, [0, 1], [1, TABS_GONE_SCALE]) }],
  }));
  const searchStyle = useAnimatedStyle(() => ({
    opacity: searchIn.value,
    transform: [{ scale: interpolate(searchIn.value, [0, 1], [SEARCH_FROM_SCALE, 1]) }],
  }));

  const rows = (
    <>
      <Animated.View
        pointerEvents={searching ? 'none' : 'box-none'}
        importantForAccessibility={searching ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={searching}
        style={[styles.row, tabsStyle]}
      >
        {/* The buttons that are there when the bar first shows don't fade in. */}
        <LayoutAnimationConfig skipEntering>
          {/*
            With a button, both sides keep their room, so the pill stays centred; without one
            they take none. They stay mounted either way, so a leaving button can fade out.
          */}
          <View style={sides ? styles.side : styles.noSide}>
            {onBackPress ? (
              <BackButton
                label={backLabel}
                onPress={onBackPress}
                surface={surface}
                colors={colors}
                haptics={haptics}
                shadow={shadow}
              />
            ) : null}
          </View>
          <View style={[styles.pill, shadow, { width: pillWidth }]}>
            <Glass surface={surface} colors={colors} />
            <TabList style={styles.list}>
              <TabIndicator
                inset={{ x: 0, y: INSET }}
                style={[
                  styles.capsule,
                  { backgroundColor: surface === 'glass' ? colors.lens : colors.capsule },
                ]}
              />
              {tabs.map((tab) => (
                <Tab key={tab.key} tab={tab} colors={colors} haptics={haptics} />
              ))}
            </TabList>
          </View>
          <View style={sides ? styles.side : styles.noSide}>
            {onCartPress ? (
              <CartButton
                count={cartCount ?? 0}
                label={cartLabel}
                onPress={onCartPress}
                surface={surface}
                colors={colors}
                haptics={haptics}
                shadow={shadow}
              />
            ) : null}
          </View>
        </LayoutAnimationConfig>
      </Animated.View>
      {search && searchShown ? (
        <Animated.View
          pointerEvents={searching ? 'box-none' : 'none'}
          importantForAccessibility={searching ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!searching}
          style={[styles.searchRow, searchStyle]}
        >
          <SearchRow
            search={search}
            fieldRef={field}
            backLabel={backLabel}
            onBack={leaveSearch}
            surface={surface}
            colors={colors}
            haptics={haptics}
            shadow={shadow}
          />
        </Animated.View>
      ) : null}
    </>
  );

  return (
    // The offset is from the safe area, so subtract the inset to measure from the screen edge.
    <TabBarRoot placement="floating" offset={bottom - insets.bottom} style={styles.root}>
      {edgeBlur && Platform.OS === 'ios' ? <EdgeBlur below={bottom} insets={insets} /> : null}
      {search ? (
        <KeyboardLift lifted={searching} bottom={bottom}>
          {rows}
        </KeyboardLift>
      ) : (
        <View style={styles.rows}>{rows}</View>
      )}
    </TabBarRoot>
  );
}

/**
 * While search is on, the row rides above the keyboard. A spacer under it makes the bar's own
 * frame (and the height screens pad by) include the keyboard, but it changes only once the
 * keyboard has settled, so the navigator doesn't relay out on every frame of the keyboard's
 * slide. While the keyboard moves, the row follows it with a transform (UI thread, no layout).
 * When search ends the row slides back down with the closing keyboard.
 */
function KeyboardLift({
  lifted,
  bottom,
  children,
}: {
  lifted: boolean;
  /** The row's bottom edge, in points above the bottom of the screen. */
  bottom: number;
  children: ReactNode;
}) {
  const keyboard = useAnimatedKeyboard();
  const on = useSharedValue(lifted ? 1 : 0);
  useEffect(() => {
    on.value = lifted ? 1 : withTiming(0, swapOut);
  }, [lifted, on]);
  const settled = useSharedValue(0);
  useAnimatedReaction(
    () => ({
      state: keyboard.state.value,
      lift: on.value * Math.max(0, keyboard.height.value + KEYBOARD_GAP - bottom),
    }),
    ({ state, lift }) => {
      // Platforms that don't report keyboard states (UNKNOWN) follow every frame.
      const atRest =
        state === KeyboardState.OPEN ||
        state === KeyboardState.CLOSED ||
        state === KeyboardState.UNKNOWN;
      if (atRest && settled.value !== lift) settled.value = lift;
    },
  );
  const spacerStyle = useAnimatedStyle(() => ({ height: settled.value }));
  const rideStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          settled.value - on.value * Math.max(0, keyboard.height.value + KEYBOARD_GAP - bottom),
      },
    ],
  }));
  return (
    <>
      <Animated.View style={[styles.rows, rideStyle]}>{children}</Animated.View>
      <Animated.View style={spacerStyle} />
    </>
  );
}

/** The search row: a round back button and a wide text field, the pill's height. */
function SearchRow({
  search,
  fieldRef,
  backLabel,
  onBack,
  surface,
  colors,
  haptics,
  shadow,
}: {
  search: CartPillSearch;
  fieldRef: RefObject<ComponentRef<typeof TextInput> | null>;
  backLabel: string;
  onBack: () => void;
  surface: Surface;
  colors: CartPillColors;
  haptics: boolean;
  shadow: { boxShadow: string } | null;
}) {
  const placeholder = search.placeholder ?? 'Ask a follow-up';
  const [draft, setDraft] = useState('');
  const controlled = search.value != null;
  const text = search.value ?? draft;
  return (
    <>
      {/* The row fades in as one piece; the back button doesn't fade in again inside it. */}
      <LayoutAnimationConfig skipEntering skipExiting>
        <BackButton
          label={backLabel}
          onPress={onBack}
          surface={surface}
          colors={colors}
          haptics={haptics}
          shadow={shadow}
        />
      </LayoutAnimationConfig>
      <View style={[styles.field, shadow]}>
        <Glass surface={surface} colors={colors} />
        <TextInput
          ref={fieldRef}
          value={text}
          onChangeText={(next) => {
            if (!controlled) setDraft(next);
            search.onChangeText?.(next);
          }}
          onSubmitEditing={() => {
            search.onSubmit?.(text);
            if (!controlled) setDraft('');
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={placeholder}
          returnKeyType="send"
          enablesReturnKeyAutomatically
          selectionColor={colors.cart}
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { color: colors.active }]}
        />
      </View>
    </>
  );
}

/**
 * The clear surface behind the pill, the back button and the search field: fills its parent,
 * clipped round. `interactive` lets the Liquid Glass answer touches (it has to be the view
 * touched, so it then takes them; its parent's press handlers still run).
 */
function Glass({
  surface,
  colors,
  interactive = false,
}: {
  surface: Surface;
  colors: CartPillColors;
  interactive?: boolean;
}) {
  if (surface === 'glass') {
    return (
      <GlassView
        pointerEvents={interactive ? 'auto' : 'none'}
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive={interactive}
        tintColor={visible(colors.glassTint) ? colors.glassTint : undefined}
        style={[StyleSheet.absoluteFill, styles.round]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, styles.round, styles.clip]}>
        {surface === 'blur' ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: surface === 'blur' ? colors.background : colors.fallback },
          ]}
        />
      </View>
      <View
        style={[StyleSheet.absoluteFill, styles.round, styles.rim, { borderColor: colors.rim }]}
      />
    </View>
  );
}

/**
 * The scroll-edge blur: one full-width blur ending at the screen's bottom edge, seen through a
 * gradient mask, so it builds from nothing at its top to full strength 16 pt above the bottom.
 * One blur, not a stack of them: every blur re-samples the content under it on each scrolled
 * frame. Thin material at a low intensity, so it adds almost no colour. Touches pass through.
 */
function EdgeBlur({ below, insets }: { below: number; insets: Insets }) {
  return (
    <MaskedView
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.edge, { bottom: -below, left: -insets.left, right: -insets.right }]}
      maskElement={<EdgeMask />}
    >
      <BlurView
        intensity={EDGE_INTENSITY}
        tint="systemUltraThinMaterialLight"
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}

/** The edge blur's mask: clear at the top, opaque from `EDGE_FULL` points down. */
function EdgeMask() {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="cart-pill-edge" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset={EDGE_FULL / EDGE} stopColor="#000" stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cart-pill-edge)" />
    </Svg>
  );
}

function Tab({ tab, colors, haptics }: { tab: TabItem; colors: CartPillColors; haptics: boolean }) {
  // Grey to black crossfade of the same filled glyph; nothing moves or changes size.
  const progress = useFocusProgress(tab);
  const activeIcon = useAnimatedStyle(() => ({ opacity: progress.value }));
  // The grey copy stays under the black one until the last stretch (no dip in ink), then
  // drops out so the active glyph rests alone.
  const inactiveIcon = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [1, 0], 'clamp'),
  }));

  const idle = splitAlpha(colors.inactive);
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <View style={styles.icon}>
        <Animated.View style={[StyleSheet.absoluteFill, inactiveIcon]}>
          <View style={[StyleSheet.absoluteFill, { opacity: idle.alpha }]}>
            {tab.renderIcon?.({ focused: false, color: idle.color, size: ICON })}
          </View>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeIcon]}>
          {tab.renderIcon?.({ focused: true, color: colors.active, size: ICON })}
        </Animated.View>
        <Badge badge={tab.badge} colors={colors} />
      </View>
    </TabButton>
  );
}

/**
 * A badge at the icon's top right: a dot for an empty badge, a count otherwise. Shop shows
 * none on its tabs; this one is in its purple. The tab's label already reads it.
 */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: CartPillColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (text === '') {
    return <View pointerEvents="none" style={[styles.dot, { backgroundColor: colors.badge }]} />;
  }
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.badge, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          style={[textStyle, styles.badgeTextCap]}
        >
          {text}
        </Text>
      )}
    </View>
  );
}

/** Dims its glyph at once on touch, as a UIButton highlight does, and fades it back. */
function usePressDim() {
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return {
    style,
    onPressIn: () => {
      opacity.value = PRESSED_OPACITY;
    },
    onPressOut: () => {
      opacity.value = withTiming(1, tabcnTiming);
    },
  };
}

/** The round back button: a clear glass circle (frosted where there's no glass) with a black chevron. */
function BackButton({
  label,
  onPress,
  surface,
  colors,
  haptics,
  shadow,
}: {
  label: string;
  onPress: () => void;
  surface: Surface;
  colors: CartPillColors;
  haptics: boolean;
  shadow: { boxShadow: string } | null;
}) {
  const dim = usePressDim();
  return (
    <Animated.View entering={fadeIn} exiting={fadeOut}>
      <PressableScale
        scale={1}
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          dim.onPressIn();
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={dim.onPressOut}
        style={[styles.disc, shadow]}
      >
        <Glass surface={surface} colors={colors} interactive />
        <Animated.View pointerEvents="none" style={dim.style}>
          <View style={I18nManager.isRTL ? styles.mirrored : null}>
            <Chevron color={colors.chevron} />
          </View>
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * The purple cart button: purple-tinted Liquid Glass, or a solid purple disc on the other
 * surfaces. The count is cut out of the white basket in the button's purple.
 */
function CartButton({
  count,
  label,
  onPress,
  surface,
  colors,
  haptics,
  shadow,
}: {
  count: number;
  label: string;
  onPress: () => void;
  surface: Surface;
  colors: CartPillColors;
  haptics: boolean;
  shadow: { boxShadow: string } | null;
}) {
  const anchor = usePanelAnchor('action');
  const dim = usePressDim();
  const items = Math.max(0, Math.floor(count));
  return (
    <Animated.View entering={fadeIn} exiting={fadeOut}>
      <PressableScale
        {...anchor}
        scale={1}
        accessibilityLabel={
          items > 0 ? `${label}, ${items} ${items === 1 ? 'item' : 'items'}` : label
        }
        onPress={onPress}
        onPressIn={() => {
          dim.onPressIn();
          if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={dim.onPressOut}
        style={[styles.disc, shadow, surface === 'glass' ? null : { backgroundColor: colors.cart }]}
      >
        {surface === 'glass' ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme="light"
            isInteractive
            tintColor={colors.cartGlass}
            style={[StyleSheet.absoluteFill, styles.discRound]}
          />
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.cart, dim.style]}>
          <CartGlyph color={colors.cartGlyph} />
          {items > 0 ? (
            <View pointerEvents="none" style={styles.count}>
              {/* The count is cut out of the basket, about two digits wide: past 9 it shows "9+",
                  which still fits (two digits or "99+" spilled onto the disc and vanished). */}
              <BadgeCount
                value={items}
                max={9}
                textStyle={[styles.countText, { color: colors.cart }]}
              />
            </View>
          ) : null}
        </Animated.View>
      </PressableScale>
    </Animated.View>
  );
}

/**
 * Shop's cart, measured on the screenshots: a 21.5 x 23 pt glyph whose handle runs out to the
 * top left and on down the basket's slanted left side, a basket with a rounded bottom, and
 * two wheels. Drawn in a 44-unit box (0.6 pt per unit) centred on the button.
 */
function CartGlyph({ color }: { color: string }) {
  return (
    <Svg width={CART} height={CART} viewBox="-2 -2 44 44">
      <Path
        d="M6.1 8.8H33.15A3 3 0 0 1 36.15 11.8L34.55 24.1A6.5 6.5 0 0 1 28.05 30.6H15.5A5.5 5.5 0 0 1 9.03 25.1Z"
        fill={color}
      />
      <Path
        d="M1.15 3.1H6.65L7.9 10"
        stroke={color}
        strokeWidth={3.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={11.8} cy={36.6} r={3.1} fill={color} />
      <Circle cx={29.75} cy={36.6} r={3.1} fill={color} />
    </Svg>
  );
}

/** chevron.left as Shop draws it: 14.5 pt tall, a 1.9 pt round-capped stroke. */
function Chevron({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON} viewBox="0 0 40 40">
      <Path
        d="M25.3 9.5L14.8 20L25.3 30.5"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * A colour's red, green, blue (0-255) and alpha (0-1), read by React Native's own parser, so
 * named colours, hsl() and every hex form work; null for what it can't read (PlatformColor).
 */
function channels(color: string): [number, number, number, number] | null {
  const value = processColor(color);
  if (typeof value !== 'number') return null;
  return [(value >>> 16) & 255, (value >>> 8) & 255, value & 255, ((value >>> 24) & 255) / 255];
}

/**
 * A translucent colour as its opaque colour and its alpha. An icon drawn in a translucent
 * colour darkens wherever its strokes and fills overlap; drawn opaque under an opacity of the
 * same alpha, it reads evenly.
 */
function splitAlpha(color: string): { color: string; alpha: number } {
  const c = channels(color);
  if (!c) return { color, alpha: 1 };
  return { color: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, alpha: c[3] };
}

/** Whether a colour shows at all: false for `transparent` and anything at alpha 0. */
function visible(color: string): boolean {
  const c = channels(color);
  return c == null || c[3] > 0;
}

const styles = StyleSheet.create({
  // A text badge stays on one line and stops growing at this width, ending in an ellipsis.
  badgeTextCap: { maxWidth: 56 },
  root: {
    alignSelf: 'stretch',
  },
  // Both rows sit in the same place, one over the other.
  rows: {
    height: DISC,
  },
  row: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE,
  },
  searchRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: FIELD_GAP,
    paddingHorizontal: SIDE,
  },
  field: {
    flex: 1,
    height: BAR,
    borderRadius: BAR / 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 0,
    fontSize: 17,
  },
  side: {
    width: DISC,
    height: DISC,
  },
  noSide: {
    width: 0,
    height: DISC,
  },
  pill: {
    height: BAR,
    borderRadius: BAR / 2,
  },
  list: {
    flex: 1,
    paddingHorizontal: INSET,
  },
  round: {
    borderRadius: BAR / 2,
  },
  clip: {
    overflow: 'hidden',
  },
  rim: {
    borderWidth: 1,
  },
  capsule: {
    borderRadius: (BAR - INSET * 2) / 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: ICON / 2 + 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    includeFontPadding: false,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discRound: {
    borderRadius: DISC / 2,
  },
  cart: {
    width: CART,
    height: CART,
  },
  // Centred 1 pt right of and 0.3 pt above the button's centre, inside the basket.
  count: {
    position: 'absolute',
    top: 0,
    bottom: -COUNT_DY * 2,
    left: COUNT_DX * 2,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A bold rounded numeral with a 7.5 pt cap height (SF Pro Rounded on iOS).
  countText: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'ui-rounded' }),
    includeFontPadding: false,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  edge: {
    position: 'absolute',
    height: EDGE,
  },
});
