import { AccentDark } from '@registry/accent-dark/accent-dark';
import * as AccentDarkIcons from '@registry/accent-dark/icons';
import { BadgeDock } from '@registry/badge-dock/badge-dock';
import * as BadgeDockIcons from '@registry/badge-dock/icons';
import { ButtonRow } from '@registry/button-row/button-row';
import * as ButtonRowIcons from '@registry/button-row/icons';
import { CartPill } from '@registry/cart-pill/cart-pill';
import * as CartPillIcons from '@registry/cart-pill/icons';
import { CenterCta } from '@registry/center-cta/center-cta';
import * as CenterCtaIcons from '@registry/center-cta/icons';
import { ChipRail } from '@registry/chip-rail/chip-rail';
import * as ChipRailIcons from '@registry/chip-rail/icons';
import { ColorFlood, colorFloodGreen } from '@registry/color-flood/color-flood';
import * as ColorFloodIcons from '@registry/color-flood/icons';
import * as ComposerDockIcons from '@registry/composer-dock/composer-dock-icons';
import { DarkCapsule } from '@registry/dark-capsule/dark-capsule';
import * as DarkCapsuleIcons from '@registry/dark-capsule/icons';
import { FrostedMedia } from '@registry/frosted-media/frosted-media';
import * as FrostedMediaIcons from '@registry/frosted-media/icons';
import { GlassBadges } from '@registry/glass-badges/glass-badges';
import * as GlassBadgesIcons from '@registry/glass-badges/icons';
import { GlassExpand } from '@registry/glass-expand/glass-expand';
import * as GlassExpandIcons from '@registry/glass-expand/icons';
import { GlowGlass } from '@registry/glow-glass/glow-glass';
import * as GlowGlassIcons from '@registry/glow-glass/icons';
import { GradientStickers } from '@registry/gradient-stickers/gradient-stickers';
import * as GradientStickersIcons from '@registry/gradient-stickers/icons';
import * as LabeledPlusIcons from '@registry/labeled-plus/icons';
import { LabeledPlus } from '@registry/labeled-plus/labeled-plus';
import * as LightIconsIcons from '@registry/light-icons/icons';
import { LightIcons } from '@registry/light-icons/light-icons';
import { LiveTabs } from '@registry/live-tabs/live-tabs';
import * as MaterialPillIcons from '@registry/material-pill/icons';
import { MaterialPill } from '@registry/material-pill/material-pill';
import * as MonoTypeIcons from '@registry/mono-type/icons';
import { MonoType } from '@registry/mono-type/mono-type';
import * as OffsetPlusIcons from '@registry/offset-plus/icons';
import { OffsetPlus } from '@registry/offset-plus/offset-plus';
import * as OrbsIcons from '@registry/orbs/icons';
import { Orbs } from '@registry/orbs/orbs';
import * as OutlineDarkIcons from '@registry/outline-dark/icons';
import { OutlineDark } from '@registry/outline-dark/outline-dark';
import * as PillPlusIcons from '@registry/pill-plus/icons';
import { PillPlus } from '@registry/pill-plus/pill-plus';
import * as PlayfulTilesIcons from '@registry/playful-tiles/icons';
import { PlayfulTiles } from '@registry/playful-tiles/playful-tiles';
import { ScrubPill } from '@registry/scrub-pill/scrub-pill';
import * as SearchDockIcons from '@registry/search-dock/icons';
import { SearchDock } from '@registry/search-dock/search-dock';
import { SectionSheet } from '@registry/section-sheet/section-sheet';
import { SegmentSearch } from '@registry/segment-search/segment-search';
import * as SideRailIcons from '@registry/side-rail/icons';
import { SideRail } from '@registry/side-rail/side-rail';
import * as SlidingCapsuleIcons from '@registry/sliding-capsule/icons';
import { SlidingCapsule } from '@registry/sliding-capsule/sliding-capsule';
import * as SoftPillIcons from '@registry/soft-pill/icons';
import { SoftPill } from '@registry/soft-pill/soft-pill';
import * as SolidDarkIcons from '@registry/solid-dark/icons';
import { SolidDark } from '@registry/solid-dark/solid-dark';
import * as SplitSearchIcons from '@registry/split-search/icons';
import { SplitSearch } from '@registry/split-search/split-search';
import * as StickerTilesIcons from '@registry/sticker-tiles/icons';
import { StickerTiles } from '@registry/sticker-tiles/sticker-tiles';
import * as TilePlusIcons from '@registry/tile-plus/icons';
import { TilePlus } from '@registry/tile-plus/tile-plus';
import * as TintedIconsIcons from '@registry/tinted-icons/icons';
import { TintedIcons, tintedIconsDark } from '@registry/tinted-icons/tinted-icons';
import * as TopNotchIcons from '@registry/top-notch/icons';
import { TopNotch } from '@registry/top-notch/top-notch';
import type { Href } from 'expo-router';
import { type ComponentType, createContext, type ReactElement, type ReactNode, use } from 'react';
import type { TabIconProps } from 'react-native-tabcn';
import { ComposerDockDemoBar, ComposerDockScreen, ModelSheet } from '@/composer-dock-demo';
import {
  BarSheetControls,
  BarSheetPanel,
  CompanionChipExtra,
  CompanionChipPanel,
  ContextTrayExtra,
  type DemoExtraProps,
  LiveTabsControls,
  LiveTabsFeed,
  MinimizeList,
  MiniPlayerControls,
  MiniPlayerPanel,
  QuickCreateBar,
  QuickCreateControls,
  QuickCreatePanel,
  SectionRows,
  SubTabsBar,
  SubTabsNote,
  SubTabsPanel,
} from '@/panel-demos';
import type { PatternSpec } from '@/pattern';

export interface DemoContext {
  onActionPress: () => void;
  /**
   * The navigator's route name for each tab, in order. Expo Router's demo names them
   * `index`, `t2`, `t3`…; React Navigation's `tab-0`, `tab-1`…. Designs that key things by
   * route name (Colour Flood's `surfaces`, Section Sheet's `sections`, `useLiveTab`) read
   * them from here, so one demo works under both.
   */
  routes: readonly string[];
}

export interface DemoTab {
  label: string;
  icon: (props: TabIconProps) => ReactNode;
  badge?: string | number;
}

export interface Demo {
  /** Renders the design (the exact file users copy from registry/). */
  render: (ctx: DemoContext) => ReactElement;
  /** Tabs as in the reference image: labels, icons, count. */
  tabs: DemoTab[];
  /** Screen background behind the bar, taken from the reference. */
  background: string;
  /**
   * A screen colour per tab, in tab order, for designs whose bar takes each screen's colour
   * (Colour Flood). A tab without an entry uses `background`.
   */
  backgrounds?: (string | undefined)[];
  /** Light text on the demo screens. */
  dark?: boolean;
  /** Background pattern from the reference image. */
  pattern?: PatternSpec;
  /** Tab selected in the reference image. Default 0. */
  initialTab?: number;
  /** Bar height in points, used to centre patterns on the bar. */
  barHeight?: number;
  /** Coloured shapes behind the bar (relative to its centre) for glass designs to blur. */
  blobs?: { dx: number; dy: number; r: number; color: string }[];
  /**
   * A panel demo's panel: declared once in the design layout, under its TabBarProvider beside
   * the navigator, so it stays across tabs. `render` draws the bar it pairs with.
   */
  panel?: (ctx: DemoContext) => ReactElement;
  /**
   * The demo's own screen in place of the title screen, for a design that comes with its
   * page (Composer Dock's chat app). Gets the tab's index.
   */
  screen?: ComponentType<{ index: number }>;
  /** Extra content under the demo screen's title: a panel's controls, a list to scroll. */
  extra?: ComponentType<DemoExtraProps>;
  /** Draw the bar as a rail on the left (`tabBarPosition: 'left'`) when the window is wide. */
  railWhenWide?: boolean;
  /** Hide the bar while the keyboard is up (`tabBarHideOnKeyboard`). */
  hideOnKeyboard?: boolean;
  /**
   * Hide the stack header above the tabs. Sheets size themselves as if the tab navigator
   * filled the screen, so a header above it would cover a sheet raised to full height.
   */
  fullScreen?: boolean;
}

/** The screen colour of a demo's tab: its own entry in `backgrounds`, or the demo's `background`. */
export function screenBackground(demo: Demo, index: number) {
  return demo.backgrounds?.[index] ?? demo.background;
}

/** Window width (pt) from which a `railWhenWide` demo shows its rail: iPads, landscape. */
export const RAIL_MIN_WIDTH = 600;

/** Built designs, keyed by catalog id. */
export const demos: Record<string, Demo> = {
  'chip-rail': {
    render: () => (
      <ChipRail leading={<ChipRailIcons.AvatarIcon focused={false} color="" size={39.5} />} />
    ),
    background: '#ab9ff1',
    pattern: { kind: 'waves', color: '#a296ec', gap: 9.6, amp: 1.2, wavelength: 18 },
    barHeight: 56,
    tabs: [
      { label: 'Home', icon: () => null },
      { label: 'Trade', icon: () => null },
      { label: 'Predict', icon: () => null },
      { label: 'Explore', icon: () => null },
      { label: 'Leaders', icon: () => null },
    ],
  },
  'sticker-tiles': {
    render: () => <StickerTiles fontFamily="Nunito_700Bold" />,
    background: '#d5ebf6',
    pattern: { kind: 'plus', color: '#bfdcec', gap: 24, size: 4, stroke: 1 },
    barHeight: 68,
    tabs: [
      { label: 'Home', icon: StickerTilesIcons.HomeIcon },
      { label: 'Quests', icon: StickerTilesIcons.QuestsIcon },
      { label: 'Shop', icon: StickerTilesIcons.ShopIcon },
      { label: 'Friends', icon: StickerTilesIcons.FriendsIcon, badge: 1 },
      { label: 'Bag', icon: StickerTilesIcons.BagIcon },
      { label: 'Sun', icon: StickerTilesIcons.SunIcon },
    ],
  },
  'pill-plus': {
    render: ({ onActionPress }) => <PillPlus onActionPress={onActionPress} />,
    // corner: a light map behind the bar.
    background: '#c5dff3',
    pattern: { kind: 'grid', color: '#d9e9f6', gap: 24 },
    initialTab: 1,
    barHeight: 54,
    tabs: [
      { label: 'Search', icon: PillPlusIcons.SearchIcon },
      { label: 'Map', icon: PillPlusIcons.MapIcon },
      { label: 'Me', icon: PillPlusIcons.AvatarIcon },
    ],
  },
  orbs: {
    render: () => <Orbs />,
    // The app's sea-blue map, with lighter shallows and a darker channel for the glass to blur.
    background: '#2ea5f0',
    initialTab: 1,
    barHeight: 82,
    blobs: [
      { dx: -150, dy: -30, r: 70, color: '#58bdf6' },
      { dx: 120, dy: 20, r: 60, color: '#1f8fdc' },
      { dx: 10, dy: 60, r: 50, color: '#47b3f4' },
    ],
    dark: true,
    tabs: [
      { label: 'Scratch', icon: OrbsIcons.ScratchIcon },
      { label: 'Chat', icon: OrbsIcons.ChatIcon },
      { label: 'Places', icon: OrbsIcons.PlacesIcon },
    ],
  },
  'center-cta': {
    render: ({ onActionPress }) => (
      <CenterCta onActionPress={onActionPress} fontFamily="PatrickHand_400Regular" />
    ),
    background: '#ece5d3',
    pattern: { kind: 'capsules', color: '#e3dbc6', gap: 44 },
    barHeight: 69,
    tabs: [
      { label: 'City', icon: CenterCtaIcons.BuildingIcon },
      { label: 'Steps', icon: CenterCtaIcons.StepIcon },
    ],
  },
  'glass-expand': {
    render: () => <GlassExpand />,
    // GO Club: the bar floats on a flat light-lavender card.
    background: '#ebe9ff',
    barHeight: 82,
    tabs: [
      { label: 'Steps', icon: GlassExpandIcons.SneakerIcon },
      { label: 'Water', icon: GlassExpandIcons.DropIcon },
      { label: 'Plan', icon: GlassExpandIcons.ListSparkleIcon },
      { label: 'Settings', icon: GlassExpandIcons.HexNutIcon },
    ],
  },
  'segment-search': {
    render: ({ onActionPress }) => <SegmentSearch onActionPress={onActionPress} />,
    background: '#edf6fd',
    pattern: { kind: 'rings', color: '#d9e5f0', gap: 9.6, stroke: 0.6 },
    barHeight: 58,
    tabs: [
      { label: 'Home', icon: () => null },
      { label: 'Pools', icon: () => null },
    ],
  },
  'soft-pill': {
    render: () => <SoftPill />,
    background: '#e5dfd4',
    pattern: { kind: 'stripes', light: '#f4efe7', dark: '#e1dace', gap: 8 },
    initialTab: 2,
    barHeight: 58.5,
    tabs: [
      { label: 'Home', icon: SoftPillIcons.HomeIcon },
      { label: 'Ideas', icon: SoftPillIcons.IdeasIcon },
      { label: 'Explore', icon: SoftPillIcons.ExploreIcon },
      { label: 'History', icon: SoftPillIcons.HistoryIcon },
      { label: 'Trends', icon: SoftPillIcons.TrendsIcon },
    ],
  },
  'gradient-stickers': {
    render: () => <GradientStickers />,
    background: '#ddf1e6',
    pattern: { kind: 'dots', color: '#cbe6d8', gap: 24, r: 1.7, stagger: true },
    initialTab: 4,
    barHeight: 58.5,
    tabs: [
      { label: 'Home', icon: GradientStickersIcons.HouseIcon },
      { label: 'Map', icon: GradientStickersIcons.MapIcon },
      { label: 'Shop', icon: GradientStickersIcons.ShopIcon },
      { label: 'Bag', icon: GradientStickersIcons.BagIcon },
      { label: 'Me', icon: GradientStickersIcons.CatIcon },
    ],
  },
  'frosted-media': {
    render: () => <FrostedMedia />,
    background: '#120f0d',
    pattern: { kind: 'rays', color: '#1b1714', count: 28 },
    initialTab: 2,
    barHeight: 58,
    blobs: [
      { dx: -95, dy: 0, r: 26, color: '#a3836a' },
      { dx: -40, dy: 6, r: 24, color: '#5b6a7c' },
      { dx: 20, dy: -6, r: 22, color: '#c28d6a' },
      { dx: 80, dy: 4, r: 26, color: '#d8b8a4' },
    ],
    dark: true,
    tabs: [
      { label: 'Home', icon: FrostedMediaIcons.BlobIcon },
      { label: 'My Apps', icon: FrostedMediaIcons.DotsIcon },
      { label: 'Timer', icon: FrostedMediaIcons.PlayIcon },
    ],
  },
  'glow-glass': {
    render: ({ onActionPress }) => (
      <GlowGlass
        onActionPress={onActionPress}
        actionIcon={<GlowGlassIcons.SpendIcon focused={false} color="#76777c" size={21.5} />}
      />
    ),
    background: '#1f1810',
    pattern: { kind: 'wood', light: '#2a1d12', dark: '#1b130f' },
    barHeight: 58.5,
    blobs: [{ dx: 30, dy: 0, r: 20, color: '#2b3f9e' }],
    dark: true,
    tabs: [
      { label: 'Home', icon: GlowGlassIcons.HomeIcon },
      { label: 'Markets', icon: GlowGlassIcons.MarketsIcon },
      { label: 'Trade', icon: GlowGlassIcons.TradeIcon },
      { label: 'Portfolio', icon: GlowGlassIcons.PortfolioIcon },
    ],
  },
  'top-notch': {
    render: () => <TopNotch fontFamily="Outfit_800ExtraBold" />,
    background: '#594adb',
    pattern: { kind: 'rings', color: '#6152e1', gap: 34, stroke: 15 },
    barHeight: 75,
    dark: true,
    tabs: [
      { label: 'Today', icon: TopNotchIcons.TodayIcon },
      { label: 'Discover', icon: TopNotchIcons.DiscoverIcon },
      { label: 'Sleep', icon: TopNotchIcons.SleepIcon },
      { label: 'Create', icon: TopNotchIcons.CreateIcon },
      { label: 'You', icon: TopNotchIcons.YouIcon },
    ],
  },
  'solid-dark': {
    render: () => <SolidDark />,
    background: '#e8e9ed',
    pattern: { kind: 'plus', color: '#d2d3d8', gap: 12.2, size: 2.6, stroke: 0.7 },
    barHeight: 45,
    tabs: [
      { label: 'Home', icon: SolidDarkIcons.HomeIcon },
      { label: 'Messages', icon: SolidDarkIcons.ChatIcon },
      { label: 'Create', icon: SolidDarkIcons.CreateIcon },
      { label: 'Console', icon: SolidDarkIcons.ConsoleIcon },
      { label: 'Profile', icon: SolidDarkIcons.ProfileIcon },
    ],
  },
  'outline-dark': {
    render: () => <OutlineDark />,
    // Blank Spaces: flat black screens.
    background: '#000000',
    pattern: { kind: 'dots', color: '#141414', gap: 9.6, r: 0.55 },
    initialTab: 1,
    barHeight: 80,
    dark: true,
    tabs: [
      { label: 'Apps', icon: OutlineDarkIcons.AppsIcon },
      { label: 'Lock', icon: OutlineDarkIcons.LockIcon },
      { label: 'Profile', icon: OutlineDarkIcons.PersonIcon },
    ],
  },
  'dark-capsule': {
    render: () => <DarkCapsule />,
    background: '#ece7e1',
    pattern: { kind: 'waveform', color: '#ddd6cc', gap: 4.6, width: 1.3 },
    initialTab: 3,
    barHeight: 62,
    tabs: [
      { label: 'Videos', icon: DarkCapsuleIcons.VideoIcon },
      { label: 'Search', icon: DarkCapsuleIcons.SearchIcon },
      { label: 'Create', icon: DarkCapsuleIcons.SparkNoteIcon },
      { label: 'Library', icon: DarkCapsuleIcons.LibraryIcon },
      { label: 'Profile', icon: DarkCapsuleIcons.AvatarIcon },
    ],
  },
  'light-icons': {
    render: () => <LightIcons />,
    // Amble: the bar sits straight on the app's near-black screen.
    background: '#0e0e0e',
    barHeight: 53,
    dark: true,
    tabs: [
      { label: 'Route', icon: LightIconsIcons.RouteIcon },
      { label: 'Search', icon: LightIconsIcons.SearchIcon },
      { label: 'Record', icon: LightIconsIcons.RecordIcon },
      { label: 'Chats', icon: LightIconsIcons.BubbleIcon },
      { label: 'Profile', icon: LightIconsIcons.PersonIcon },
    ],
  },
  'playful-tiles': {
    render: () => <PlayfulTiles />,
    background: '#57cc02',
    pattern: { kind: 'dots', color: '#4fbd00', gap: 26, r: 2.6, stagger: true },
    barHeight: 66,
    dark: true,
    tabs: [
      { label: 'Home', icon: PlayfulTilesIcons.BirdhouseIcon },
      { label: 'Rewards', icon: PlayfulTilesIcons.ChestIcon },
      { label: 'Leagues', icon: PlayfulTilesIcons.CupIcon },
      { label: 'Friends', icon: PlayfulTilesIcons.HeartChatIcon },
      { label: 'Practice', icon: PlayfulTilesIcons.BirdIcon },
      { label: 'More', icon: PlayfulTilesIcons.MoreIcon },
    ],
  },
  'sliding-capsule': {
    render: () => <SlidingCapsule />,
    // Wise: the glass pill floats over white content.
    background: '#ffffff',
    pattern: { kind: 'plus', color: '#efefef', gap: 12, size: 3, stroke: 0.9 },
    barHeight: 62.5,
    tabs: [
      { label: 'Home', icon: SlidingCapsuleIcons.HomeIcon },
      { label: 'Card', icon: SlidingCapsuleIcons.CardIcon },
      { label: 'Recipients', icon: SlidingCapsuleIcons.RecipientsIcon },
      { label: 'Payments', icon: SlidingCapsuleIcons.PaymentsIcon },
    ],
  },
  'labeled-plus': {
    render: ({ onActionPress }) => <LabeledPlus onActionPress={onActionPress} />,
    // ElevenLabs: photo cards scroll under the glass bar.
    background: '#fcfcfc',
    barHeight: 62,
    blobs: [
      { dx: -110, dy: -70, r: 60, color: '#c8dca0' },
      { dx: 115, dy: -65, r: 60, color: '#b6d4bf' },
    ],
    tabs: [
      { label: 'Home', icon: LabeledPlusIcons.HomeIcon },
      { label: 'Creator', icon: LabeledPlusIcons.CreatorIcon },
    ],
  },
  'mono-type': {
    render: () => <MonoType />,
    // CHANI: a warm light-grey page above the bar's black rule.
    background: '#f4f2f3',
    barHeight: 73,
    tabs: [
      { label: 'Home', icon: MonoTypeIcons.HouseIcon },
      { label: 'Grow', icon: MonoTypeIcons.CrystalIcon },
      { label: 'Charts', icon: MonoTypeIcons.WheelIcon },
      { label: 'Transits', icon: MonoTypeIcons.ClockIcon },
      { label: 'Audio', icon: MonoTypeIcons.HeadphonesIcon },
    ],
  },
  'split-search': {
    render: () => <SplitSearch />,
    // Apple Store: the bar floats over a #f2f2f7 grouped page; product photos scroll under the glass.
    background: '#f2f2f7',
    initialTab: 1,
    barHeight: 62,
    blobs: [
      { dx: -120, dy: -60, r: 55, color: '#e7c3d9' },
      { dx: 40, dy: -70, r: 45, color: '#d9dde6' },
      { dx: 150, dy: -40, r: 40, color: '#c9d6c4' },
    ],
    // A list to scroll, so the bar can be seen minimizing.
    extra: MinimizeList,
    tabs: [
      { label: 'For You', icon: SplitSearchIcons.ForYouIcon },
      { label: 'Products', icon: SplitSearchIcons.ProductsIcon },
      { label: 'Go Further', icon: SplitSearchIcons.GoFurtherIcon },
      { label: 'Bag', icon: SplitSearchIcons.BagIcon },
      { label: 'Search', icon: SplitSearchIcons.SearchIcon },
    ],
  },
  'material-pill': {
    render: () => <MaterialPill />,
    // Google Home: a white screen with off-white cards above the flat #f0f4f9 bar.
    background: '#ffffff',
    barHeight: 64,
    tabs: [
      { label: 'Home', icon: MaterialPillIcons.HomeIcon },
      { label: 'Activity', icon: MaterialPillIcons.ActivityIcon },
      { label: 'Automations', icon: MaterialPillIcons.AutomationsIcon },
    ],
  },
  'side-rail': {
    render: ({ onActionPress }) => (
      <SideRail onMenuPress={onActionPress} onActionPress={onActionPress} />
    ),
    // Google Drive on a tablet: the rail is the app's own #f0f4f9 chrome, with no divider
    // against the screens beside it. Phones get the same tabs as an 80 pt docked bar.
    background: '#f0f4f9',
    barHeight: 80,
    railWhenWide: true,
    tabs: [
      { label: 'Home', icon: SideRailIcons.HomeIcon },
      { label: 'Starred', icon: SideRailIcons.StarIcon },
      { label: 'Shared', icon: SideRailIcons.SharedIcon },
      { label: 'Files', icon: SideRailIcons.FolderIcon },
    ],
  },
  'search-dock': {
    // Pinterest's search results ("Emerald eyeshadow"). The feed is a white page of photo pins,
    // and photos scroll under the three white tiles and show in the gaps between them. Home
    // is the active tab (filled house) and the field shows the live query.
    render: () => <SearchDock query="Emerald eyeshadow" />,
    background: '#ffffff',
    initialTab: 0,
    barHeight: 55,
    // Photo pins behind the dock: mint eyeshadow at the left, dark hair and a grey wall at
    // the right.
    blobs: [
      { dx: -110, dy: -10, r: 70, color: '#a9c4a0' },
      { dx: -30, dy: 20, r: 45, color: '#8fae88' },
      { dx: 110, dy: -20, r: 60, color: '#2b2b2b' },
      { dx: 160, dy: 30, r: 40, color: '#b9b9b6' },
    ],
    // A list to scroll, so the dock can be seen sliding away and back.
    extra: MinimizeList,
    tabs: [
      { label: 'Home', icon: SearchDockIcons.HomeIcon },
      { label: 'Search', icon: SearchDockIcons.SearchIcon },
      { label: 'Profile', icon: SearchDockIcons.AvatarIcon },
    ],
  },
  'button-row': {
    render: () => <ButtonRow />,
    // Uber Eats: a white store page; food photos scroll under the row and fade into white.
    background: '#ffffff',
    initialTab: 0,
    barHeight: 49,
    // Warm food-photo colours behind the row, so the white fade can be seen.
    blobs: [
      { dx: -105, dy: -75, r: 62, color: '#d9a35b' },
      { dx: 125, dy: -70, r: 60, color: '#c4643a' },
    ],
    tabs: [
      { label: 'Home', icon: ButtonRowIcons.HomeIcon },
      { label: 'Pickup', icon: ButtonRowIcons.MapIcon },
      { label: 'Search', icon: ButtonRowIcons.SearchIcon },
      { label: 'Carts', icon: ButtonRowIcons.CartIcon },
      { label: 'Account', icon: ButtonRowIcons.AccountIcon },
    ],
  },
  'color-flood': {
    // Cash App: on the Pay tab (the second route) the whole screen and the bar are Cash green;
    // the other tabs fall back to white. The reference shows Pay active.
    render: ({ routes }) => <ColorFlood surfaces={{ [routes[1] ?? 't2']: colorFloodGreen }} />,
    background: colorFloodGreen,
    // Each screen is painted the colour the bar gives its tab: white, green, white.
    backgrounds: ['#ffffff', colorFloodGreen, '#ffffff'],
    initialTab: 1,
    barHeight: 50,
    tabs: [
      { label: 'Money', icon: ColorFloodIcons.MoneyIcon },
      { label: 'Pay', icon: ColorFloodIcons.PayIcon },
      { label: 'Activity', icon: ColorFloodIcons.ActivityIcon },
    ],
  },
  'accent-dark': {
    // Strava: Record opens a full-screen recorder, so it is the bar's action slot, not a tab.
    render: ({ onActionPress }) => (
      <AccentDark
        onActionPress={onActionPress}
        actionIcon={<AccentDarkIcons.RecordIcon focused={false} color="#ffffff" size={24} />}
      />
    ),
    // Strava's dark screens: flat #141414 above the one-step-lighter #212220 bar.
    background: '#141414',
    dark: true,
    initialTab: 0,
    // 49 pt of tabs plus the hairline on top.
    barHeight: 49.5,
    tabs: [
      { label: 'Home', icon: AccentDarkIcons.HomeIcon },
      { label: 'Maps', icon: AccentDarkIcons.MapsIcon },
      { label: 'Groups', icon: AccentDarkIcons.GroupsIcon },
      { label: 'You', icon: AccentDarkIcons.YouIcon },
    ],
  },
  'tile-plus': {
    render: ({ onActionPress }) => <TilePlus onActionPress={onActionPress} />,
    // Threads: a white feed of posts that stops cleanly at the bar's top edge (no hairline).
    background: '#ffffff',
    initialTab: 0,
    barHeight: 51,
    tabs: [
      { label: 'Home', icon: TilePlusIcons.HomeIcon },
      { label: 'Messages', icon: TilePlusIcons.MessagesIcon },
      { label: 'Activity', icon: TilePlusIcons.ActivityIcon },
      { label: 'Profile', icon: TilePlusIcons.ProfileIcon },
    ],
  },
  'offset-plus': {
    render: ({ onActionPress }) => <OffsetPlus onActionPress={onActionPress} />,
    // TikTok: the For You video (a dark, warm frame in the store shot) runs right down to the
    // bar's hard top edge.
    background: '#3c0e01',
    dark: true,
    initialTab: 0,
    barHeight: 49,
    tabs: [
      { label: 'Home', icon: OffsetPlusIcons.HomeIcon },
      { label: 'Friends', icon: OffsetPlusIcons.FriendsIcon },
      { label: 'Inbox', icon: OffsetPlusIcons.InboxIcon },
      { label: 'Profile', icon: OffsetPlusIcons.ProfileIcon },
    ],
  },
  'tinted-icons': {
    // Snapchat's Spotlight tab (fifth) turns the bar dark grey, as in the app.
    render: () => <TintedIcons surfaces={{ 4: tintedIconsDark }} />,
    // Snapchat Stories: a white page of story cards right above the solid black bar.
    background: '#ffffff',
    initialTab: 3,
    barHeight: 48,
    tabs: [
      { label: 'Map', icon: TintedIconsIcons.MapIcon },
      { label: 'Chat', icon: TintedIconsIcons.ChatIcon },
      { label: 'Camera', icon: TintedIconsIcons.CameraIcon },
      { label: 'Stories', icon: TintedIconsIcons.StoriesIcon },
      { label: 'Spotlight', icon: TintedIconsIcons.SpotlightIcon },
    ],
  },
  'badge-dock': {
    render: () => <BadgeDock />,
    // Reddit (dark): the feed is the same #171717 as the bar, so the bar doesn't stand out.
    background: '#171717',
    dark: true,
    initialTab: 0,
    barHeight: 49,
    tabs: [
      { label: 'Home', icon: BadgeDockIcons.HomeIcon },
      { label: 'Communities', icon: BadgeDockIcons.CommunitiesIcon },
      { label: 'Create', icon: BadgeDockIcons.CreateIcon },
      { label: 'Chat', icon: BadgeDockIcons.ChatIcon, badge: 2 },
      { label: 'Inbox', icon: BadgeDockIcons.InboxIcon, badge: 3 },
    ],
  },
  'cart-pill': {
    // The full row of the store shot: back disc, pill, purple cart disc with 2 items.
    render: ({ onActionPress }) => (
      <CartPill onBackPress={onActionPress} onCartPress={onActionPress} cartCount={2} />
    ),
    // Shop: a white product grid (shirts on light grey photo cards) scrolls under the frosted pill.
    background: '#ffffff',
    initialTab: 0,
    barHeight: 57,
    blobs: [
      { dx: -120, dy: -55, r: 55, color: '#c9aeb4' },
      { dx: 10, dy: -60, r: 50, color: '#b8946f' },
      { dx: 150, dy: -50, r: 45, color: '#3d4350' },
    ],
    tabs: [
      { label: 'Home', icon: CartPillIcons.HomeIcon },
      { label: 'Search', icon: CartPillIcons.SearchIcon },
      { label: 'Explore', icon: CartPillIcons.ExploreIcon },
      { label: 'Orders', icon: CartPillIcons.OrdersIcon },
    ],
  },
  'glass-badges': {
    render: ({ onActionPress }) => <GlassBadges onActionPress={onActionPress} />,
    // Telegram: a white chat list scrolls under the glass bar; a yellow avatar sits behind the
    // pill's left end.
    background: '#ffffff',
    initialTab: 2,
    barHeight: 62,
    blobs: [
      { dx: -160, dy: -30, r: 30, color: '#f2e36c' },
      { dx: 150, dy: -75, r: 28, color: '#8ab8f0' },
      { dx: -20, dy: -80, r: 26, color: '#e9b7a4' },
    ],
    tabs: [
      { label: 'Contacts', icon: GlassBadgesIcons.ContactsIcon },
      { label: 'Calls', icon: GlassBadgesIcons.CallsIcon },
      { label: 'Chats', icon: GlassBadgesIcons.ChatsIcon, badge: 8 },
      { label: 'Settings', icon: GlassBadgesIcons.SettingsIcon },
    ],
  },
  'section-sheet': {
    // No tab bar: the sections live in a sheet over a full-screen map. Each section's body is
    // a real list, so the sheet can be raised to half or full height and scrolled.
    render: ({ routes }) => (
      <SectionSheet
        sections={{
          [routes[0] ?? 'index']: <SectionRows title="Explore" />,
          [routes[1] ?? 't2']: <SectionRows title="Guides" />,
          [routes[2] ?? 't3']: <SectionRows title="Saved" />,
        }}
      />
    ),
    // A light topographic map stands in for the full-screen content behind the sheet.
    background: '#e8eee4',
    fullScreen: true,
    pattern: { kind: 'contours', color: '#cfd8c8' },
    initialTab: 0,
    barHeight: 76,
    tabs: [
      { label: 'Explore', icon: () => null },
      { label: 'Guides', icon: () => null },
      { label: 'Saved', icon: () => null },
    ],
  },
  'scrub-pill': {
    // Press and slide along the pill: the lens follows the finger, and lifting chooses.
    render: () => <ScrubPill />,
    background: '#eef1f6',
    pattern: { kind: 'grid', color: '#e2e7ef', gap: 24 },
    initialTab: 0,
    barHeight: 62,
    tabs: [
      { label: 'Home', icon: SoftPillIcons.HomeIcon },
      { label: 'Ideas', icon: SoftPillIcons.IdeasIcon },
      { label: 'Explore', icon: SoftPillIcons.ExploreIcon },
      { label: 'History', icon: SoftPillIcons.HistoryIcon },
      { label: 'Trends', icon: SoftPillIcons.TrendsIcon },
    ],
  },
  'composer-dock': {
    // A chat app: the composer over four icon tabs. Scrub the tabs (the screen previews the
    // tab under the finger), hold Projects, Code or Artifacts for recent items, and focus the
    // field to open the composer over the keyboard.
    render: ({ routes }) => <ComposerDockDemoBar routes={routes} />,
    panel: () => <ModelSheet />,
    screen: ComposerDockScreen,
    background: '#f8f8f6',
    fullScreen: true,
    initialTab: 0,
    barHeight: 106,
    tabs: [
      { label: 'Chat', icon: ComposerDockIcons.ChatIcon },
      { label: 'Projects', icon: ComposerDockIcons.ProjectsIcon },
      { label: 'Code', icon: ComposerDockIcons.CodeIcon },
      { label: 'Artifacts', icon: ComposerDockIcons.ArtifactsIcon },
    ],
  },
  'live-tabs': {
    // The Timer tab counts down and the Downloads tab fills a ring, both fed from outside
    // the bar by `useLiveTab` (LiveTabsFeed, declared once beside the navigator).
    render: () => <LiveTabs />,
    panel: ({ routes }) => <LiveTabsFeed timer={routes[1] ?? 't2'} download={routes[2] ?? 't3'} />,
    extra: LiveTabsControls,
    background: '#f6f5f3',
    initialTab: 0,
    barHeight: 56,
    tabs: [
      { label: 'Home', icon: MaterialPillIcons.HomeIcon },
      { label: 'Timer', icon: SoftPillIcons.HistoryIcon },
      { label: 'Downloads', icon: SideRailIcons.FolderIcon },
      { label: 'Profile', icon: LightIconsIcons.PersonIcon },
    ],
  },
  'mini-player': {
    // Paired with Soft Pill: the strip peeks out from behind the pill.
    render: () => <SoftPill />,
    panel: () => <MiniPlayerPanel />,
    extra: MiniPlayerControls,
    background: '#e5dfd4',
    pattern: { kind: 'stripes', light: '#f4efe7', dark: '#e1dace', gap: 8 },
    initialTab: 2,
    barHeight: 58.5,
    tabs: [
      { label: 'Home', icon: SoftPillIcons.HomeIcon },
      { label: 'Ideas', icon: SoftPillIcons.IdeasIcon },
      { label: 'Explore', icon: SoftPillIcons.ExploreIcon },
      { label: 'History', icon: SoftPillIcons.HistoryIcon },
      { label: 'Trends', icon: SoftPillIcons.TrendsIcon },
    ],
  },
  'context-tray': {
    // Paired with Glass Expand. The Plan tab's screen puts the tray in the bar's place.
    render: () => <GlassExpand />,
    extra: ContextTrayExtra,
    background: '#ebe9ff',
    barHeight: 82,
    tabs: [
      { label: 'Steps', icon: GlassExpandIcons.SneakerIcon },
      { label: 'Water', icon: GlassExpandIcons.DropIcon },
      { label: 'Plan', icon: GlassExpandIcons.ListSparkleIcon },
      { label: 'Settings', icon: GlassExpandIcons.HexNutIcon },
    ],
  },
  'quick-create': {
    // Paired with Labeled + Plus: tap + and the menu slides up from behind it.
    render: () => <QuickCreateBar />,
    panel: () => <QuickCreatePanel />,
    extra: QuickCreateControls,
    background: '#fcfcfc',
    barHeight: 62,
    blobs: [
      { dx: -110, dy: -70, r: 60, color: '#c8dca0' },
      { dx: 115, dy: -65, r: 60, color: '#b6d4bf' },
    ],
    tabs: [
      { label: 'Home', icon: LabeledPlusIcons.HomeIcon },
      { label: 'Creator', icon: LabeledPlusIcons.CreatorIcon },
    ],
  },
  'bar-sheet': {
    // Paired with Soft Pill: a comments sheet rises from the bottom edge, behind the pill, to
    // 60%; drag its header to full height, where the body scrolls.
    render: () => <SoftPill />,
    panel: () => <BarSheetPanel />,
    extra: BarSheetControls,
    background: '#e5dfd4',
    fullScreen: true,
    pattern: { kind: 'stripes', light: '#f4efe7', dark: '#e1dace', gap: 8 },
    initialTab: 2,
    barHeight: 58.5,
    tabs: [
      { label: 'Home', icon: SoftPillIcons.HomeIcon },
      { label: 'Ideas', icon: SoftPillIcons.IdeasIcon },
      { label: 'Explore', icon: SoftPillIcons.ExploreIcon },
      { label: 'History', icon: SoftPillIcons.HistoryIcon },
      { label: 'Trends', icon: SoftPillIcons.TrendsIcon },
    ],
  },
  'companion-chip': {
    // Paired with Split Search, which minimizes on scroll: the chip rides above the bar's end
    // and follows it as it shrinks, slides away with it for the keyboard, and a toast placed
    // with useTabBarInset() clears both.
    render: () => <SplitSearch />,
    panel: () => <CompanionChipPanel />,
    extra: CompanionChipExtra,
    hideOnKeyboard: true,
    background: '#f2f2f7',
    initialTab: 1,
    barHeight: 62,
    blobs: [
      { dx: -120, dy: -60, r: 55, color: '#e7c3d9' },
      { dx: 40, dy: -70, r: 45, color: '#d9dde6' },
      { dx: 150, dy: -40, r: 40, color: '#c9d6c4' },
    ],
    tabs: [
      { label: 'For You', icon: SplitSearchIcons.ForYouIcon },
      { label: 'Products', icon: SplitSearchIcons.ProductsIcon },
      { label: 'Go Further', icon: SplitSearchIcons.GoFurtherIcon },
      { label: 'Bag', icon: SplitSearchIcons.BagIcon },
      { label: 'Search', icon: SplitSearchIcons.SearchIcon },
    ],
  },
  'sub-tabs': {
    // A Soft Pill whose Library tab owns a drawer: long-press it (or use the screen-reader
    // action) and Albums, Artists and Songs slide up from behind it.
    render: () => <SubTabsBar />,
    panel: () => <SubTabsPanel />,
    extra: SubTabsNote,
    background: '#e5dfd4',
    pattern: { kind: 'stripes', light: '#f4efe7', dark: '#e1dace', gap: 8 },
    initialTab: 0,
    barHeight: 58.5,
    tabs: [
      { label: 'Home', icon: SoftPillIcons.HomeIcon },
      { label: 'Ideas', icon: SoftPillIcons.IdeasIcon },
      { label: 'Library', icon: SoftPillIcons.ExploreIcon },
      { label: 'History', icon: SoftPillIcons.HistoryIcon },
      { label: 'Trends', icon: SoftPillIcons.TrendsIcon },
    ],
  },
};

/** Route names of the six demo tab screens in src/app/designs/[id]/. */
export const TAB_ROUTES = ['index', 't2', 't3', 't4', 't5', 't6'] as const;

const CurrentDemo = createContext<Demo | undefined>(undefined);

/** Provided by the design layout; tab screens can't rely on route params (see demo-screen.tsx). */
export const CurrentDemoProvider = CurrentDemo;

export function useCurrentDemo(): Demo | undefined {
  return use(CurrentDemo);
}

/** Link to a design, opened on the tab the reference image shows as selected. */
export function designHref(id: string): Href {
  const route = TAB_ROUTES[demos[id]?.initialTab ?? 0];
  return (route === 'index' ? `/designs/${id}` : `/designs/${id}/${route}`) as Href;
}
