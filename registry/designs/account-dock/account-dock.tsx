/**
 * Account Dock: a floating pill of tabs with an account chip beside it (the workspace's mark
 * and the person's avatar, with a status dot). Tapping the chip folds the tabs away: the pill
 * shrinks to a round button holding the current tab's icon, the chip stretches into a
 * workspace pill, and the avatar moves to the end. A sheet rises from behind the bar to switch
 * workspace or account; tapping the avatar shows the accounts and a status menu (online, idle,
 * do not disturb, invisible). The round button, Android back or the screen-reader escape
 * gesture folds it back, and so does a tab change.
 *
 * The sheet is a `TabPanel` anchored to the bar, and its state is the dock's open state, so it
 * needs a `TabBarProvider` around the tabs navigator:
 *
 * ```tsx
 * <TabBarProvider>
 *   <Tabs
 *     tabBar={tabBar(
 *       <AccountDock
 *         workspaces={workspaces}
 *         workspaceId={workspaceId}
 *         onWorkspaceChange={setWorkspaceId}
 *         accounts={accounts}
 *         accountId={accountId}
 *         onAccountChange={setAccountId}
 *         status={status}
 *         onStatusChange={setStatus}
 *       />,
 *     )}
 *   />
 * </TabBarProvider>
 * ```
 *
 * The fold never resizes the bar: the tabs and chip set its size at rest, and every shape that
 * changes is drawn over that box and animated on the UI thread on `tabcnSpring` (critically
 * damped, no overshoot), so nothing the foundation measures moves and no JavaScript runs per
 * frame. Only transforms and opacity animate, so nothing is laid out per frame either: a pill
 * that changes width is two round caps and a stretched middle strip, shadows cross-fade between
 * where the pills rest, and the active tab's icon travels into the round button. Apps that turn
 * on Reanimated's `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS` and `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`
 * static flags let these updates skip React Native's commit as well. The sheet's lists and the
 * status menu fade on `tabcnTiming`, and a change of status cross-fades the avatar's dot. Pills
 * shrink a little while pressed. With "reduce motion" on, all of it is instant. While the sheet is open, the
 * foundation hides the bar from screen readers, so the sheet carries every control: a header
 * that switches between the lists and a Status row; the pills in the bar are shortcuts.
 * Not drawn as a rail: on a tablet rail, panels aren't drawn, so the chip does nothing there.
 * Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import * as Haptics from 'expo-haptics';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  I18nManager,
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type WithTimingConfig,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BadgeCount,
  TabBarRoot,
  TabButton,
  TabIndicator,
  type TabItem,
  TabList,
  TabPanel,
  tabcnSpring,
  tabcnTiming,
  usePanelOverlap,
  useTabBar,
  useTabPanel,
} from 'react-native-tabcn';

import {
  CheckIcon,
  ChevronIcon,
  DndGlyph,
  IdleGlyph,
  InvisibleGlyph,
  OnlineGlyph,
  PlusIcon,
} from './account-dock-icons';

const defaultColors = {
  /** The pills' fill (tabs, chip, round button, workspace and account pills). */
  surface: '#fafafa',
  /** The sheet and the status menu. */
  sheet: '#ffffff',
  /** Hairline edges of the sheet, the menu and the rows' dividers. */
  border: 'rgba(0, 0, 0, 0.07)',
  /** The capsule behind the active tab, and a row while it is pressed. */
  capsule: '#ececee',
  /** Names, labels and inactive tabs. */
  foreground: '#151517',
  /** Second lines: member counts, the current status under the name. */
  muted: '#7a7a80',
  /** The active tab, the current row's tick, "Add workspace". */
  accent: '#0a7cff',
  /** Badge fill, drawn only when a tab sets `tabBarBadge`. */
  badge: '#ff3b30',
  /** Badge count text, and the glyphs inside the status circles. */
  badgeText: '#ffffff',
  /** Status colours: they carry meaning, so keep them recognisable. */
  online: '#34c759',
  idle: '#ffb800',
  dnd: '#ff3b30',
  invisible: '#8e8e93',
};

export type AccountDockColors = typeof defaultColors;

const defaultLabels = {
  /** Start of the chip's spoken label: "Account and workspace, Studio, Sam, Online". */
  chip: 'Account and workspace',
  /** The round button's spoken label, followed by the current tab's name. */
  backToTabs: 'Back to tabs',
  workspaces: 'Workspaces',
  accounts: 'Accounts',
  status: 'Status',
  addWorkspace: 'Add workspace',
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do not disturb',
  invisible: 'Invisible',
};

export type AccountDockLabels = typeof defaultLabels;

export type AccountStatus = 'online' | 'idle' | 'dnd' | 'invisible';

const STATUSES: readonly AccountStatus[] = ['online', 'idle', 'dnd', 'invisible'];

/** A workspace, team or server. Without a `logo`, its initials on `color` stand in. */
export interface AccountDockWorkspace {
  id: string;
  name: string;
  /** One short line under the name, such as a member count. */
  detail?: string;
  logo?: ImageSourcePropType;
  /** Default: the first letters of the first two words of `name`. */
  initials?: string;
  /** Behind the initials. Default: picked from the name. */
  color?: string;
}

/** An account the person is signed in to. Without an `avatar`, initials stand in. */
export interface AccountDockAccount {
  id: string;
  name: string;
  avatar?: ImageSourcePropType;
  initials?: string;
  color?: string;
}

export interface AccountDockProps {
  /** Every workspace the person belongs to, in the sheet's order. */
  workspaces: readonly AccountDockWorkspace[];
  /** The current workspace's `id`: shown in the chip and the workspace pill, ticked in the sheet. */
  workspaceId: string;
  /** Called when a workspace is chosen in the sheet. The dock stays open. */
  onWorkspaceChange: (id: string) => void;
  /** Every account the person is signed in to, in the sheet's order. */
  accounts: readonly AccountDockAccount[];
  /** The current account's `id`: its avatar is in the chip and the account pill. */
  accountId: string;
  /** Called when an account is chosen in the sheet. The dock stays open. */
  onAccountChange: (id: string) => void;
  /** The person's status, drawn as the dot on their avatar: online, idle, dnd or invisible. */
  status: AccountStatus;
  /** Called when a status is chosen; the menu closes. */
  onStatusChange: (status: AccountStatus) => void;
  /** Shows an "Add workspace" row at the end of the workspace list when passed. */
  onAddWorkspace?: () => void;
  /** Panel id, for `useTabPanel(id)` (to open the dock from a screen). Default 'account-dock'. */
  id?: string;
  colors?: Partial<AccountDockColors>;
  /** Every visible and spoken string, for translation. */
  labels?: Partial<AccountDockLabels>;
  /** Selection haptic on presses. Default true. */
  haptics?: boolean;
}

type List = 'workspaces' | 'accounts';

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Frames, relative to the dock's row, measured once at rest (and again on a resize). */
interface Frames {
  /** Layout A, the bar at rest: the tab pill and the chip. */
  pill: Frame;
  chip: Frame;
  /** Layout B, open with the workspaces showing: the account pill is just the avatar. */
  round: Frame;
  ws: Frame;
  acct: Frame;
  /**
   * Layout B with the accounts showing: the workspace pill shrinks to its mark and the account
   * pill takes the room, for the name and status.
   */
  ws2: Frame;
  acct2: Frame;
}

const FRAME_KEYS: readonly (keyof Frames)[] = [
  'pill',
  'chip',
  'round',
  'ws',
  'acct',
  'ws2',
  'acct2',
];

/** Bar height: Soft Pill's 50 pt tabs inside 4 pt of padding. Every pill is this tall. */
const H = 58;
const PAD_Y = 4;
const PAD_X = 8;
/** Workspace marks and avatars. */
const MARK = 38;
/** Space round a mark inside its pill: concentric with the pill's round end. */
const INSET = (H - MARK) / 2;
/** In the chip, the avatar overlaps the workspace mark by this much. */
const OVERLAP = 10;
const CHIP_WIDTH = INSET + MARK - OVERLAP + MARK + INSET;
/** Between the pills, at rest and open. */
const GAP = 8;
/** Text starts this far into a workspace or account pill. */
const TEXT_START = INSET + MARK + 9;
const ICON = 19;
/** The icon in the round button: the active tab's, a little larger. */
const ROUND_ICON = 22;
/** A capsule's middle strip is drawn this wide and stretched with `scaleX`. */
const STRIP = 100;
/** A press shrinks a pill quickly, and it comes back on tabcnTiming. */
const PRESS_IN: WithTimingConfig = { duration: 90, reduceMotion: ReduceMotion.System };
const MIN_TAB_WIDTH = 50;
/** Below this row width, the workspace pill drops its second line. */
const NARROW = 340;
/** The bar spans the screen less this margin on each side, up to `MAX_WIDTH`. */
const MARGIN = 16;
const MAX_WIDTH = 440;
/** Rows in the sheet. */
const ROW_MARK = 40;

const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};

export function AccountDock({
  workspaces,
  workspaceId,
  onWorkspaceChange,
  accounts,
  accountId,
  onAccountChange,
  status,
  onStatusChange,
  onAddWorkspace,
  id = 'account-dock',
  colors: customColors,
  labels: customLabels,
  haptics = true,
}: AccountDockProps) {
  const colors = { ...defaultColors, ...customColors };
  const labels = { ...defaultLabels, ...customLabels };
  const { tabs, activeIndex } = useTabBar();
  const panel = useTabPanel(id);
  const open = panel.state === 'open';
  const [list, setList] = useState<List>('workspaces');
  const [menu, setMenu] = useState(false);
  const [frames, setFrames] = useState<Partial<Frames>>({});
  const [rowWidth, setRowWidth] = useState(0);
  const chipRef = useRef<ComponentRef<typeof Pressable>>(null);

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const activeTab = tabs[activeIndex];
  const tick = () => {
    if (haptics) Haptics.selectionAsync();
  };

  // 0 = tabs, 1 = account bar; `grow` widens the account pill while the accounts show.
  const progress = useSharedValue(0);
  const grow = useSharedValue(0);
  const press = {
    chip: useSharedValue(0),
    round: useSharedValue(0),
    ws: useSharedValue(0),
    acct: useSharedValue(0),
  };
  useEffect(() => {
    progress.value = withSpring(open ? 1 : 0, tabcnSpring);
  }, [open, progress]);
  useEffect(() => {
    grow.value = withSpring(open && list === 'accounts' ? 1 : 0, tabcnSpring);
  }, [open, list, grow]);

  // A tab change from anywhere (a deep link, a notification) folds the dock back, so the round
  // button never shows a tab that is no longer current.
  const shownIndex = useRef(activeIndex);
  useEffect(() => {
    if (shownIndex.current === activeIndex) return;
    shownIndex.current = activeIndex;
    if (open) panel.hide();
  }, [activeIndex, open, panel]);

  // However it closed (round button, back, escape, tab change): start from the workspaces next
  // time, and give screen-reader focus back to the chip once the fold has settled.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    setList('workspaces');
    setMenu(false);
    const timer = setTimeout(() => {
      if (chipRef.current) AccessibilityInfo.sendAccessibilityEvent(chipRef.current, 'focus');
    }, 400);
    return () => clearTimeout(timer);
  }, [open]);

  const measure = (key: keyof Frames) => (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setFrames((prev) => {
      const old = prev[key];
      if (old && old.x === x && old.y === y && old.width === width && old.height === height) {
        return prev;
      }
      return { ...prev, [key]: { x, y, width, height } };
    });
  };
  const ready = FRAME_KEYS.every((key) => frames[key]);

  const openDock = () => {
    tick();
    setList('workspaces');
    setMenu(false);
    // Start the fold on this frame; the effect on `open` only confirms it.
    progress.value = withSpring(1, tabcnSpring);
    panel.open();
  };
  const showWorkspaces = () => {
    tick();
    setList('workspaces');
    setMenu(false);
  };
  const showAccounts = () => {
    tick();
    if (list === 'accounts' && menu) {
      setMenu(false);
      return;
    }
    setList('accounts');
    setMenu(true);
  };

  const statusLabel = labels[status];
  const chipLabel = [labels.chip, workspace?.name, account?.name, statusLabel]
    .filter(Boolean)
    .join(', ');
  const narrow = rowWidth > 0 && rowWidth < NARROW;
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.min(windowWidth - MARGIN * 2, MAX_WIDTH);

  return (
    <>
      <TabBarRoot placement="floating">
        <View
          style={[styles.row, { width: barWidth }]}
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        >
          {ready ? (
            <Shapes
              frames={frames as Frames}
              rowWidth={rowWidth}
              progress={progress}
              grow={grow}
              open={open}
              colors={colors}
              labels={labels}
              workspace={workspace}
              account={account}
              status={status}
              narrow={narrow}
              press={press}
              list={list}
              onRound={() => {
                tick();
                progress.value = withSpring(0, tabcnSpring);
                panel.hide();
              }}
              onWorkspace={showWorkspaces}
              onAccount={showAccounts}
            />
          ) : null}

          {/* Layout A: in flow, so it sets the bar's size. Its pill and chip are drawn by the
              shapes behind it once measured; the tabs fade out as the dock opens. */}
          <RestLayer progress={progress} open={open}>
            <View style={styles.pillBox} onLayout={measure('pill')}>
              <TabList style={[styles.pill, !ready && { backgroundColor: colors.surface }]}>
                <TabIndicator style={[styles.capsule, { backgroundColor: colors.capsule }]} />
                {tabs.map((tab) => (
                  <Tab
                    key={tab.key}
                    tab={tab}
                    colors={colors}
                    haptics={haptics}
                    progress={progress}
                  />
                ))}
              </TabList>
            </View>
            <Pressable
              ref={chipRef}
              onLayout={measure('chip')}
              onPress={openDock}
              onPressIn={() => {
                press.chip.value = withTiming(1, PRESS_IN);
              }}
              onPressOut={() => {
                press.chip.value = withTiming(0, tabcnTiming);
              }}
              accessibilityRole="button"
              accessibilityLabel={chipLabel}
              accessibilityState={{ expanded: open }}
              style={[styles.chip, !ready && { backgroundColor: colors.surface }]}
            >
              {ready ? null : (
                <ChipMarks
                  workspace={workspace}
                  account={account}
                  status={status}
                  colors={colors}
                />
              )}
            </Pressable>
          </RestLayer>
          {ready ? (
            <TravellingIcon
              frames={frames as Frames}
              rowWidth={rowWidth}
              progress={progress}
              press={press.round}
              tabCount={tabs.length}
              activeIndex={activeIndex}
              activeTab={activeTab}
              color={colors.accent}
            />
          ) : null}

          {/* Layout B, twice: never seen, only measured. */}
          <Placeholder>
            <View style={styles.roundSlot} onLayout={measure('round')} />
            <View style={styles.wsSlot} onLayout={measure('ws')} />
            <View style={styles.roundSlot} onLayout={measure('acct')} />
          </Placeholder>
          <Placeholder>
            <View style={styles.roundSlot} />
            <View style={styles.roundSlot} onLayout={measure('ws2')} />
            <View style={styles.acctSlot} onLayout={measure('acct2')} />
          </Placeholder>
        </View>
      </TabBarRoot>

      <TabPanel id={id} anchor="bar">
        <Sheet
          list={list}
          menu={menu}
          setList={(next) => {
            tick();
            setList(next);
            setMenu(false);
          }}
          setMenu={setMenu}
          workspaces={workspaces}
          workspaceId={workspace?.id}
          accounts={accounts}
          accountId={account?.id}
          status={status}
          colors={colors}
          labels={labels}
          progress={progress}
          onWorkspace={(next) => {
            tick();
            onWorkspaceChange(next);
          }}
          onAccount={(next) => {
            tick();
            onAccountChange(next);
          }}
          onStatus={(next) => {
            tick();
            setMenu(false);
            onStatusChange(next);
          }}
          onAddWorkspace={onAddWorkspace}
        />
      </TabPanel>
    </>
  );
}

/** Layout A's content: fades out over the first third of the fold, and stops taking touches. */
function RestLayer({
  progress,
  open,
  children,
}: {
  progress: SharedValue<number>;
  open: boolean;
  children: ReactNode;
}) {
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], 'clamp'),
  }));
  return (
    <Animated.View style={[styles.rest, fade]} pointerEvents={open ? 'none' : 'box-none'}>
      {children}
    </Animated.View>
  );
}

/** A row laid out like layout B, over the whole bar, measured and never shown. */
function Placeholder({ children }: { children: ReactNode }) {
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.placeholder]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {children}
    </View>
  );
}

/** A horizontal span of the bar, in points from its left edge: where a pill is drawn. */
interface Span {
  x: number;
  w: number;
}

/** Which pill a press is on, for the press feedback. */
type PressTarget = 'chip' | 'round' | 'ws' | 'acct';

/**
 * The shapes that fold: the tab pill into the round button, the chip into the workspace pill,
 * the chip's avatar into the account pill. Every animated style here is a transform or an
 * opacity, so Reanimated updates the views directly on the UI thread: nothing is laid out and
 * nothing is committed to React Native's tree while the dock folds. A pill of changing width is
 * two round caps that move apart and a middle strip that stretches between them (a stretched
 * circle would turn oval); shadows don't move at all, they cross-fade between where the pills
 * rest. The container is laid out left to right, so every position here is physical (frames are
 * measured from the left) and RTL is handled where a position is computed.
 */
function Shapes({
  frames,
  rowWidth,
  progress,
  grow,
  press,
  open,
  list,
  colors,
  labels,
  workspace,
  account,
  status,
  narrow,
  onRound,
  onWorkspace,
  onAccount,
}: {
  frames: Frames;
  rowWidth: number;
  progress: SharedValue<number>;
  grow: SharedValue<number>;
  press: Record<PressTarget, SharedValue<number>>;
  open: boolean;
  list: List;
  colors: AccountDockColors;
  labels: AccountDockLabels;
  workspace: AccountDockWorkspace | undefined;
  account: AccountDockAccount | undefined;
  status: AccountStatus;
  narrow: boolean;
  onRound: () => void;
  onWorkspace: () => void;
  onAccount: () => void;
}) {
  const { pill, chip, round, ws, acct, ws2, acct2 } = frames;
  const rtl = I18nManager.isRTL;
  const mid = rowWidth / 2;
  // At rest the avatar's pill is the trailing end of the chip: its right end, or its left in RTL.
  const restAcct: Span = { x: rtl ? chip.x : chip.x + chip.width - H, w: H };
  // A mark sits INSET in from its pill's leading end; text starts TEXT_START in.
  const leadX = (span: Span, inset: number, width: number) => {
    'worklet';
    return rtl ? span.x + span.w - inset - width : span.x + inset;
  };

  const wsTextWidth = Math.max(0, ws.width - TEXT_START - 14);
  const acctTextWidth = Math.max(0, acct2.width - TEXT_START - 16);
  const wsTextLeft = leadX({ x: ws.x, w: ws.width }, TEXT_START, wsTextWidth);
  const acctTextLeft = leadX({ x: acct2.x, w: acct2.width }, TEXT_START, acctTextWidth);

  const roundSpan = useDerivedValue<Span>(() => {
    const p = progress.value;
    return { x: lerp(pill.x, round.x, p), w: lerp(pill.width, round.width, p) };
  });
  const wsSpan = useDerivedValue<Span>(() => {
    const p = progress.value;
    const g = grow.value;
    return {
      x: lerp(chip.x, lerp(ws.x, ws2.x, g), p),
      w: lerp(chip.width, lerp(ws.width, ws2.width, g), p),
    };
  });
  const acctSpan = useDerivedValue<Span>(() => {
    const p = progress.value;
    const g = grow.value;
    return {
      x: lerp(restAcct.x, lerp(acct.x, acct2.x, g), p),
      w: lerp(restAcct.w, lerp(acct.width, acct2.width, g), p),
    };
  });

  // Press feedback: a pill shrinks a little about its own centre (the chip, about the chip's).
  const pressed = (span: SharedValue<Span>, target: PressTarget, chipToo: boolean) => {
    'worklet';
    const own = span.value.x + span.value.w / 2 - mid;
    const chipCentre = chip.x + chip.width / 2 - mid;
    const s = 1 - 0.04 * press[target].value;
    const c = 1 - 0.04 * (chipToo ? press.chip.value : 0);
    return [
      { translateX: chipCentre },
      { scale: c },
      { translateX: -chipCentre + own },
      { scale: s },
      { translateX: -own },
    ];
  };
  const roundGroup = useAnimatedStyle(() => ({ transform: pressed(roundSpan, 'round', false) }));
  const wsGroup = useAnimatedStyle(() => ({ transform: pressed(wsSpan, 'ws', true) }));
  const acctGroup = useAnimatedStyle(() => ({
    transform: pressed(acctSpan, 'acct', true),
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leadX(wsSpan.value, INSET, MARK) }],
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leadX(acctSpan.value, INSET, MARK) }],
  }));
  // The account pill's fill appears as it leaves the chip; at rest the chip's fill is behind it.
  const acctFill = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.15, 0.6], [0, 1], 'clamp'),
  }));
  // Names fade in once their pill is nearly open, and the workspace's gives way to the account's.
  // Text is laid out where its pill rests open and travels with the pill's leading end.
  const wsText = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.value, [0.65, 1], [0, 1], 'clamp') *
      interpolate(grow.value, [0, 0.3], [1, 0], 'clamp'),
    transform: [{ translateX: leadX(wsSpan.value, TEXT_START, wsTextWidth) - wsTextLeft }],
  }));
  const acctText = useAnimatedStyle(() => ({
    opacity:
      interpolate(grow.value, [0.55, 1], [0, 1], 'clamp') *
      interpolate(progress.value, [0.7, 1], [0, 1], 'clamp'),
    transform: [{ translateX: leadX(acctSpan.value, TEXT_START, acctTextWidth) - acctTextLeft }],
  }));
  // Shadows stay put and cross-fade: at rest under the pill and chip, open under layout B.
  const restShadow = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const wsShadow = useAnimatedStyle(() => ({ opacity: progress.value * (1 - grow.value) }));
  const acctShadow = useAnimatedStyle(() => ({ opacity: progress.value * grow.value }));

  const fill = colors.surface;
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const wsFrame = list === 'accounts' ? ws2 : ws;
  const acctFrame = list === 'accounts' ? acct2 : acct;
  const hidden = {
    importantForAccessibility: 'no-hide-descendants' as const,
    accessibilityElementsHidden: true,
  };
  // The pressables are hidden from screen readers too: while the dock is open the foundation
  // hides the bar, and the sheet carries the same controls.
  const target = (frame: Frame) => ({ left: frame.x, width: frame.width });
  const onPressIn = (t: PressTarget) => () => {
    press[t].value = withTiming(1, PRESS_IN);
  };
  const onPressOut = (t: PressTarget) => () => {
    press[t].value = withTiming(0, tabcnTiming);
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.ltr]} pointerEvents="box-none" {...hidden}>
      {/* Shadows: static, cross-faded. */}
      <Animated.View style={[StyleSheet.absoluteFill, restShadow]} pointerEvents="none">
        <View style={[styles.shadow, { left: pill.x, width: pill.width }]} />
        <View style={[styles.shadow, { left: chip.x, width: chip.width }]} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, wsShadow]} pointerEvents="none">
        <View style={[styles.shadow, { left: round.x, width: round.width }]} />
        <View style={[styles.shadow, { left: ws.x, width: ws.width }]} />
        <View style={[styles.shadow, { left: acct.x, width: acct.width }]} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, acctShadow]} pointerEvents="none">
        <View style={[styles.shadow, { left: round.x, width: round.width }]} />
        <View style={[styles.shadow, { left: ws2.x, width: ws2.width }]} />
        <View style={[styles.shadow, { left: acct2.x, width: acct2.width }]} />
      </Animated.View>

      {/* The tab pill folding into the round button (its icon is drawn by TravellingIcon). */}
      <Animated.View style={[styles.group, roundGroup]} pointerEvents="none">
        <Capsule span={roundSpan} color={fill} />
      </Animated.View>

      {/* The chip stretching into the workspace pill. */}
      <Animated.View style={[styles.group, wsGroup]} pointerEvents="none">
        <Capsule span={wsSpan} color={fill} />
        <Animated.View style={[styles.mark, logoStyle]}>
          {workspace ? <Mark item={workspace} size={MARK} square /> : null}
        </Animated.View>
        <Animated.View style={[styles.text, { left: wsTextLeft }, { width: wsTextWidth }, wsText]}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[styles.name, align, { color: colors.foreground }]}
          >
            {workspace?.name}
          </Text>
          {workspace?.detail && !narrow ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[styles.detail, align, { color: colors.muted }]}
            >
              {workspace.detail}
            </Text>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* The avatar leaving the chip and growing into the account pill. */}
      <Animated.View style={[styles.group, acctGroup]} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, acctFill]}>
          <Capsule span={acctSpan} color={fill} />
        </Animated.View>
        <Animated.View style={[styles.mark, avatarStyle]}>
          {account ? <Avatar account={account} status={status} colors={colors} /> : null}
        </Animated.View>
        <Animated.View
          style={[styles.text, { left: acctTextLeft }, { width: acctTextWidth }, acctText]}
        >
          <AccountText account={account} statusLabel={labels[status]} colors={colors} rtl={rtl} />
        </Animated.View>
      </Animated.View>

      {/* Touch targets where the pills rest while open: static, so nothing is laid out per frame. */}
      {open ? (
        <>
          <Pressable
            style={[styles.target, target(round)]}
            onPress={onRound}
            onPressIn={onPressIn('round')}
            onPressOut={onPressOut('round')}
          />
          <Pressable
            style={[styles.target, target(wsFrame)]}
            onPress={onWorkspace}
            onPressIn={onPressIn('ws')}
            onPressOut={onPressOut('ws')}
          />
          <Pressable
            style={[styles.target, target(acctFrame)]}
            onPress={onAccount}
            onPressIn={onPressIn('acct')}
            onPressOut={onPressOut('acct')}
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * The active tab's icon travelling into the round button, growing a little. It is drawn above
 * the tabs (the shapes are below them, under the active tab's highlight), and the tab's own icon
 * hides as soon as the fold starts, so it reads as one icon moving, not two cross-fading.
 */
function TravellingIcon({
  frames,
  rowWidth,
  progress,
  press,
  tabCount,
  activeIndex,
  activeTab,
  color,
}: {
  frames: Frames;
  rowWidth: number;
  progress: SharedValue<number>;
  press: SharedValue<number>;
  tabCount: number;
  activeIndex: number;
  activeTab: TabItem | undefined;
  color: string;
}) {
  const { pill, round } = frames;
  const rtl = I18nManager.isRTL;
  const tabWidth = (pill.width - PAD_X * 2) / Math.max(1, tabCount);
  const lead = PAD_X + (Math.max(0, activeIndex) + 0.5) * tabWidth;
  const tabCentre = rtl ? pill.x + pill.width - lead : pill.x + lead;
  const roundCentre = round.x + H / 2;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const centre = lerp(tabCentre, roundCentre, p);
    // Pressing the round button shrinks it about its centre; the icon goes with it.
    const pressed = 1 - 0.04 * press.value;
    return {
      opacity: p > 0.002 ? 1 : 0,
      transform: [
        { translateX: roundCentre - rowWidth / 2 },
        { scale: pressed },
        { translateX: centre - roundCentre },
        { scale: lerp(ICON / ROUND_ICON, 1, p) },
      ],
    };
  });
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.ltr, styles.iconLayer, style]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {activeTab?.renderIcon?.({ focused: true, color, size: ROUND_ICON })}
    </Animated.View>
  );
}

/**
 * A capsule over the span: two round caps moved by `translateX` and a middle strip stretched by
 * `scaleX` between their centres, overlapping them by half a point so no seam shows.
 */
function Capsule({ span, color }: { span: SharedValue<Span>; color: string }) {
  const start = useAnimatedStyle(() => ({ transform: [{ translateX: span.value.x }] }));
  const end = useAnimatedStyle(() => ({
    transform: [{ translateX: span.value.x + Math.max(span.value.w, H) - H }],
  }));
  const middle = useAnimatedStyle(() => {
    const length = Math.max(0, span.value.w - H) + 1;
    return {
      transform: [
        { translateX: span.value.x + Math.max(span.value.w, H) / 2 - STRIP / 2 },
        { scaleX: length / STRIP },
      ],
    };
  });
  const fill = { backgroundColor: color };
  return (
    <>
      <Animated.View style={[styles.strip, fill, middle]} />
      <Animated.View style={[styles.cap, fill, start]} />
      <Animated.View style={[styles.cap, fill, end]} />
    </>
  );
}

/** The account pill's two lines: the name and the current status. */
function AccountText({
  account,
  statusLabel,
  colors,
  rtl = false,
}: {
  account: AccountDockAccount | undefined;
  statusLabel: string;
  colors: AccountDockColors;
  rtl?: boolean;
}) {
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <View style={styles.acctLines}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.name, align, { color: colors.foreground }]}
      >
        {account?.name}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.detail, align, { color: colors.muted }]}
      >
        {statusLabel}
      </Text>
    </View>
  );
}

/** The chip's marks before the shapes are measured (the first frame). */
function ChipMarks({
  workspace,
  account,
  status,
  colors,
}: {
  workspace: AccountDockWorkspace | undefined;
  account: AccountDockAccount | undefined;
  status: AccountStatus;
  colors: AccountDockColors;
}) {
  return (
    <>
      {workspace ? <Mark item={workspace} size={MARK} square /> : null}
      <View style={{ marginStart: -OVERLAP }}>
        {account ? <Avatar account={account} status={status} colors={colors} /> : null}
      </View>
    </>
  );
}

function Tab({
  tab,
  colors,
  haptics,
  progress,
}: {
  tab: TabItem;
  colors: AccountDockColors;
  haptics: boolean;
  progress: SharedValue<number>;
}) {
  const color = tab.focused ? colors.accent : colors.foreground;
  const focused = tab.focused;
  // The active tab's icon leaves as the fold starts: the round button's icon takes its place
  // and travels, so it reads as one icon moving.
  const handOff = useAnimatedStyle(() => ({
    opacity: focused && progress.value > 0.002 ? 0 : 1,
  }));
  return (
    <TabButton
      tab={tab}
      style={styles.tab}
      onPressIn={haptics ? () => Haptics.selectionAsync() : undefined}
    >
      <Animated.View style={[styles.iconBox, handOff]}>
        {tab.renderIcon?.({ focused: tab.focused, color, size: ICON })}
        <Badge badge={tab.badge} colors={colors} />
      </Animated.View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.label, { color, fontWeight: tab.focused ? '600' : '500' }]}
      >
        {tab.label}
      </Text>
    </TabButton>
  );
}

/** A tab's badge: an empty one is a dot, a number a count. `TabButton` reads it aloud. */
function Badge({ badge, colors }: { badge: TabItem['badge']; colors: AccountDockColors }) {
  if (badge == null) return null;
  const text = String(badge).trim();
  if (!text) return <View style={[styles.dot, { backgroundColor: colors.badge }]} />;
  const textStyle = [styles.badgeText, { color: colors.badgeText }];
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.count, { backgroundColor: colors.badge }]}
    >
      {typeof badge === 'number' ? (
        <BadgeCount value={badge} textStyle={textStyle} />
      ) : (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={textStyle}>
          {text}
        </Text>
      )}
    </View>
  );
}

/** Soft, distinct fills for marks without an image, picked from the name. */
const MARK_COLORS = ['#5b6cff', '#ff7a45', '#14b8a6', '#e8579a', '#8b5cf6', '#f2a516'];

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function colorOf(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return MARK_COLORS[Math.abs(hash) % MARK_COLORS.length] ?? '#5b6cff';
}

/** A workspace logo (rounded square) or avatar (circle): the image, or initials on a colour. */
function Mark({
  item,
  size,
  square = false,
}: {
  item: {
    name: string;
    initials?: string;
    color?: string;
    logo?: ImageSourcePropType;
    avatar?: ImageSourcePropType;
  };
  size: number;
  square?: boolean;
}) {
  const radius = square ? size * 0.3 : size / 2;
  const source = item.logo ?? item.avatar;
  if (source) {
    return (
      <Image
        source={source}
        style={{ width: size, height: size, borderRadius: radius }}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View
      style={[
        styles.initialsBox,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: item.color ?? colorOf(item.name),
        },
      ]}
    >
      <Text maxFontSizeMultiplier={1} style={[styles.initials, { fontSize: size * 0.38 }]}>
        {item.initials ?? initialsOf(item.name)}
      </Text>
    </View>
  );
}

/** An avatar with its status dot at the bottom end, ringed in the pill's colour. */
function Avatar({
  account,
  status,
  colors,
  size = MARK,
}: {
  account: AccountDockAccount;
  status: AccountStatus;
  colors: AccountDockColors;
  size?: number;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Mark item={account} size={size} />
      <StatusDot status={status} colors={colors} ring={colors.surface} />
    </View>
  );
}

function StatusDot({
  status,
  colors,
  ring,
}: {
  status: AccountStatus;
  colors: AccountDockColors;
  ring: string;
}) {
  const fill = colors[status];
  // A ring for invisible, a solid dot otherwise; a change of status cross-fades the colour.
  const centre = status === 'invisible' ? ring : fill;
  const dot = useAnimatedStyle(() => ({
    borderColor: withTiming(fill, tabcnTiming),
    backgroundColor: withTiming(centre, tabcnTiming),
  }));
  return (
    <View style={[styles.statusDot, { backgroundColor: ring }]}>
      <Animated.View style={[styles.statusInner, dot]} />
    </View>
  );
}

const GLYPHS: Record<AccountStatus, (props: { color: string; size: number }) => ReactNode> = {
  online: OnlineGlyph,
  idle: IdleGlyph,
  dnd: DndGlyph,
  invisible: InvisibleGlyph,
};

/** The sheet: one list at a time, and the status menu over the accounts. */
function Sheet({
  list,
  menu,
  setList,
  setMenu,
  workspaces,
  workspaceId,
  accounts,
  accountId,
  status,
  colors,
  labels,
  onWorkspace,
  onAccount,
  onStatus,
  onAddWorkspace,
  progress,
}: {
  list: List;
  menu: boolean;
  setList: (list: List) => void;
  setMenu: (open: boolean) => void;
  workspaces: readonly AccountDockWorkspace[];
  workspaceId: string | undefined;
  accounts: readonly AccountDockAccount[];
  accountId: string | undefined;
  status: AccountStatus;
  colors: AccountDockColors;
  labels: AccountDockLabels;
  onWorkspace: (id: string) => void;
  onAccount: (id: string) => void;
  onStatus: (status: AccountStatus) => void;
  onAddWorkspace?: () => void;
  /** The fold, 0 (tabs) to 1 (account bar). */
  progress: SharedValue<number>;
}) {
  const overlap = usePanelOverlap();
  const { height } = useWindowDimensions();
  const other: List = list === 'workspaces' ? 'accounts' : 'workspaces';

  // Lists cross-fade: the new one fades in on tabcnTiming when `list` changes.
  const fade = useSharedValue(1);
  const shown = useRef(list);
  useEffect(() => {
    if (shown.current === list) return;
    shown.current = list;
    fade.value = 0;
    fade.value = withTiming(1, tabcnTiming);
  }, [list, fade]);
  const listFade = useAnimatedStyle(() => ({ opacity: fade.value }));
  // While the sheet rises, its lower rows pass behind the bar, where the split bar has gaps
  // between its pills; they would show through. The content comes in once the sheet is
  // mostly up, and goes first when it folds.
  const reveal = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.72, 1], [0, 1], 'clamp'),
  }));

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.sheet, borderColor: colors.border, paddingBottom: overlap + 12 },
      ]}
    >
      <Animated.View style={reveal}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={1.3}
            style={[styles.title, { color: colors.foreground }]}
          >
            {labels[list]}
          </Text>
          <Pressable
            onPress={() => setList(other)}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [
              styles.switch,
              { backgroundColor: pressed ? colors.capsule : 'transparent' },
            ]}
          >
            <Text maxFontSizeMultiplier={1.3} style={[styles.switchText, { color: colors.accent }]}>
              {labels[other]}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: Math.max(160, height * 0.6 - 120) }} bounces={false}>
          <Animated.View style={listFade}>
            {list === 'workspaces' ? (
              <>
                {workspaces.map((w) => (
                  <Row
                    key={w.id}
                    title={w.name}
                    detail={w.detail}
                    current={w.id === workspaceId}
                    colors={colors}
                    onPress={() => onWorkspace(w.id)}
                    mark={<Mark item={w} size={ROW_MARK} square />}
                  />
                ))}
                {onAddWorkspace ? (
                  <Row
                    title={labels.addWorkspace}
                    colors={colors}
                    accent
                    onPress={onAddWorkspace}
                    mark={
                      <View style={[styles.addMark, { borderColor: colors.border }]}>
                        <PlusIcon color={colors.accent} size={20} />
                      </View>
                    }
                  />
                ) : null}
              </>
            ) : (
              <>
                {accounts.map((a) => (
                  <Row
                    key={a.id}
                    title={a.name}
                    current={a.id === accountId}
                    colors={colors}
                    onPress={() => onAccount(a.id)}
                    mark={<Mark item={a} size={ROW_MARK} />}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Row
                  title={labels.status}
                  detail={labels[status]}
                  colors={colors}
                  onPress={() => setMenu(!menu)}
                  expanded={menu}
                  mark={<StatusCircle status={status} colors={colors} size={ROW_MARK} />}
                  trailing={
                    <View style={I18nManager.isRTL ? styles.mirror : undefined}>
                      <ChevronIcon color={colors.muted} size={16} />
                    </View>
                  }
                />
              </>
            )}
          </Animated.View>
        </ScrollView>

        <StatusMenu
          open={menu && list === 'accounts'}
          status={status}
          colors={colors}
          labels={labels}
          bottom={overlap + 10}
          onClose={() => setMenu(false)}
          onChoose={onStatus}
        />
      </Animated.View>
    </View>
  );
}

function Row({
  title,
  detail,
  mark,
  current,
  accent = false,
  expanded,
  trailing,
  colors,
  onPress,
}: {
  title: string;
  detail?: string;
  mark: ReactNode;
  current?: boolean;
  accent?: boolean;
  expanded?: boolean;
  trailing?: ReactNode;
  colors: AccountDockColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
      accessibilityState={{
        ...(current === undefined ? {} : { selected: current }),
        ...(expanded === undefined ? {} : { expanded }),
      }}
      style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: colors.capsule }]}
    >
      {mark}
      <View style={styles.rowText}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[styles.rowTitle, { color: accent ? colors.accent : colors.foreground }]}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[styles.detail, { color: colors.muted }]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {current ? <CheckIcon color={colors.accent} size={20} /> : trailing}
    </Pressable>
  );
}

function StatusCircle({
  status,
  colors,
  size,
}: {
  status: AccountStatus;
  colors: AccountDockColors;
  size: number;
}) {
  const Glyph = GLYPHS[status];
  return (
    <View
      style={[
        styles.statusCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[status] },
      ]}
    >
      <Glyph color={colors.badgeText} size={size * 0.55} />
    </View>
  );
}

interface KeyTarget {
  addEventListener: (type: 'keydown', fn: (e: KeyEvent) => void, capture: boolean) => void;
  removeEventListener: (type: 'keydown', fn: (e: KeyEvent) => void, capture: boolean) => void;
}
interface KeyEvent {
  key: string;
  stopPropagation: () => void;
}

/**
 * The status menu: four radio rows over the account list, aligned to the sheet's end above the
 * account pill. Back, Escape (web) and the screen-reader escape gesture close only the menu:
 * its listeners are added after the panel's, so they run first.
 */
function StatusMenu({
  open,
  status,
  colors,
  labels,
  bottom,
  onClose,
  onChoose,
}: {
  open: boolean;
  status: AccountStatus;
  colors: AccountDockColors;
  labels: AccountDockLabels;
  bottom: number;
  onClose: () => void;
  onChoose: (status: AccountStatus) => void;
}) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(open ? 1 : 0, tabcnTiming);
  }, [open, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ scale: lerp(0.96, 1, shown.value) }],
  }));

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
  useEffect(() => {
    const doc = (globalThis as { document?: KeyTarget }).document;
    if (!open || Platform.OS !== 'web' || !doc) return;
    // Capture phase on the document runs before the panel's own Escape listener.
    const onKey = (event: KeyEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    doc.addEventListener('keydown', onKey, true);
    return () => doc.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  return (
    <>
      {open ? (
        // A tap anywhere else in the sheet closes the menu first.
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
      ) : null}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!open}
        accessibilityRole="radiogroup"
        accessibilityLabel={labels.status}
        onAccessibilityEscape={onClose}
        style={[
          styles.menu,
          {
            bottom,
            backgroundColor: colors.sheet,
            borderColor: colors.border,
            // It grows from the corner over the account pill: bottom left in RTL.
            transformOrigin: I18nManager.isRTL ? 'bottom left' : 'bottom right',
          },
          style,
        ]}
      >
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => onChoose(s)}
            accessibilityRole="radio"
            accessibilityState={{ checked: s === status }}
            accessibilityLabel={labels[s]}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && { backgroundColor: colors.capsule },
            ]}
          >
            <StatusCircle status={s} colors={colors} size={28} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={[styles.menuText, { color: colors.foreground }]}
            >
              {labels[s]}
            </Text>
            {s === status ? (
              <CheckIcon color={colors.accent} size={18} />
            ) : (
              <View style={styles.checkSpace} />
            )}
          </Pressable>
        ))}
      </Animated.View>
    </>
  );
}

const shadow = '0 10px 28px rgba(40, 40, 60, 0.14)';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  rest: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: GAP },
  pillBox: { flex: 1 },
  pill: {
    borderRadius: 999,
    paddingVertical: PAD_Y,
    paddingHorizontal: PAD_X,
    flexShrink: 1,
  },
  capsule: { borderRadius: 999 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 2,
    flex: 1,
    minWidth: MIN_TAB_WIDTH,
    height: H - PAD_Y * 2,
  },
  iconBox: { width: ICON, height: ICON },
  label: { fontSize: 10.5, lineHeight: 13 },
  dot: { position: 'absolute', top: -1, right: -3, width: 7, height: 7, borderRadius: 3.5 },
  count: {
    position: 'absolute',
    top: -6,
    left: ICON - 6,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9.5, lineHeight: 12, fontWeight: '700' },
  chip: {
    width: CHIP_WIDTH,
    height: H,
    borderRadius: H / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
  },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: GAP, opacity: 0 },
  roundSlot: { width: H, height: H },
  wsSlot: { flex: 1, height: H },
  acctSlot: { flex: 1, height: H },
  ltr: { direction: 'ltr' },
  group: { position: 'absolute', left: 0, top: 0, right: 0, height: H },
  cap: { position: 'absolute', left: 0, top: 0, width: H, height: H, borderRadius: H / 2 },
  strip: { position: 'absolute', left: 0, top: 0, width: STRIP, height: H },
  shadow: { position: 'absolute', top: 0, height: H, borderRadius: H / 2, boxShadow: shadow },
  // A full-row layer whose centre is the row's: the icon sits there, and transforms move it.
  iconLayer: { alignItems: 'center', justifyContent: 'center' },
  mark: { position: 'absolute', left: 0, top: INSET },
  text: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  target: { position: 'absolute', top: 0, height: H, borderRadius: H / 2 },
  acctLines: { justifyContent: 'center' },
  name: { fontSize: 15, lineHeight: 19, fontWeight: '600' },
  detail: { fontSize: 12.5, lineHeight: 16 },
  initialsBox: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#ffffff', fontWeight: '700' },
  statusDot: {
    position: 'absolute',
    end: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInner: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  sheet: {
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingHorizontal: 8,
    boxShadow: shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  switch: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  switchText: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15.5, lineHeight: 20, fontWeight: '600' },
  addMark: {
    width: ROW_MARK,
    height: ROW_MARK,
    borderRadius: ROW_MARK * 0.3,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4, marginHorizontal: 10 },
  statusCircle: { alignItems: 'center', justifyContent: 'center' },
  mirror: { transform: [{ scaleX: -1 }] },
  menu: {
    position: 'absolute',
    end: 10,
    width: 216,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    boxShadow: '0 12px 32px rgba(40, 40, 60, 0.18)',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  menuText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  checkSpace: { width: 18 },
});
