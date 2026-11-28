import type { ReactNode } from 'react';

/** Which renderer draws a menu. See `docs/designs/menu.md` §2. */
export type MenuRenderer = 'system' | 'glass' | 'panel';

/** What a caller may ask for: a renderer, or `'auto'` to let the menu decide. */
export type MenuRendererPreference = 'auto' | MenuRenderer;

/** Fields every selectable row carries, whatever its kind. */
export interface MenuEntryNode {
  /** Built from the row's path in the tree, e.g. `"2"` or `"4.1"`. Stable across renders. */
  id: string;
  title: string;
  description?: string;
  /** A React icon. The glass renderer draws it; the system renderer can't. */
  icon?: ReactNode;
  /** An SF Symbol, used by the system renderer. */
  systemImage?: string;
  destructive: boolean;
  disabled: boolean;
  /** Whether choosing the row closes the menu, with PanelUI's per-part default applied. */
  closeOnSelect: boolean;
}

export interface MenuItemNode extends MenuEntryNode {
  kind: 'item';
}

export interface MenuCheckboxNode extends MenuEntryNode {
  kind: 'checkbox';
  checked: boolean;
}

export interface MenuRadioNode extends MenuEntryNode {
  kind: 'radio';
  value: string;
  selected: boolean;
}

export interface MenuRadioGroupNode {
  kind: 'radio-group';
  id: string;
  value: string | undefined;
  children: MenuRadioNode[];
}

export interface MenuLabelNode {
  kind: 'label';
  id: string;
  title: string;
}

export interface MenuSeparatorNode {
  kind: 'separator';
  id: string;
}

export interface MenuSubNode {
  kind: 'sub';
  id: string;
  title: string;
  icon?: ReactNode;
  systemImage?: string;
  disabled: boolean;
  children: MenuNode[];
}

export type MenuNode =
  | MenuItemNode
  | MenuCheckboxNode
  | MenuRadioGroupNode
  | MenuLabelNode
  | MenuSeparatorNode
  | MenuSubNode;

/** What choosing a row does. Owned in JS so no renderer calls into PanelUI's components. */
export interface MenuAction {
  run: () => void;
  close: boolean;
}

/**
 * Props and parts a renderer may not draw.
 *
 * - `shortcut`, `trailing`, `background`, `on-press`: ignored by the system and glass renderers.
 * - `react-icon`: a React `icon` with no `systemImage`; ignored by the system renderer.
 */
export type MenuIgnoredFeature = 'shortcut' | 'trailing' | 'background' | 'on-press' | 'react-icon';

/**
 * Parts that only the PanelUI renderer can draw. A menu that uses one of these is drawn by PanelUI
 * rather than losing rows.
 *
 * - `submenu`: the glass renderer has no submenus.
 * - `rich-label`: a row whose label is not plain text.
 * - `unknown`: a child that isn't one of the menu's parts, such as a custom wrapper component.
 */
export type MenuPanelOnlyFeature = 'submenu' | 'rich-label' | 'unknown';

export interface MenuModel {
  nodes: MenuNode[];
  actions: Map<string, MenuAction>;
  ignored: Set<MenuIgnoredFeature>;
  panelOnly: Set<MenuPanelOnlyFeature>;
  /** Names of children the walker didn't recognise, for the development warning. */
  unknown: string[];
}
