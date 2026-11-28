import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { MenuEntryNode, MenuNode } from './model';

/** One row as the glass module's `items` prop takes it (`GlassMenuItemRecord.kt`). */
export interface GlassItem {
  id: string;
  title: string;
  subtitle?: string;
  iconSlot?: number;
  checked?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  keepOpen?: boolean;
  separator?: boolean;
  heading?: boolean;
}

/** The glass module's own row colours (rit3zh's `MENU_ICON_COLORS`), so icons match the text. */
export const GLASS_ICON_COLORS = {
  dark: { base: 'rgba(255, 255, 255, 0.96)', destructive: '#FF5254' },
  light: { base: 'rgba(0, 0, 0, 0.92)', destructive: '#DC1E30' },
} as const;

/**
 * Turns the model into the glass module's rows. React icons go into `icons`, in slot order; the
 * native side draws each slot's view into its row. An icon without its own `color` is given the
 * row's text colour, so a destructive row's icon turns red with its label.
 *
 * Submenus never reach here: a menu with one is drawn by PanelUI.
 */
export function toGlassItems(
  nodes: MenuNode[],
  scheme: 'light' | 'dark',
): { items: GlassItem[]; icons: ReactNode[] } {
  const items: GlassItem[] = [];
  const icons: ReactNode[] = [];
  const colors = GLASS_ICON_COLORS[scheme];

  const row = (node: MenuEntryNode, checked?: boolean): GlassItem => {
    const item: GlassItem = {
      id: node.id,
      title: node.title,
      subtitle: node.description,
      destructive: node.destructive || undefined,
      disabled: node.disabled || undefined,
      keepOpen: !node.closeOnSelect || undefined,
      checked,
    };
    if (node.icon) {
      icons.push(tint(node.icon, node.destructive ? colors.destructive : colors.base));
      item.iconSlot = icons.length - 1;
    }
    return item;
  };

  for (const node of nodes) {
    switch (node.kind) {
      case 'item':
        items.push(row(node));
        break;
      case 'checkbox':
        items.push(row(node, node.checked));
        break;
      case 'radio-group':
        for (const radio of node.children) items.push(row(radio, radio.selected));
        break;
      case 'label':
        items.push({ id: node.id, title: node.title, heading: true });
        break;
      case 'separator':
        items.push({ id: node.id, title: '', separator: true });
        break;
      case 'sub':
        break;
    }
  }
  return { items, icons };
}

function tint(icon: ReactNode, color: string): ReactNode {
  if (!isValidElement(icon)) return icon;
  const element = icon as ReactElement<{ color?: string }>;
  if (element.props.color !== undefined) return element;
  return cloneElement(element, { color });
}
