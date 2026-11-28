import {
  ContextMenu as PanelContextMenu,
  type ContextMenuContentProps as PanelContextMenuContentProps,
  type ContextMenuItemProps as PanelContextMenuItemProps,
  type ContextMenuTriggerProps as PanelContextMenuTriggerProps,
} from 'panelui-native/components/context-menu';
import {
  Menu as PanelMenu,
  type MenuCheckboxItemProps as PanelMenuCheckboxItemProps,
  type MenuContentProps as PanelMenuContentProps,
  type MenuItemProps as PanelMenuItemProps,
  type MenuRadioItemProps as PanelMenuRadioItemProps,
  type MenuSubTriggerProps as PanelMenuSubTriggerProps,
  type MenuTriggerProps as PanelMenuTriggerProps,
} from 'panelui-native/components/menu';
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

/** A child element, with its props left open for the walker to read. */
export type MenuElement = ReactElement<Record<string, unknown>>;

/** The role a child plays inside a menu, read by the walker. */
export type PartKind =
  | 'trigger'
  | 'content'
  | 'item'
  | 'checkbox'
  | 'radio-group'
  | 'radio'
  | 'label'
  | 'separator'
  | 'sub'
  | 'sub-trigger'
  | 'sub-content'
  | 'background'
  | 'preview';

type Tagged<P> = ((props: P) => ReactNode) & { menuPart: PartKind; displayName: string };

function tagged<P>(part: PartKind, displayName: string, render: (props: P) => ReactNode) {
  const component = render as Tagged<P>;
  component.menuPart = part;
  component.displayName = displayName;
  return component;
}

/** Drops this package's own props before handing the rest to PanelUI. */
function forPanel<T extends { systemImage?: string; glass?: unknown }>(props: T): T {
  const rest = { ...props };
  delete rest.systemImage;
  delete rest.glass;
  return rest;
}

/** Options for the glass renderer (Android 13+). Ignored by the others. */
export interface MenuGlassOptions {
  /** Draw the trigger itself as glass that the menu grows out of. Off by default. */
  trigger?: boolean;
  /** `'press'` grows the menu from the finger instead of the trigger's middle. */
  morphOrigin?: 'trigger' | 'press';
  /** Frost behind the open menu, in dp. Default 16. */
  blur?: number;
  /** Colour laid over the glass. */
  tintColor?: string;
  /** Strength of the tint. Default 0.7 in dark mode, 0.5 in light. */
  tintOpacity?: number;
  /** Multiplies the stretch toward the finger and the wobble back. Default 1. */
  jelly?: number;
  /** Multiplies the speed of all motion. Default 1. */
  speed?: number;
}

export interface MenuItemProps extends PanelMenuItemProps {
  /** An SF Symbol for the system renderer (iOS), which can't draw a React `icon`. */
  systemImage?: string;
}
export interface MenuCheckboxItemProps extends PanelMenuCheckboxItemProps {
  systemImage?: string;
}
export interface MenuRadioItemProps extends PanelMenuRadioItemProps {
  systemImage?: string;
}
export interface MenuSubTriggerProps extends PanelMenuSubTriggerProps {
  systemImage?: string;
}
export type MenuTriggerProps = PanelMenuTriggerProps;
export interface MenuContentProps extends PanelMenuContentProps {
  glass?: MenuGlassOptions;
}
export interface ContextMenuItemProps extends PanelContextMenuItemProps {
  systemImage?: string;
}
export type ContextMenuTriggerProps = PanelContextMenuTriggerProps;
export type ContextMenuContentProps = PanelContextMenuContentProps;

export const MenuTrigger = tagged<MenuTriggerProps>('trigger', 'Menu.Trigger', (props) => (
  <PanelMenu.Trigger {...props} />
));
export const MenuContent = tagged<MenuContentProps>('content', 'Menu.Content', (props) => (
  <PanelMenu.Content {...forPanel(props)} />
));
export const MenuItem = tagged<MenuItemProps>('item', 'Menu.Item', (props) => (
  <PanelMenu.Item {...forPanel(props)} />
));
export const MenuCheckboxItem = tagged<MenuCheckboxItemProps>(
  'checkbox',
  'Menu.CheckboxItem',
  (props) => <PanelMenu.CheckboxItem {...forPanel(props)} />,
);
export const MenuRadioItem = tagged<MenuRadioItemProps>('radio', 'Menu.RadioItem', (props) => (
  <PanelMenu.RadioItem {...forPanel(props)} />
));
export const MenuSubTrigger = tagged<MenuSubTriggerProps>(
  'sub-trigger',
  'Menu.SubTrigger',
  (props) => <PanelMenu.SubTrigger {...forPanel(props)} />,
);
export const ContextMenuTrigger = tagged<ContextMenuTriggerProps>(
  'trigger',
  'ContextMenu.Trigger',
  (props) => <PanelContextMenu.Trigger {...props} />,
);
export const ContextMenuContent = tagged<ContextMenuContentProps>(
  'content',
  'ContextMenu.Content',
  (props) => <PanelContextMenu.Content {...props} />,
);
export const ContextMenuItem = tagged<ContextMenuItemProps>('item', 'ContextMenu.Item', (props) => (
  <PanelContextMenu.Item {...forPanel(props)} />
));
export const ContextMenuCheckboxItem = tagged<MenuCheckboxItemProps>(
  'checkbox',
  'ContextMenu.CheckboxItem',
  (props) => <PanelContextMenu.CheckboxItem {...forPanel(props)} />,
);

/**
 * PanelUI's own parts, recognised as they are. The parts that need no extra prop are PanelUI's
 * components themselves, so PanelUI's own checks by component identity (`Menu.Background`,
 * `ContextMenu.Preview`) keep working, and a tree written for PanelUI works after changing the
 * import.
 */
const PANEL_PARTS = new Map<unknown, PartKind>([
  [PanelMenu.Trigger, 'trigger'],
  [PanelMenu.Content, 'content'],
  [PanelMenu.Item, 'item'],
  [PanelMenu.CheckboxItem, 'checkbox'],
  [PanelMenu.RadioGroup, 'radio-group'],
  [PanelMenu.RadioItem, 'radio'],
  [PanelMenu.Label, 'label'],
  [PanelMenu.Separator, 'separator'],
  [PanelMenu.Sub, 'sub'],
  [PanelMenu.SubTrigger, 'sub-trigger'],
  [PanelMenu.SubContent, 'sub-content'],
  [PanelMenu.Background, 'background'],
  [PanelContextMenu.Trigger, 'trigger'],
  [PanelContextMenu.Content, 'content'],
  [PanelContextMenu.Item, 'item'],
  [PanelContextMenu.CheckboxItem, 'checkbox'],
  [PanelContextMenu.Preview, 'preview'],
]);

export function partOf(type: unknown): PartKind | undefined {
  if ((typeof type === 'function' || typeof type === 'object') && type !== null) {
    const part = (type as { menuPart?: PartKind }).menuPart;
    if (part) return part;
  }
  return PANEL_PARTS.get(type);
}

/** A readable name for a child the walker doesn't recognise. */
export function nameOf(type: unknown): string {
  if (typeof type === 'string') return type;
  if ((typeof type === 'function' || typeof type === 'object') && type !== null) {
    const named = type as { displayName?: string; name?: string };
    return named.displayName ?? named.name ?? 'Anonymous';
  }
  return String(type);
}

/** Children as a flat list of elements, with fragments opened and text dropped. */
export function flatten(children: ReactNode): MenuElement[] {
  const out: MenuElement[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (child.type === Fragment) {
      out.push(...flatten(child.props.children as ReactNode));
    } else {
      out.push(child);
    }
  }
  return out;
}

/** The menu's top-level trigger and content, wherever they sit among the root's children. */
export function findParts(children: ReactNode): {
  trigger?: MenuElement;
  content?: MenuElement;
} {
  let trigger: MenuElement | undefined;
  let content: MenuElement | undefined;
  for (const element of flatten(children)) {
    const part = partOf(element.type);
    if (part === 'trigger' && !trigger) trigger = element;
    if (part === 'content' && !content) content = element;
  }
  return { trigger, content };
}

export { PanelContextMenu, PanelMenu };
