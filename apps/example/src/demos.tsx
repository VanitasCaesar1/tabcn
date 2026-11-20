import { CenterCta } from '@registry/center-cta/center-cta';
import * as CenterCtaIcons from '@registry/center-cta/icons';
import { ChipRail } from '@registry/chip-rail/chip-rail';
import * as ChipRailIcons from '@registry/chip-rail/icons';
import { DarkCapsule } from '@registry/dark-capsule/dark-capsule';
import * as DarkCapsuleIcons from '@registry/dark-capsule/icons';
import { FrostedMedia } from '@registry/frosted-media/frosted-media';
import * as FrostedMediaIcons from '@registry/frosted-media/icons';
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
import * as MonoTypeIcons from '@registry/mono-type/icons';
import { MonoType } from '@registry/mono-type/mono-type';
import * as OrbsIcons from '@registry/orbs/icons';
import { Orbs } from '@registry/orbs/orbs';
import * as OutlineDarkIcons from '@registry/outline-dark/icons';
import { OutlineDark } from '@registry/outline-dark/outline-dark';
import * as PillPlusIcons from '@registry/pill-plus/icons';
import { PillPlus } from '@registry/pill-plus/pill-plus';
import * as PlayfulTilesIcons from '@registry/playful-tiles/icons';
import { PlayfulTiles } from '@registry/playful-tiles/playful-tiles';
import { SegmentSearch } from '@registry/segment-search/segment-search';
import * as SlidingCapsuleIcons from '@registry/sliding-capsule/icons';
import { SlidingCapsule } from '@registry/sliding-capsule/sliding-capsule';
import * as SoftPillIcons from '@registry/soft-pill/icons';
import { SoftPill } from '@registry/soft-pill/soft-pill';
import * as SolidDarkIcons from '@registry/solid-dark/icons';
import { SolidDark } from '@registry/solid-dark/solid-dark';
import * as StickerTilesIcons from '@registry/sticker-tiles/icons';
import { StickerTiles } from '@registry/sticker-tiles/sticker-tiles';
import * as TopNotchIcons from '@registry/top-notch/icons';
import { TopNotch } from '@registry/top-notch/top-notch';
import type { Href } from 'expo-router';
import { createContext, type ReactElement, type ReactNode, use } from 'react';
import type { TabIconProps } from 'tabcn';

import type { PatternSpec } from '@/pattern';

export interface DemoContext {
  onActionPress: () => void;
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
}

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
