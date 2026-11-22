/**
 * Composer Dock's colours, shared types and constants, used by its other files.
 * Part of the Composer Dock design (composer-dock.tsx). Built on tabcn: https://github.com/VanitasCaesar1/tabcn
 */
import type { ComponentRef, ReactNode, RefObject } from 'react';
import type { View } from 'react-native';
import { Easing, FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { tabcnTiming } from 'react-native-tabcn';

export const defaultColors = {
  /** The dock, the same as the screen behind it. */
  background: '#f8f8f6',
  /** Tints the Liquid Glass surfaces so they take the screen's tone, as in the app. */
  glassTint: 'rgba(248, 248, 246, 0.72)',
  /** The composer's pill and card: a faint lift off the screen colour. */
  composer: 'rgba(255, 255, 255, 0.6)',
  /** Hairline edge of the composer and the menus. */
  border: 'rgba(0, 0, 0, 0.07)',
  /** Text, the active tab's icon, and the voice and Send buttons. */
  foreground: '#1f1e1d',
  /** The other tabs' icons (3.5:1 on the default screen). */
  muted: '#858480',
  /** The text field's placeholder. */
  placeholder: '#9b9a96',
  /** The model chip. */
  control: 'rgba(0, 0, 0, 0.05)',
  /** The dictation glyph. */
  dictate: '#5f5e5a',
  /** The voice and Send buttons' glyphs. */
  onForeground: '#ffffff',
  /** The menus' cards. */
  menu: '#ffffff',
  /** Icons in the menus. */
  menuIcon: '#6f6e69',
  /** A menu row while pressed. */
  menuPressed: 'rgba(0, 0, 0, 0.045)',
  /** The dot on an unread item. */
  unread: '#2f7df6',
  /** Laid over the screen while a hold menu is open. */
  scrim: 'rgba(248, 248, 246, 0.74)',
  /** The capsule behind a held tab (without glass). */
  held: 'rgba(0, 0, 0, 0.06)',
  /** Tints the held tab's glass capsule, a shade darker than the screen. */
  heldGlassTint: 'rgba(222, 221, 216, 0.6)',
  /** The pill naming the tab under the finger. */
  label: '#1f1e1d',
  /** Its text. */
  labelText: '#ffffff',
};

export type ComposerDockColors = typeof defaultColors;

export const defaultLabels = {
  /** The + button, which opens the attachment menu. */
  addFiles: 'Add files and more',
  /** The dictation button. */
  dictate: 'Dictate',
  /** The round button while the field has text. */
  send: 'Send',
  /** The same button while the field is empty. */
  voiceMode: 'Voice mode',
  /** The model chip, given the model's name. */
  model: (model: string) => `Model, ${model}`,
  /** The screen-reader action on a tab with a hold menu. */
  showRecent: 'Show recent',
  /** The hold menu, given the held tab's label (undefined while its card closes). */
  recent: (tab: string | undefined) => (tab ? `${tab}, recent` : 'Recent'),
  /** The attachment menu. */
  addToMessage: 'Add to message',
  /** The area round an open menu, which closes it. */
  closeMenu: 'Close menu',
  /** A menu row marked unread, given its label. */
  unread: (label: string) => `${label}, unread`,
};

/** What Composer Dock's buttons and menus are called, for translation. */
export type ComposerDockLabels = typeof defaultLabels;

/** An icon in a menu row. */
export type ComposerDockIcon = (props: { color: string; size: number }) => ReactNode;

export interface ComposerDockMenuItem {
  /** Stable key for the row. */
  key: string;
  /** The row's text. */
  label: string;
  /** Drawn before the label. */
  icon?: ComposerDockIcon;
  /** The icon's colour (a project's own colour). Default `colors.menuIcon`. */
  color?: string;
  /** Shows a blue dot at the end of the row. */
  unread?: boolean;
  /** Runs when the row is chosen; the menu closes first. */
  onPress: () => void;
}

export interface ComposerDockMenu {
  /** Recent items, most recent last (the row nearest the tab). */
  items: readonly ComposerDockMenuItem[];
  /** A last row with a filled + ("New project"). Leave out for no row. */
  create?: { label: string; onPress: () => void };
}

export interface ComposerDockAttachment {
  /** Stable key for the row. */
  key: string;
  /** The row's text ("Camera"). */
  label: string;
  /** Drawn before the label. */
  icon?: ComposerDockIcon;
  /** Runs when the row is chosen; the menu closes first. */
  onPress: () => void;
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Height of the tab row, without the home indicator's inset. */
export const TAB_ROW = 48;
/** Between the composer and the tabs. */
export const COMPOSER_GAP = 10;
/** Between the composer and the keyboard. */
export const KEYBOARD_GAP = 6;
export const SIDE = 16;
/** The app's glass: the transparent kind, so surfaces take the screen's tone. */
export const GLASS_STYLE = 'regular';
/** Pressable's long-press delay: holding a tab this long opens its menu. */
export const LONG_PRESS_MS = 500;
/** Each tab's width; the row is centred. */
export const TAB_WIDTH = 80;
export const HOLD_CARD_WIDTH = 296;
export const ATTACH_CARD_WIDTH = 168;

export const fade = { ...tabcnTiming, reduceMotion: ReduceMotion.System };
export const glide = LinearTransition.duration(240)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
export const appear = FadeIn.duration(160).reduceMotion(ReduceMotion.System);
export const disappear = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

export type ViewRef = RefObject<ComponentRef<typeof View> | null>;

export function measure(ref: ViewRef, then: (frame: Frame) => void) {
  ref.current?.measureInWindow((x, y, width, height) => then({ x, y, width, height }));
}
