/**
 * The system renderer: Apple's menu through `@expo/ui`.
 *
 * The mapping follows `@expo/ui`'s own `MenuView` (`community/menu/MenuView.ios.tsx`) and PanelUI's
 * `Fab` native path (`components/fab/index.tsx`): the trigger goes through the menu's label slot,
 * so it stays the caller's own control, and the open state is read from the rows appearing and
 * disappearing, because SwiftUI owns it and reports nothing else.
 */

import { Children, type ComponentProps, type ReactElement, type ReactNode, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { MenuAction, MenuEntryNode, MenuNode } from '../model';
import { flatten, partOf } from '../parts';
import { warnOnce } from '../resolve';
import { useMenuScheme } from '../scheme';
import type { RenderMenuProps } from './types';

type SwiftUI = typeof import('@expo/ui/swift-ui');
type Modifiers = typeof import('@expo/ui/swift-ui/modifiers');
type SFSymbol = NonNullable<ComponentProps<SwiftUI['Button']>['systemImage']>;

let swift: { ui: SwiftUI; mods: Modifiers } | null | undefined;

function load() {
  if (swift !== undefined) return swift;
  try {
    // Feature-checked rather than trusted: an older @expo/ui may lack a part, and a missing
    // part should mean PanelUI's menu, not a crash.
    const ui = require('@expo/ui/swift-ui') as Partial<SwiftUI>;
    const mods = require('@expo/ui/swift-ui/modifiers') as Modifiers;
    swift =
      ui.Host && ui.RNHostView && ui.Menu && ui.Button && ui.ContextMenu
        ? { ui: ui as SwiftUI, mods }
        : null;
  } catch {
    swift = null;
  }
  return swift;
}

export function systemAvailable(): boolean {
  return load() !== null;
}

/** Reports open and close once each, however many rows say so. */
function useOpenReport(onOpenChange: ((open: boolean) => void) | undefined) {
  const open = useRef(false);
  const callback = useRef(onOpenChange);
  callback.current = onOpenChange;
  return useRef({
    appear: () => {
      if (open.current) return;
      open.current = true;
      callback.current?.(true);
    },
    disappear: () => {
      if (!open.current) return;
      open.current = false;
      callback.current?.(false);
    },
  }).current;
}

interface Context {
  ui: SwiftUI;
  mods: Modifiers;
  actions: Map<string, MenuAction>;
  report: { appear: () => void; disappear: () => void };
}

function modifiers(
  ctx: Context,
  node: { disabled?: boolean; closeOnSelect?: boolean },
  top: boolean,
) {
  const list: unknown[] = [];
  if (node.disabled) list.push(ctx.mods.disabled(true));
  // Needs iOS 16.4; earlier versions close the menu anyway.
  if (node.closeOnSelect === false) list.push(ctx.mods.menuActionDismissBehavior('disabled'));
  if (top) {
    list.push(ctx.mods.onAppear(ctx.report.appear));
    list.push(ctx.mods.onDisappear(ctx.report.disappear));
  }
  return list.length > 0 ? (list as ComponentProps<SwiftUI['Button']>['modifiers']) : undefined;
}

/** A row's label: one text, or a title and a subtitle (Apple's two-`Text` rule). */
function label(ctx: Context, node: MenuEntryNode): ReactElement[] {
  const { ui } = ctx;
  const title = node.systemImage ? (
    <ui.Label key="title" title={node.title} systemImage={node.systemImage as SFSymbol} />
  ) : (
    <ui.Text key="title">{node.title}</ui.Text>
  );
  return node.description
    ? [title, <ui.Text key="description">{node.description}</ui.Text>]
    : [title];
}

function run(ctx: Context, id: string) {
  ctx.actions.get(id)?.run();
}

function renderNode(ctx: Context, node: MenuNode, top: boolean): ReactNode {
  const { ui, mods } = ctx;
  switch (node.kind) {
    case 'item':
      return node.description ? (
        <ui.Button
          key={node.id}
          role={node.destructive ? 'destructive' : 'default'}
          onPress={() => run(ctx, node.id)}
          modifiers={modifiers(ctx, node, top)}
        >
          {label(ctx, node)}
        </ui.Button>
      ) : (
        <ui.Button
          key={node.id}
          label={node.title}
          systemImage={node.systemImage as SFSymbol | undefined}
          role={node.destructive ? 'destructive' : 'default'}
          onPress={() => run(ctx, node.id)}
          modifiers={modifiers(ctx, node, top)}
        />
      );
    case 'checkbox':
      return (
        <ui.Toggle
          key={node.id}
          label={node.description ? undefined : node.title}
          systemImage={node.description ? undefined : (node.systemImage as SFSymbol | undefined)}
          isOn={node.checked}
          onIsOnChange={() => run(ctx, node.id)}
          modifiers={modifiers(ctx, node, top)}
        >
          {node.description ? label(ctx, node) : undefined}
        </ui.Toggle>
      );
    case 'radio-group': {
      const keepOpen = node.children.some((radio) => !radio.closeOnSelect);
      return (
        <ui.Picker
          key={node.id}
          selection={node.value}
          onSelectionChange={(value: string) => {
            const radio = node.children.find((candidate) => candidate.value === value);
            if (radio) run(ctx, radio.id);
          }}
          modifiers={[
            mods.pickerStyle('inline'),
            ...(modifiers(ctx, { closeOnSelect: !keepOpen }, top) ?? []),
          ]}
        >
          {node.children.map((radio) =>
            radio.systemImage ? (
              <ui.Label
                key={radio.id}
                title={radio.title}
                systemImage={radio.systemImage as SFSymbol}
                modifiers={[
                  mods.tag(radio.value),
                  ...(radio.disabled ? [mods.disabled(true)] : []),
                ]}
              />
            ) : (
              <ui.Text
                key={radio.id}
                modifiers={[
                  mods.tag(radio.value),
                  ...(radio.disabled ? [mods.disabled(true)] : []),
                ]}
              >
                {radio.title}
              </ui.Text>
            ),
          )}
        </ui.Picker>
      );
    }
    case 'sub':
      return (
        <ui.Menu
          key={node.id}
          label={node.title}
          systemImage={node.systemImage as SFSymbol | undefined}
          modifiers={modifiers(ctx, node, top)}
        >
          {renderNodes(ctx, node.children, false)}
        </ui.Menu>
      );
    case 'label':
    case 'separator':
      return null;
  }
}

/**
 * Rows in order. A label becomes a `Section` titled with it, holding the rows up to the next label
 * or separator; a separator becomes a `Divider`.
 */
function renderNodes(ctx: Context, nodes: MenuNode[], top: boolean): ReactNode[] {
  const { ui } = ctx;
  const out: ReactNode[] = [];
  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index];
    if (!node) break;
    if (node.kind === 'label') {
      const group: MenuNode[] = [];
      index += 1;
      for (let next = nodes[index]; next; next = nodes[index]) {
        if (next.kind === 'label' || next.kind === 'separator') break;
        group.push(next);
        index += 1;
      }
      out.push(
        <ui.Section key={node.id} title={node.title}>
          {group.map((child) => renderNode(ctx, child, top))}
        </ui.Section>,
      );
      continue;
    }
    out.push(node.kind === 'separator' ? <ui.Divider key={node.id} /> : renderNode(ctx, node, top));
    index += 1;
  }
  return out;
}

function warnControlled(open: boolean | undefined, defaultOpen: boolean | undefined) {
  if (open !== undefined || defaultOpen) {
    warnOnce(
      '`open` and `defaultOpen` are ignored on iOS: SwiftUI cannot open a menu from code. `onOpenChange` still reports opening and closing.',
    );
  }
}

export function SystemMenu({ trigger, model, open, defaultOpen, onOpenChange }: RenderMenuProps) {
  const mode = useMenuScheme();
  const report = useOpenReport(onOpenChange);
  const loaded = load();
  if (!loaded) return null;
  warnControlled(open, defaultOpen);
  const ctx: Context = { ...loaded, actions: model.actions, report };
  const { ui } = loaded;
  const child = Children.only((trigger.props as { children: ReactElement }).children);

  return (
    <ui.Host
      matchContents
      colorScheme={mode}
      ignoreSafeArea="keyboard"
      style={{ alignSelf: 'flex-start' }}
    >
      <ui.Menu
        label={
          <ui.RNHostView matchContents>
            {/* SwiftUI's menu takes the tap; the caller's control only draws. */}
            <View pointerEvents="none">{child}</View>
          </ui.RNHostView>
        }
      >
        {renderNodes(ctx, model.nodes, true)}
      </ui.Menu>
    </ui.Host>
  );
}

export function SystemContextMenu({
  trigger,
  content,
  model,
  open,
  defaultOpen,
  onOpenChange,
}: RenderMenuProps) {
  const mode = useMenuScheme();
  const report = useOpenReport(onOpenChange);
  const loaded = load();
  if (!loaded) return null;
  warnControlled(open, defaultOpen);
  const ctx: Context = { ...loaded, actions: model.actions, report };
  const { ui } = loaded;

  const {
    children,
    onPress,
    anchor: _anchor,
    delay: _delay,
    slop: _slop,
    haptics: _haptics,
    onKeyDown: _onKeyDown,
    disabled,
    ...viewProps
  } = trigger.props as Record<string, unknown> & {
    children?: ReactNode;
    onPress?: () => void;
    disabled?: boolean;
  };
  const preview = flatten((content.props as { children?: ReactNode }).children).find(
    (element) => partOf(element.type) === 'preview',
  );
  const previewChildren = (preview?.props as { children?: ReactNode } | undefined)?.children;

  const body = <View {...viewProps}>{children}</View>;
  // PanelUI's `disabled` trigger opens nothing and stops the short press too.
  if (disabled) return body;

  return (
    <ui.Host
      matchContents={{ vertical: true }}
      colorScheme={mode}
      ignoreSafeArea="keyboard"
      style={{ alignSelf: 'stretch' }}
    >
      <ui.ContextMenu>
        <ui.ContextMenu.Trigger>
          <ui.RNHostView matchContents={{ vertical: true }}>
            {onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body}
          </ui.RNHostView>
        </ui.ContextMenu.Trigger>
        <ui.ContextMenu.Items>{renderNodes(ctx, model.nodes, true)}</ui.ContextMenu.Items>
        {preview ? (
          <ui.ContextMenu.Preview>
            <ui.RNHostView matchContents>
              <View>{previewChildren ?? children}</View>
            </ui.RNHostView>
          </ui.ContextMenu.Preview>
        ) : null}
      </ui.ContextMenu>
    </ui.Host>
  );
}
