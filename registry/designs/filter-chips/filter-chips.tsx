/**
 * Filter Chips: a dark strip of filter chips that peeks out from behind the tab bar: a round
 * "all filters" button, a capsule of chips that scrolls sideways (Sort, Delivery…), and a
 * round clear-all button once something is applied. Tapping a chip grows the capsule into a
 * card of that group's options, with Clear and Apply; the chip's label rises into the card's
 * title. Apply folds the card back into the capsule, and the chip now names the choice in the
 * accent colour ("Top rated", or "Ships today +1" for several). The round button opens every
 * group in one card. Picks are a draft: Android back, Escape on the web or the screen-reader
 * escape gesture fold the card back and drop them, and only Apply calls `onChange`.
 *
 * It is one `TabPanel` that peeks as the strip and opens as the card, so it needs a
 * `TabBarProvider` around the tabs navigator, and the strip's height counts in
 * `useTabBarInset` while it shows. Declare it on the screen that filters and hide it when that
 * screen blurs (`useTabPanel(id).hide`), or once beside `<Tabs>` for every tab:
 *
 * ```tsx
 * const [filters, setFilters] = useState<FilterValue>({});
 * <FilterChips groups={groups} value={filters} onChange={setFilters} />
 * ```
 *
 * The card grows up out of the strip, its bottom edge held on the strip's line while the panel
 * rises, and stops above the bar. Its content rides the card's top edge and is cut off at that
 * line, so the card pushes it up out of the strip. The card is the strip's colour, drawn as two
 * stretched bands and four corner circles; everything moves by transforms and opacity on the
 * UI thread, on `tabcnSpring` in step with the panel's own slide, so nothing is laid out per
 * frame. With "reduce motion" on, it is all instant. `colors.surface` must be opaque: the
 * card's pieces overlap. Not drawn as a rail: on a tablet rail, panels aren't drawn.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import {
  type ComponentRef,
  type ComponentType,
  Fragment,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  I18nManager,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect as SvgRect } from 'react-native-svg';
import {
  type PanelState,
  PressableScale,
  TabPanel,
  tabcnSpring,
  usePanelOverlap,
  useTabPanel,
} from 'react-native-tabcn';

import { CrossIcon, type FilterIconProps, SlidersIcon } from './filter-chips-icons';

const defaultColors = {
  /**
   * The strip, the round buttons, the sheet and the shape that grows between them. Must be
   * opaque: the shape is drawn from overlapping pieces.
   */
  surface: '#17171b',
  /** Clear's fill. */
  control: '#2a2a31',
  /** Lines between chips, and around options not chosen. */
  divider: 'rgba(255, 255, 255, 0.14)',
  /** Labels and glyphs. */
  foreground: '#f5f5f7',
  /** Group titles in the all-filters sheet, and Clear while there is nothing to clear. */
  muted: 'rgba(245, 245, 247, 0.5)',
  /** A chip with a choice, chosen options, the round button's dot, and Apply. */
  accent: '#5cb2ff',
  /** Apply's label. */
  onAccent: '#08131f',
  /** Behind a chosen option's accent label. */
  chosen: 'rgba(92, 178, 255, 0.16)',
};

export type FilterChipsColors = typeof defaultColors;

const defaultLabels = {
  /** The round button's label and the all-filters sheet's title. */
  allFilters: 'All filters',
  /** Empties the draft for the groups in view. */
  clear: 'Clear',
  /** Applies the draft and folds the sheet back. */
  apply: 'Apply',
  /** The round clear-all button. */
  clearAll: 'Clear all filters',
  /** Read after "All filters" while something is applied. */
  applied: (count: number) => `${count} applied`,
  /** Read after a chip's group while it has no choice. */
  any: 'Any',
  /** A chip with several choices: the first and how many more. */
  more: (first: string, rest: number) => `${first} +${rest}`,
};

/** The strip's and sheet's words, for translation: pass the ones to change as `labels`. */
export type FilterChipsLabels = typeof defaultLabels;

export interface FilterOption {
  /** Stored in `value` when chosen. */
  id: string;
  /** Shown on the option, and on the chip when it is the only choice. */
  label: string;
}

export interface FilterGroup {
  /** Key in `value`. */
  id: string;
  /** The chip's label while nothing is chosen, and the sheet's title. */
  label: string;
  /** Glyph before the chip's label. */
  icon?: ComponentType<FilterIconProps>;
  /** The choices, in the order shown. */
  options: readonly FilterOption[];
  /** Allows several options at once (checkboxes). Default false: one at most (radio buttons). */
  multiple?: boolean;
}

/** Chosen option ids per group id. A group with no choice may be missing or empty. */
export type FilterValue = Readonly<Record<string, readonly string[]>>;

export interface FilterChipsProps {
  /** Panel id for `useTabPanel(id)`. Default `'filters'`. */
  id?: string;
  /** The filter groups, one chip each, in the order shown. */
  groups: readonly FilterGroup[];
  /** What is applied now. */
  value: FilterValue;
  /** Runs with the new value when Apply changes it, and with `{}` from the clear-all button. */
  onChange: (value: FilterValue) => void;
  /** State when first mounted. Default `'peek'`: the strip shows. */
  initialState?: PanelState;
  colors?: Partial<FilterChipsColors>;
  /** The sheet's words and screen-reader labels, merged over the English defaults. */
  labels?: Partial<FilterChipsLabels>;
  /** Selection haptic on every chip, option and button. Default true. */
  haptics?: boolean;
}

/** The strip's height. */
const STRIP_H = 44;
/** Between the strip and the bar. */
const GAP = 8;
/** Between the round buttons and the capsule. */
const STRIP_GAP = 6;
/** The sheet's corner radius; the corner circles are drawn this size and scaled. */
const RADIUS = 26;
/** Side of the unit square the bands are scaled from. */
const UNIT = 100;
/** The sheet's padding. */
const PAD = 18;
/** Height of the fade at the bottom of the all-filters list. */
const FADE = 28;
/** The chip label's and the card title's font sizes: the title grows from one to the other. */
const CHIP_FONT = 14;
const TITLE_FONT = 18;
/** The key of the all-filters sheet (group ids are app data, so it can't be a plain word). */
const ALL = '\u0000all';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZERO: Rect = { x: 0, y: 0, w: 0, h: 0 };

const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};

/** The chip's text: the group's label, its one choice, or the first choice and a count. */
function summaryOf(group: FilterGroup, value: FilterValue, labels: FilterChipsLabels) {
  const ids = value[group.id] ?? [];
  const chosen = group.options.filter((option) => ids.includes(option.id));
  const first = chosen[0];
  if (!first) return null;
  return chosen.length === 1 ? first.label : labels.more(first.label, chosen.length - 1);
}

/** Drops empty groups, so "nothing chosen" has one shape. */
function clean(value: FilterValue): FilterValue {
  return Object.fromEntries(Object.entries(value).filter(([, ids]) => ids.length > 0));
}

function sameValue(a: FilterValue, b: FilterValue) {
  const x = clean(a);
  const y = clean(b);
  const keys = Object.keys(x);
  if (keys.length !== Object.keys(y).length) return false;
  return keys.every((key) => {
    const left = x[key] ?? [];
    const right = y[key] ?? [];
    return left.length === right.length && left.every((id) => right.includes(id));
  });
}

export function FilterChips({ id = 'filters', initialState = 'peek', ...props }: FilterChipsProps) {
  // How much of the panel the bar hides: 16 pt under a floating bar, 0 under a docked one.
  const tuck = usePanelOverlap();
  return (
    <TabPanel id={id} peekHeight={STRIP_H + GAP + tuck} initialState={initialState}>
      <Filters id={id} tuck={tuck} {...props} />
    </TabPanel>
  );
}

type ViewRef = ComponentRef<typeof View>;

interface Point {
  x: number;
  y: number;
}

function Filters({
  id,
  tuck,
  groups,
  value,
  onChange,
  colors: custom,
  labels: customLabels,
  haptics = true,
}: Omit<FilterChipsProps, 'initialState'> & { id: string; tuck: number }) {
  const colors = { ...defaultColors, ...custom };
  const labels = { ...defaultLabels, ...customLabels };
  const panel = useTabPanel(id);
  const open = panel.state === 'open';
  const { height: windowHeight } = useWindowDimensions();

  // Which sheet shows (a group id or ALL), and the picks not applied yet.
  const [view, setView] = useState(ALL);
  const [draft, setDraft] = useState<FilterValue>(value);
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const chipRefs = useRef(new Map<string, ViewRef | null>());
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // Where things are, from their own layout events: each chip's x and width in the scrolling
  // row (the round button's in the strip), each chip label's frame in its chip, the capsule's
  // frame, and the row's size and scroll offset.
  const frames = useRef(new Map<string, { x: number; w: number }>());
  const labelFrames = useRef(new Map<string, Point>());
  const capsule = useRef({ x: 0, w: 0 });
  const viewport = useRef(0);
  const rowWidth = useRef(0);
  const scrollX = useRef(0);
  const userScrolled = useRef(false);
  const rtl = I18nManager.isRTL;
  // Set by a chip press, so the open effect knows the draft is already fresh.
  const pressed = useRef(false);

  // 0 at the strip, 1 open. `lift` is how far the panel rises; the card's frame is `card`.
  const progress = useSharedValue(0);
  const lift = useSharedValue(0);
  const strip = useSharedValue<Rect>(ZERO);
  const card = useSharedValue<Rect>(ZERO);
  // The title travels from the chip's label (in the strip, as it rests) to the card's title.
  const titleFrom = useSharedValue<Point>({ x: 0, y: 0 });
  // 1 while the chip's label reads the same as the title, so one text can travel between them.
  const shared = useSharedValue(0);
  const titleW = useSharedValue(0);

  const views = [ALL, ...groups.map((group) => group.id)];
  const peekBlock = STRIP_H + GAP + tuck;
  const below = GAP + tuck;
  const contentHeight = Math.max(peekBlock, ...views.map((key) => (heights[key] ?? 0) + below));
  const ready = width > 0 && views.every((key) => (heights[key] ?? 0) > 0);
  const appliedCount = groups.filter((group) => (value[group.id] ?? []).length > 0).length;
  const viewGroup = groups.find((group) => group.id === view);
  const title = viewGroup ? viewGroup.label : labels.allFilters;

  const haptic = () => {
    if (haptics) Haptics.selectionAsync();
  };

  /**
   * The chip's frame in the panel's content, kept inside the capsule when scrolled partly off.
   * Worked out from layout events rather than measured: a scroll view laid out right to left
   * reports its children's positions mirrored, and this is synchronous.
   */
  const chipRect = (key: string): Rect | null => {
    const frame = frames.current.get(key);
    if (!frame) return null;
    if (key === ALL) return { x: frame.x, y: 0, w: frame.w, h: STRIP_H };
    const left = capsule.current.x;
    const x = left + frame.x - scrollX.current;
    const max = left + Math.max(0, viewport.current - frame.w);
    return { x: Math.min(Math.max(left, x), max), y: 0, w: frame.w, h: STRIP_H };
  };

  /**
   * The card starts as the capsule and folds back into it, so the two match exactly at rest:
   * the round buttons beside it fade with the chips instead of being swallowed.
   */
  const capsuleRect = (): Rect => ({
    x: capsule.current.x,
    y: 0,
    w: capsule.current.w || width,
    h: STRIP_H,
  });

  /** Where the title starts (the chip's label), and whether the label and title are one text. */
  const placeTitle = (key: string, current: FilterValue) => {
    const group = groups.find((g) => g.id === key);
    const rect = chipRect(key);
    const label = labelFrames.current.get(key);
    const same = !!group && !!rect && !!label && summaryOf(group, current, labels) === null;
    shared.value = same ? 1 : 0;
    if (rect && label) titleFrom.value = { x: rect.x + label.x, y: label.y };
  };

  /**
   * While folding back, follows the chip if it moves (its label changed with the choice, or
   * the clear-all button appeared and narrowed the capsule), scrolling it fully into view
   * first. The strip is still faded out then, so the jump doesn't show.
   */
  const follow = () => {
    if (open || progress.value === 0) return;
    const frame = frames.current.get(view);
    if (frame && view !== ALL && viewport.current > 0) {
      const start = scrollX.current;
      let next = start;
      if (frame.x + frame.w > start + viewport.current) {
        next = frame.x + frame.w - viewport.current + 4;
      }
      if (frame.x < next) next = Math.max(0, frame.x - 4);
      if (next !== start) {
        scrollX.current = next;
        scrollRef.current?.scrollTo({ x: next, animated: false });
      }
    }
    strip.value = capsuleRect();
    placeTitle(view, value);
  };
  /** Right to left, the row is laid out from its right end: show that end until scrolled. */
  const toStart = () => {
    if (!rtl || userScrolled.current) return;
    scrollX.current = Math.max(0, rowWidth.current - viewport.current);
    scrollRef.current?.scrollToEnd({ animated: false });
    follow();
  };

  // Grow when the panel opens and fold back when it rests: after Apply, after back or Escape,
  // or when the app calls hide() or peek(). A passive effect, like the one that starts the
  // panel's own slide (this runs just before it, in the same commit), so the card and the
  // panel start in the same frame on the same spring and move as one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on open changes only.
  useEffect(() => {
    if (open) {
      // Opened from elsewhere (the app calling open()): start from what is applied.
      if (!pressed.current) setDraft(value);
      pressed.current = false;
      const h = heights[view] ?? 0;
      lift.value = contentHeight - peekBlock;
      strip.value = capsuleRect();
      card.value = { x: 0, y: contentHeight - below - h, w: width, h };
      placeTitle(view, value);
      progress.value = withSpring(1, tabcnSpring);
      return;
    }
    if (progress.value === 0) return;
    strip.value = capsuleRect();
    placeTitle(view, value);
    progress.value = withSpring(0, tabcnSpring);
    // Back to the chip that opened the sheet, for screen-reader users.
    const timer = setTimeout(() => {
      const node = chipRefs.current.get(view);
      if (node) AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
    }, 400);
    return () => clearTimeout(timer);
  }, [open]);

  const openView = (key: string) => {
    haptic();
    pressed.current = true;
    setView(key);
    setDraft(value);
    panel.open();
  };

  const toggle = (group: FilterGroup, option: string) => {
    haptic();
    setDraft((current) => {
      const ids = current[group.id] ?? [];
      const has = ids.includes(option);
      const next = group.multiple
        ? has
          ? ids.filter((x) => x !== option)
          : [...ids, option]
        : has
          ? []
          : [option];
      return { ...current, [group.id]: next };
    });
  };

  const keysInView = view === ALL ? groups.map((group) => group.id) : [view];
  const canClear = keysInView.some((key) => (draft[key] ?? []).length > 0);
  const changed = !sameValue(draft, value);
  const clear = () => {
    haptic();
    setDraft((current) => ({
      ...current,
      ...Object.fromEntries(keysInView.map((key) => [key, []])),
    }));
  };
  const apply = () => {
    haptic();
    if (changed) onChange(clean(draft));
    if (panel.state === 'open') panel.toggle();
  };
  const clearAll = () => {
    haptic();
    onChange({});
  };

  // The strip stays where it rests on screen while the panel rises (it moves down the panel
  // as far as the panel moves up), and fades as the card grows out of it.
  const stripStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.07], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: progress.value * lift.value }],
  }));

  const chipRef = (key: string) => (node: ViewRef | null) => {
    chipRefs.current.set(key, node);
  };
  const chipLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width: w } = event.nativeEvent.layout;
    frames.current.set(key, { x, w });
    if (key === view) follow();
  };
  const labelLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { x, y } = event.nativeEvent.layout;
    labelFrames.current.set(key, { x, y });
    if (key === view) follow();
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = event.nativeEvent.contentOffset.x;
  };

  return (
    <View
      pointerEvents="box-none"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: contentHeight }}
    >
      {/* The card that grows out of the strip, under everything else. */}
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, styles.ltr]}
      >
        {ready ? <Morph progress={progress} from={strip} to={card} color={colors.surface} /> : null}
      </View>

      <Animated.View
        pointerEvents={open ? 'none' : 'box-none'}
        importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={open}
        style={[styles.strip, stripStyle]}
      >
        <PressableScale
          ref={chipRef(ALL)}
          onLayout={chipLayout(ALL)}
          accessibilityRole="button"
          accessibilityLabel={
            appliedCount > 0
              ? `${labels.allFilters}, ${labels.applied(appliedCount)}`
              : labels.allFilters
          }
          accessibilityState={{ expanded: open && view === ALL }}
          onPress={() => openView(ALL)}
          style={[styles.round, { backgroundColor: colors.surface }]}
        >
          <SlidersIcon color={colors.foreground} size={20} />
          {appliedCount > 0 ? (
            <Animated.View
              entering={ZoomIn.duration(220).reduceMotion(ReduceMotion.System)}
              exiting={ZoomOut.duration(160).reduceMotion(ReduceMotion.System)}
              style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.surface }]}
            />
          ) : null}
        </PressableScale>

        <Animated.View
          layout={LinearTransition.duration(220).reduceMotion(ReduceMotion.System)}
          onLayout={(event) => {
            const { x, width: w } = event.nativeEvent.layout;
            capsule.current = { x, w };
            follow();
          }}
          style={[styles.capsule, { backgroundColor: colors.surface }]}
        >
          {/* Laid out left to right (from the right end when the app is right to left), so
              scroll offsets and chip positions are physical on every platform. */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
            onScrollBeginDrag={() => {
              userScrolled.current = true;
            }}
            onLayout={(event) => {
              viewport.current = event.nativeEvent.layout.width;
              toStart();
              follow();
            }}
            onContentSizeChange={(w) => {
              rowWidth.current = w;
              toStart();
              follow();
            }}
            style={styles.ltr}
            contentContainerStyle={[styles.chips, rtl ? styles.reverse : null]}
          >
            {groups.map((group, index) => {
              const summary = summaryOf(group, value, labels);
              const tint = summary ? colors.accent : colors.foreground;
              const Icon = group.icon;
              return (
                <Fragment key={group.id}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                  ) : null}
                  <Pressable
                    ref={chipRef(group.id)}
                    onLayout={chipLayout(group.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.label}, ${summary ?? labels.any}`}
                    accessibilityState={{ expanded: open && view === group.id }}
                    onPress={() => openView(group.id)}
                    style={({ pressed: down }) => [
                      styles.chip,
                      rtl ? styles.rtl : null,
                      { opacity: down ? 0.6 : 1 },
                    ]}
                  >
                    {Icon ? <Icon color={tint} size={16} /> : null}
                    <ChipLabel
                      travelling={view === group.id}
                      progress={progress}
                      shared={shared}
                      onLayout={labelLayout(group.id)}
                      color={tint}
                    >
                      {summary ?? group.label}
                    </ChipLabel>
                  </Pressable>
                </Fragment>
              );
            })}
          </ScrollView>
        </Animated.View>

        {appliedCount > 0 ? (
          <Animated.View
            entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(140).reduceMotion(ReduceMotion.System)}
          >
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={labels.clearAll}
              onPress={clearAll}
              style={[styles.round, { backgroundColor: colors.surface }]}
            >
              <CrossIcon color={colors.foreground} size={20} />
            </PressableScale>
          </Animated.View>
        ) : null}
      </Animated.View>

      {views.map((key) => {
        const group = groups.find((g) => g.id === key);
        return (
          <SheetBody
            key={key}
            shown={view === key}
            open={open}
            progress={progress}
            lift={lift}
            height={heights[key] ?? 0}
            bottom={below}
            onHeight={(h) =>
              setHeights((current) => (current[key] === h ? current : { ...current, [key]: h }))
            }
            title={group ? group.label : labels.allFilters}
            colors={colors}
            labels={labels}
            canClear={canClear}
            changed={changed}
            onClear={clear}
            onApply={apply}
          >
            {group ? (
              <Options group={group} draft={draft} onToggle={toggle} colors={colors} />
            ) : (
              <View>
                <ScrollView style={{ maxHeight: windowHeight * 0.5 }} bounces={false}>
                  {groups.map((g) => (
                    <View key={g.id} style={styles.section}>
                      <Text
                        maxFontSizeMultiplier={1.6}
                        style={[styles.sectionTitle, { color: colors.muted }]}
                      >
                        {g.label}
                      </Text>
                      <Options group={g} draft={draft} onToggle={toggle} colors={colors} />
                    </View>
                  ))}
                </ScrollView>
                <EdgeFade color={colors.surface} />
              </View>
            )}
          </SheetBody>
        );
      })}

      {/* The card's title, drawn once over everything: it travels from the chip's label. */}
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, styles.ltr]}
      >
        <TravellingTitle
          progress={progress}
          strip={strip}
          card={card}
          from={titleFrom}
          shared={shared}
          color={colors.foreground}
          rtl={rtl}
          titleW={titleW}
          onWidth={(w) => {
            titleW.value = w;
          }}
        >
          {title}
        </TravellingTitle>
      </View>
    </View>
  );
}

/** A chip's label: hidden while its text is the one travelling to the card's title. */
function ChipLabel({
  travelling,
  progress,
  shared,
  onLayout,
  color,
  children,
}: {
  travelling: boolean;
  progress: SharedValue<number>;
  shared: SharedValue<number>;
  onLayout: (event: LayoutChangeEvent) => void;
  color: string;
  children: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: travelling && shared.value === 1 && progress.value > 0.001 ? 0 : 1,
  }));
  return (
    <Animated.Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.3}
      onLayout={onLayout}
      style={[styles.chipText, { color }, style]}
    >
      {children}
    </Animated.Text>
  );
}

/**
 * The card's title. Where the chip's label reads the same, it is that label: it rises and
 * grows from the chip into the header. Otherwise it fades in where the header is.
 */
function TravellingTitle({
  progress,
  strip,
  card,
  rtl,
  titleW,
  from,
  shared,
  color,
  onWidth,
  children,
}: {
  progress: SharedValue<number>;
  strip: SharedValue<Rect>;
  card: SharedValue<Rect>;
  rtl: boolean;
  titleW: SharedValue<number>;
  from: SharedValue<Point>;
  shared: SharedValue<number>;
  color: string;
  onWidth: (width: number) => void;
  children: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const travel = shared.value === 1;
    // Eased out, so the title reaches the header before the options fade in under its path.
    const t = travel ? 1 - (1 - p) ** 3 : 1;
    // Rides the growing card's top edge, easing from the label's inset in the chip to the
    // header's padding, so it is always the card's header and never crosses its content.
    const y = lerp(strip.value.y, card.value.y, p) + lerp(from.value.y, PAD, t);
    // The header's x on the growing card: its leading edge plus the padding.
    const left = lerp(strip.value.x, card.value.x, p);
    const right = left + lerp(strip.value.w, card.value.w, p);
    const scale = lerp(CHIP_FONT / TITLE_FONT, 1, t);
    const header = rtl ? right - PAD - titleW.value * scale : left + PAD;
    return {
      opacity: travel
        ? p > 0.001
          ? 1
          : 0
        : interpolate(p, [0.35, 0.8], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: travel ? lerp(from.value.x, header, t) : header },
        { translateY: y },
        { scale },
      ],
    };
  });
  return (
    <Animated.Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.6}
      onLayout={(event) => onWidth(event.nativeEvent.layout.width)}
      style={[styles.travellingTitle, { color }, style]}
    >
      {children}
    </Animated.Text>
  );
}

/**
 * One card's content: laid out at all times (its height sets the panel's), shown while it is
 * in view. It rides the growing card's top edge, and is clipped at the card's bottom edge (the
 * strip's line, which holds still on screen): a clip moved up, its content moved back down.
 */
function SheetBody({
  shown,
  open,
  progress,
  lift,
  height,
  bottom,
  onHeight,
  title,
  colors,
  labels,
  canClear,
  changed,
  onClear,
  onApply,
  children,
}: {
  shown: boolean;
  open: boolean;
  progress: SharedValue<number>;
  lift: SharedValue<number>;
  height: number;
  bottom: number;
  onHeight: (height: number) => void;
  title: string;
  colors: FilterChipsColors;
  labels: FilterChipsLabels;
  canClear: boolean;
  changed: boolean;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
}) {
  const live = shown && open;
  // The card is (1 - p) * (height - STRIP_H) short of full height; that much of the content
  // is still below the strip's line, cut off.
  const clipStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: shown ? interpolate(p, [0.25, 0.75], [0, 1], Extrapolation.CLAMP) : 0,
      transform: [{ translateY: -(1 - p) * lift.value }],
    };
  });
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * Math.max(0, height - STRIP_H) }],
  }));
  return (
    <Animated.View
      pointerEvents={live ? 'box-none' : 'none'}
      importantForAccessibility={live ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!live}
      onLayout={(event) => onHeight(Math.round(event.nativeEvent.layout.height))}
      style={[styles.body, { bottom }, clipStyle]}
    >
      <Animated.View style={[styles.bodyContent, contentStyle]}>
        {/* Read by screen readers; drawn by the travelling title above. */}
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.6}
          style={[styles.title, styles.hiddenText]}
        >
          {title}
        </Text>
        {children}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canClear }}
            disabled={!canClear}
            onPress={onClear}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.control, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.6}
              style={[styles.buttonText, { color: canClear ? colors.foreground : colors.muted }]}
            >
              {labels.clear}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onApply}
            style={({ pressed }) => [
              styles.button,
              styles.apply,
              {
                backgroundColor: changed ? colors.accent : colors.control,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.6}
              style={[styles.buttonText, { color: changed ? colors.onAccent : colors.foreground }]}
            >
              {labels.apply}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Fades a scrolling list into the card at its bottom edge, so a cut-off row reads as more. */
function EdgeFade({ color }: { color: string }) {
  return (
    <Svg pointerEvents="none" style={styles.edgeFade} width="100%" height={FADE}>
      <Defs>
        <LinearGradient id="filter-chips-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <SvgRect width="100%" height={FADE} fill="url(#filter-chips-fade)" />
    </Svg>
  );
}

/** A group's options as pills: radio buttons, or checkboxes for a `multiple` group. */
function Options({
  group,
  draft,
  onToggle,
  colors,
}: {
  group: FilterGroup;
  draft: FilterValue;
  onToggle: (group: FilterGroup, option: string) => void;
  colors: FilterChipsColors;
}) {
  const ids = draft[group.id] ?? [];
  return (
    <View
      accessibilityRole={group.multiple ? undefined : 'radiogroup'}
      accessibilityLabel={group.label}
      style={styles.options}
    >
      {group.options.map((option) => {
        const chosen = ids.includes(option.id);
        return (
          <Pressable
            key={option.id}
            accessibilityRole={group.multiple ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: chosen }}
            onPress={() => onToggle(group, option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: chosen ? colors.chosen : 'transparent',
                borderColor: chosen ? colors.accent : colors.divider,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.6}
              style={[styles.optionText, { color: chosen ? colors.accent : colors.foreground }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The growing shape: a rounded rectangle from the chip's frame to the sheet's, drawn as a
 * horizontal band, a vertical band and four corner circles. The bands are unit squares
 * stretched with scaleX and scaleY; the circles only move and scale. All in physical
 * coordinates (the layer is left to right).
 */
function Morph({
  progress,
  from,
  to,
  color,
}: {
  progress: SharedValue<number>;
  from: SharedValue<Rect>;
  to: SharedValue<Rect>;
  color: string;
}) {
  const shape = useDerivedValue(() => {
    const p = progress.value;
    const a = from.value;
    const b = to.value;
    const w = lerp(a.w, b.w, p);
    const h = lerp(a.h, b.h, p);
    const r = Math.max(0, Math.min(lerp(a.h / 2, RADIUS, p), w / 2, h / 2));
    return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w, h, r };
  });
  // Solid until the strip is fully back over it (the strip fades in over p 0.07 to 0), then
  // gone: half-faded, the two would mix into a grey band.
  const layer = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.002, 0.025], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, layer]}>
      <Band shape={shape} across color={color} />
      <Band shape={shape} across={false} color={color} />
      <Corner shape={shape} right={false} bottom={false} color={color} />
      <Corner shape={shape} right bottom={false} color={color} />
      <Corner shape={shape} right={false} bottom color={color} />
      <Corner shape={shape} right bottom color={color} />
    </Animated.View>
  );
}

type Shape = SharedValue<Rect & { r: number }>;

function Band({ shape, across, color }: { shape: Shape; across: boolean; color: string }) {
  const style = useAnimatedStyle(() => {
    const { x, y, w, h, r } = shape.value;
    // Across: full width between the corners' rows. Down: full height between their columns.
    const bx = across ? x : x + r;
    const by = across ? y + r : y;
    const bw = Math.max(0.01, across ? w : w - 2 * r);
    const bh = Math.max(0.01, across ? h - 2 * r : h);
    return {
      transform: [
        { translateX: bx + bw / 2 - UNIT / 2 },
        { translateY: by + bh / 2 - UNIT / 2 },
        { scaleX: bw / UNIT },
        { scaleY: bh / UNIT },
      ],
    };
  });
  return <Animated.View style={[styles.unit, { backgroundColor: color }, style]} />;
}

function Corner({
  shape,
  right,
  bottom,
  color,
}: {
  shape: Shape;
  right: boolean;
  bottom: boolean;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const { x, y, w, h, r } = shape.value;
    const cx = right ? x + w - r : x + r;
    const cy = bottom ? y + h - r : y + r;
    return {
      transform: [
        { translateX: cx - RADIUS },
        { translateY: cy - RADIUS },
        { scale: Math.max(0.001, r / RADIUS) },
      ],
    };
  });
  return <Animated.View style={[styles.corner, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  ltr: { direction: 'ltr' },
  rtl: { direction: 'rtl' },
  reverse: { flexDirection: 'row-reverse' },
  unit: { position: 'absolute', left: 0, top: 0, width: UNIT, height: UNIT },
  corner: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RADIUS * 2,
    height: RADIUS * 2,
    borderRadius: RADIUS,
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STRIP_H,
    flexDirection: 'row',
    gap: STRIP_GAP,
  },
  round: {
    width: STRIP_H,
    height: STRIP_H,
    borderRadius: STRIP_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    end: 9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  capsule: {
    flex: 1,
    height: STRIP_H,
    borderRadius: STRIP_H / 2,
    overflow: 'hidden',
  },
  chips: { alignItems: 'center', paddingHorizontal: 4 },
  chip: {
    height: STRIP_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  chipText: { fontSize: CHIP_FONT, fontWeight: '500', letterSpacing: -0.1 },
  divider: { width: StyleSheet.hairlineWidth * 2, height: 16, borderRadius: 1 },
  body: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  bodyContent: { padding: PAD },
  title: { fontSize: TITLE_FONT, fontWeight: '600', marginBottom: 14 },
  hiddenText: { color: 'transparent' },
  travellingTitle: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: TITLE_FONT,
    fontWeight: '600',
    transformOrigin: 'left top',
  },
  section: { marginBottom: 16 },
  edgeFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sectionTitle: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  optionText: { fontSize: 14, fontWeight: '500' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 22 },
  button: {
    minHeight: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  apply: { flex: 1 },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
