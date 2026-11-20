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
import * as OutlineDarkIcons from '@registry/outline-dark/icons';
import { OutlineDark } from '@registry/outline-dark/outline-dark';
import * as PlayfulTilesIcons from '@registry/playful-tiles/icons';
import { PlayfulTiles } from '@registry/playful-tiles/playful-tiles';
import { SegmentSearch } from '@registry/segment-search/segment-search';
import * as SlidingCapsuleIcons from '@registry/sliding-capsule/icons';
import { SlidingCapsule } from '@registry/sliding-capsule/sliding-capsule';
import * as SoftPillIcons from '@registry/soft-pill/icons';
import { SoftPill } from '@registry/soft-pill/soft-pill';
import * as SolidDarkIcons from '@registry/solid-dark/icons';
import { SolidDark } from '@registry/solid-dark/solid-dark';
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
  'glass-expand': {
    render: () => <GlassExpand />,
    background: '#3324f1',
    pattern: { kind: 'rings', color: '#4133f9', gap: 9.6, stroke: 0.8 },
    initialTab: 2,
    barHeight: 69,
    dark: true,
    tabs: [
      { label: 'Run', icon: GlassExpandIcons.SneakerIcon },
      { label: 'Hydrate', icon: GlassExpandIcons.DropIcon },
      { label: 'Plan', icon: GlassExpandIcons.SparkleIcon },
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
        actionIcon={<GlowGlassIcons.SpendIcon focused={false} color="#9a9aa6" size={28} />}
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
    background: '#f1f1ef',
    pattern: { kind: 'dots', color: '#d9d9d7', gap: 9.6, r: 0.55 },
    barHeight: 46,
    tabs: [
      { label: 'Apps', icon: OutlineDarkIcons.AppsIcon },
      { label: 'Vault', icon: OutlineDarkIcons.LockIcon },
      { label: 'Stats', icon: OutlineDarkIcons.StatsIcon },
      { label: 'Account', icon: OutlineDarkIcons.PersonIcon },
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
    background: '#cdeb3e',
    pattern: { kind: 'contours', color: '#bfdd30' },
    initialTab: 3,
    barHeight: 55,
    tabs: [
      { label: 'Hooks', icon: LightIconsIcons.HookIcon },
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
    background: '#173300',
    pattern: { kind: 'plus', color: '#25450f', gap: 12, size: 3, stroke: 0.9 },
    barHeight: 58.5,
    dark: true,
    tabs: [
      { label: 'Home', icon: SlidingCapsuleIcons.HomeIcon },
      { label: 'Cards', icon: SlidingCapsuleIcons.CardsIcon },
      { label: 'Recipients', icon: SlidingCapsuleIcons.RecipientsIcon },
      { label: 'Payments', icon: SlidingCapsuleIcons.PaymentsIcon },
    ],
  },
  'labeled-plus': {
    render: ({ onActionPress }) => <LabeledPlus onActionPress={onActionPress} />,
    background: '#0e0e0e',
    pattern: { kind: 'waves', color: '#1c1c1c', gap: 9.6, amp: 1.2, wavelength: 18 },
    barHeight: 58.5,
    dark: true,
    tabs: [
      { label: 'Home', icon: LabeledPlusIcons.HomeIcon },
      { label: 'Creator', icon: LabeledPlusIcons.CreatorIcon },
      { label: 'Explore', icon: LabeledPlusIcons.ExploreIcon },
      { label: 'Templates', icon: LabeledPlusIcons.TemplatesIcon },
    ],
  },
  'mono-type': {
    render: () => <MonoType />,
    background: '#2d0f2b',
    pattern: { kind: 'dottedRings', color: '#4a2547', gap: 48, dot: 1.4 },
    barHeight: 54,
    dark: true,
    tabs: [
      { label: 'Home', icon: MonoTypeIcons.HouseIcon },
      { label: 'Grow', icon: MonoTypeIcons.CrystalIcon },
      { label: 'Me', icon: MonoTypeIcons.WheelIcon },
      { label: 'Transits', icon: MonoTypeIcons.ClockIcon },
      { label: 'Listen', icon: MonoTypeIcons.HeadphonesIcon },
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
