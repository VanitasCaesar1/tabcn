/**
 * Bar Sheet: a sheet that grows out of the tab bar, for a profile, a comments thread or a
 * filters list. It rises from the bottom edge, passing behind the bar, to its lowest snap
 * point; dragging the header moves it between snap points, and dragging below the lowest
 * one slides it away. At its highest snap point the body scrolls; at the body's top a
 * downward drag moves the sheet again. The bar stays visible over the sheet's lower edge.
 *
 * It is a `TabPanel` with snap points, so it needs a `TabBarProvider` around the tabs
 * navigator and a `GestureHandlerRootView` around the app:
 *
 * ```tsx
 * // Beside <Tabs>, under the provider, so it stays across tabs:
 * <BarSheet title="Comments" subtitle="128 replies">
 *   {comments.map((c) => <Comment key={c.id} {...c} />)}
 * </BarSheet>
 *
 * // Anywhere under the provider:
 * const sheet = useBarSheet();
 * <Pressable onPress={sheet.open} />
 * ```
 *
 * Switching tabs slides the sheet away: it belongs to the screen it was opened from.
 * The sheet is modal only at its highest snap point; lower down the screen behind stays
 * usable and readable by screen readers. While a screen reader is on, it opens straight to
 * its highest snap point, so nothing a screen reader reaches is off-screen. Screen-reader
 * users raise and lower it with the grabber, an adjustable control (swipe up or down on it):
 * swiping down from the highest snap point slides it away. Android back and the escape
 * gesture return it to rest. Content is laid out once at the highest snap point, so the body
 * has no controls pinned to its bottom edge, and no text input (the bar hides with the
 * keyboard). Not drawn while the bar is a rail.
 *
 * Every move glides on tabcnSpring (critically damped, no overshoot); nothing scales,
 * bounces or turns. With "reduce motion" on, every change is instant.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ReactNode, useEffect, useRef, useState } from 'react';
// 'react-native-tabcn/gestures' needs react-native-gesture-handler (an optional peer of tabcn). Importing it
// here names it as this design's own dependency, so `shadcn add` installs it.
import 'react-native-gesture-handler';
import {
  type AccessibilityActionEvent,
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  type SnapPoint,
  TabPanel,
  type TabPanelControls,
  useTabBar,
  useTabPanel,
} from 'react-native-tabcn';
import { PanelDragArea, PanelScrollView } from 'react-native-tabcn/gestures';

const defaultColors = {
  /** The sheet's fill. */
  surface: '#ffffff',
  /** Hairline along the sheet's top edge. */
  border: 'rgba(0, 0, 0, 0.08)',
  /** The grabber at the top. */
  grabber: 'rgba(0, 0, 0, 0.18)',
  /** The title. */
  foreground: '#141416',
  /** The subtitle. */
  muted: 'rgba(20, 20, 22, 0.62)',
  /** The soft shadow the sheet casts upward. */
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export type BarSheetColors = typeof defaultColors;

export interface BarSheetProps {
  /** Panel id, for `useBarSheet(id)` and `useTabPanel(id)`. Default `'sheet'`. */
  id?: string;
  /** Shown in the header and read as the grabber's name. */
  title: string;
  /** One muted line under the title. */
  subtitle?: string;
  /** Drawn at the header's trailing edge: a close or share button. */
  accessory?: ReactNode;
  /** Heights it rests at while open, lowest first. Default `['60%', '100%']`. */
  snapPoints?: readonly SnapPoint[];
  /** Radius of the sheet's top corners. Default 28. */
  radius?: number;
  colors?: Partial<BarSheetColors>;
  /** A selection haptic each time the sheet settles at another height. Default true. */
  haptics?: boolean;
  /** The body. It scrolls at the highest snap point. */
  children?: ReactNode;
}

const DEFAULT_SNAP_POINTS: readonly SnapPoint[] = ['60%', '100%'];

/** Declares the sheet. Renders nothing here: the sheet is drawn behind the tab bar. */
export function BarSheet({
  id = 'sheet',
  title,
  subtitle,
  accessory,
  snapPoints = DEFAULT_SNAP_POINTS,
  radius = 28,
  colors: custom,
  haptics = true,
  children,
}: BarSheetProps) {
  const colors = { ...defaultColors, ...custom };
  return (
    <TabPanel id={id} snapPoints={snapPoints}>
      <SheetBody
        id={id}
        title={title}
        subtitle={subtitle}
        accessory={accessory}
        snapPoints={snapPoints}
        radius={radius}
        colors={colors}
        haptics={haptics}
      >
        {children}
      </SheetBody>
    </TabPanel>
  );
}

/**
 * Opens and closes the sheet from anywhere under the `TabBarProvider`: `open()` goes to the
 * lowest snap point, `snapTo(i)` to another, `hide()` slides it away.
 */
export function useBarSheet(id = 'sheet'): TabPanelControls {
  return useTabPanel(id);
}

/**
 * Whether a screen reader is on. While one is, the sheet opens only to its highest snap
 * point, so one step down from there is rest.
 */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (live) setOn(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return on;
}

/** How a snap point is read to screen readers. */
function heightName(point: SnapPoint | undefined, last: boolean): string {
  if (point === undefined) return 'Closed';
  if (last && point === '100%') return 'Full height';
  return typeof point === 'number'
    ? `${Math.round(point)} points tall`
    : `${Math.round(Number.parseFloat(point))} percent of the screen`;
}

function SheetBody({
  id,
  title,
  subtitle,
  accessory,
  snapPoints,
  radius,
  colors,
  haptics,
  children,
}: Omit<BarSheetProps, 'colors' | 'id'> & {
  id: string;
  snapPoints: readonly SnapPoint[];
  radius: number;
  colors: BarSheetColors;
  haptics: boolean;
}) {
  const { snap, snapTo, hide } = useTabPanel(id);
  const last = snapPoints.length - 1;
  const screenReader = useScreenReader();

  // The sheet belongs to what's on screen, so switching tabs slides it away. (The content
  // renders inside the tab bar, so it can read the bar's state.) Tabs are told apart by route
  // key, not position, so tabs added or removed around the focused one don't close it. The
  // sheet belongs to the tab focused when it opened: to open it on another tab, open it from
  // that tab's screen once it's showing, not in the same handler that navigates there.
  const { tabs, activeIndex } = useTabBar();
  const focusedKey = tabs[activeIndex]?.key ?? null;
  const open = snap >= 0;
  const openedOn = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!open) {
      openedOn.current = undefined;
      return;
    }
    if (openedOn.current === undefined) {
      openedOn.current = focusedKey;
      return;
    }
    if (openedOn.current !== focusedKey) hide();
  }, [open, focusedKey, hide]);

  // One selection haptic each time the sheet settles at another height.
  const previous = useRef(snap);
  useEffect(() => {
    if (previous.current === snap) return;
    previous.current = snap;
    if (haptics && snap >= 0) Haptics.selectionAsync();
  }, [snap, haptics]);

  const onAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') snapTo(Math.min(last, snap + 1));
    if (event.nativeEvent.actionName === 'decrement') {
      if (snap <= 0 || screenReader) hide();
      else snapTo(snap - 1);
    }
  };

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          boxShadow: `0 -6px 24px ${colors.shadow}`,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
        },
      ]}
    >
      <PanelDragArea>
        <View style={styles.header}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={`${title} sheet`}
            accessibilityValue={{ text: heightName(snapPoints[snap], snap === last) }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAction}
            style={styles.grabberArea}
          >
            <View style={[styles.grabber, { backgroundColor: colors.grabber }]} />
          </View>
          <View style={styles.titleRow}>
            <View style={styles.titles}>
              <Text
                role="heading"
                numberOfLines={1}
                style={[styles.title, { color: colors.foreground }]}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {accessory}
          </View>
        </View>
      </PanelDragArea>
      <PanelScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {children}
      </PanelScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  grabberArea: {
    alignSelf: 'center',
    // A comfortable touch target around a small grabber.
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
