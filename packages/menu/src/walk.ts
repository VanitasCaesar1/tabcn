import type { ReactNode } from 'react';
import type {
  MenuAction,
  MenuEntryNode,
  MenuModel,
  MenuNode,
  MenuRadioNode,
  MenuSubNode,
} from './model';
import { flatten, type MenuElement, nameOf, partOf } from './parts';

/**
 * PanelUI's default for `closeOnSelect`, per part. Copied, because the system and glass renderers
 * run the rows' behaviour themselves rather than through PanelUI's components.
 * `__tests__/panelui-drift.test.ts` fails if PanelUI changes them.
 */
export const CLOSE_ON_SELECT_DEFAULTS = {
  item: true,
  checkbox: false,
  radio: true,
} as const;

type Props = Record<string, unknown>;

/** A row's label as plain text, or `null` when it is anything else. */
export function textOf(children: unknown): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    let text = '';
    for (const child of children) {
      if (child === null || child === undefined || typeof child === 'boolean') continue;
      const part = textOf(child);
      if (part === null) return null;
      text += part;
    }
    return text;
  }
  return null;
}

function call(fn: unknown, ...args: unknown[]) {
  if (typeof fn === 'function') (fn as (...a: unknown[]) => void)(...args);
}

const noop = () => {};

/**
 * Reads the children of `Menu.Content` into a model the renderers draw, and an action table that
 * runs what each row does.
 */
export function walkMenu(children: ReactNode): MenuModel {
  const model: MenuModel = {
    nodes: [],
    actions: new Map(),
    ignored: new Set(),
    panelOnly: new Set(),
    unknown: [],
  };
  model.nodes = walkList(flatten(children), '', model);
  return model;
}

function walkList(elements: MenuElement[], prefix: string, model: MenuModel): MenuNode[] {
  const nodes: MenuNode[] = [];
  elements.forEach((element, index) => {
    const id = `${prefix}${index}`;
    const props = element.props as Props;
    const part = partOf(element.type);
    switch (part) {
      case 'item': {
        const node = entry(props, id, CLOSE_ON_SELECT_DEFAULTS.item, model);
        if (!node) break;
        nodes.push({ ...node, kind: 'item' });
        action(model, node, () => call(props.onSelect));
        break;
      }
      case 'checkbox': {
        const node = entry(props, id, CLOSE_ON_SELECT_DEFAULTS.checkbox, model);
        if (!node) break;
        const checked = props.checked === true;
        nodes.push({ ...node, kind: 'checkbox', checked });
        action(model, node, () => {
          call(props.onCheckedChange, !checked);
          call(props.onSelect);
        });
        break;
      }
      case 'radio-group': {
        const value = typeof props.value === 'string' ? props.value : undefined;
        const radios: MenuRadioNode[] = [];
        flatten(props.children as ReactNode).forEach((child, radioIndex) => {
          const radioProps = child.props as Props;
          if (partOf(child.type) !== 'radio') {
            unknown(model, child);
            return;
          }
          const node = entry(
            radioProps,
            `${id}.${radioIndex}`,
            CLOSE_ON_SELECT_DEFAULTS.radio,
            model,
          );
          if (!node) return;
          const radioValue = String(radioProps.value ?? '');
          radios.push({
            ...node,
            kind: 'radio',
            value: radioValue,
            selected: radioValue === value,
          });
          action(model, node, () => {
            call(props.onValueChange, radioValue);
            call(radioProps.onSelect);
          });
        });
        nodes.push({ kind: 'radio-group', id, value, children: radios });
        break;
      }
      case 'label': {
        const title = textOf(props.children);
        if (title === null) {
          model.panelOnly.add('rich-label');
          break;
        }
        nodes.push({ kind: 'label', id, title });
        break;
      }
      case 'separator':
        nodes.push({ kind: 'separator', id });
        break;
      case 'sub': {
        const sub = walkSub(flatten(props.children as ReactNode), id, model);
        if (sub) nodes.push(sub);
        break;
      }
      case 'background':
        model.ignored.add('background');
        break;
      case 'preview':
        // Drawn by the context menu itself, not as a row.
        break;
      default:
        unknown(model, element);
    }
  });
  return nodes;
}

function walkSub(elements: MenuElement[], id: string, model: MenuModel): MenuSubNode | null {
  model.panelOnly.add('submenu');
  const trigger = elements.find((element) => partOf(element.type) === 'sub-trigger');
  const content = elements.find((element) => partOf(element.type) === 'sub-content');
  for (const element of elements) {
    const part = partOf(element.type);
    if (part !== 'sub-trigger' && part !== 'sub-content') unknown(model, element);
  }
  if (!trigger) return null;
  const props = trigger.props as Props;
  const title = textOf(props.children);
  if (title === null) {
    model.panelOnly.add('rich-label');
    return null;
  }
  const systemImage = typeof props.systemImage === 'string' ? props.systemImage : undefined;
  if (props.icon && !systemImage) model.ignored.add('react-icon');
  return {
    kind: 'sub',
    id,
    title,
    icon: props.icon as ReactNode,
    systemImage,
    disabled: props.disabled === true,
    children: content
      ? walkList(flatten((content.props as Props).children as ReactNode), `${id}.`, model)
      : [],
  };
}

function entry(
  props: Props,
  id: string,
  defaultClose: boolean,
  model: MenuModel,
): MenuEntryNode | null {
  const title = textOf(props.children);
  if (title === null) {
    model.panelOnly.add('rich-label');
    return null;
  }
  if (props.shortcut) model.ignored.add('shortcut');
  if (props.trailing) model.ignored.add('trailing');
  if (props.onPress) model.ignored.add('on-press');
  const systemImage = typeof props.systemImage === 'string' ? props.systemImage : undefined;
  if (props.icon && !systemImage) model.ignored.add('react-icon');
  return {
    id,
    title,
    description: typeof props.description === 'string' ? props.description : undefined,
    icon: props.icon as ReactNode,
    systemImage,
    destructive: props.variant === 'destructive',
    disabled: props.disabled === true,
    closeOnSelect: typeof props.closeOnSelect === 'boolean' ? props.closeOnSelect : defaultClose,
  };
}

function action(model: MenuModel, node: MenuEntryNode, run: () => void) {
  const entryAction: MenuAction = { run: node.disabled ? noop : run, close: node.closeOnSelect };
  model.actions.set(node.id, entryAction);
}

function unknown(model: MenuModel, element: MenuElement) {
  model.panelOnly.add('unknown');
  model.unknown.push(nameOf(element.type));
}
