import type {
  ContextMenuPreviewProps,
  ContextMenuProps as PanelContextMenuProps,
} from 'panelui-native/components/context-menu';
import type { MenuProps as PanelMenuProps } from 'panelui-native/components/menu';
import { type ComponentType, type ReactNode, useState } from 'react';
import { availableRenderers, useRequestedRenderer } from './config';
import type { MenuModel, MenuRendererPreference } from './model';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  findParts,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioItem,
  MenuSubTrigger,
  MenuTrigger,
  PanelContextMenu,
  PanelMenu,
} from './parts';
import { GlassMenu } from './renderers/glass';
import { SystemContextMenu, SystemMenu } from './renderers/system';
import {
  ignoredBy,
  type MenuRendererChoice,
  resolveRenderer,
  warnIgnored,
  warnOnce,
} from './resolve';
import { walkMenu } from './walk';

export interface MenuProps extends PanelMenuProps {
  /**
   * Which renderer draws this menu. `'auto'` (the default, or the `MenuConfigProvider` default)
   * picks Apple's menu on iOS, the glass menu on Android 13+, and PanelUI's menu everywhere else.
   * A renderer that isn't available here falls back to PanelUI.
   */
  renderer?: MenuRendererPreference;
}

export type ContextMenuProps = PanelContextMenuProps & {
  /** As on `Menu`. There is no glass context menu yet, so Android uses PanelUI's. */
  renderer?: MenuRendererPreference;
};

const EMPTY_MODEL: MenuModel = {
  nodes: [],
  actions: new Map(),
  ignored: new Set(),
  panelOnly: new Set(),
  unknown: [],
};

function useChoice(
  kind: 'menu' | 'context-menu',
  renderer: MenuRendererPreference | undefined,
  children: ReactNode,
) {
  const requested = useRequestedRenderer(renderer);
  const [glassFailed, setGlassFailed] = useState(false);
  const { trigger, content } = findParts(children);
  const model = content
    ? walkMenu((content.props as { children?: ReactNode }).children)
    : EMPTY_MODEL;
  const available = availableRenderers();
  const choice: MenuRendererChoice = resolveRenderer({
    kind,
    requested,
    available,
    model,
    glassFailed,
  });

  if (__DEV__ && model.unknown.length > 0 && (available.system || available.glass)) {
    warnOnce(
      `${model.unknown.join(', ')} inside the menu isn't one of its parts, so PanelUI draws this menu instead of the native one. Use the menu's own parts directly; a component that wraps them isn't recognised.`,
    );
  }
  warnIgnored(choice.renderer, ignoredBy(choice.renderer, model));

  return { choice, trigger, content, model, onGlassUnavailable: () => setGlassFailed(true) };
}

function MenuRoot({ renderer, children, ...props }: MenuProps) {
  const { choice, trigger, content, model, onGlassUnavailable } = useChoice(
    'menu',
    renderer,
    children,
  );
  if (trigger && content && choice.renderer !== 'panel') {
    const shared = {
      trigger,
      content,
      model,
      open: props.open,
      defaultOpen: props.defaultOpen,
      onOpenChange: props.onOpenChange,
    };
    if (choice.renderer === 'system') return <SystemMenu {...shared} />;
    return <GlassMenu {...shared} onGlassUnavailable={onGlassUnavailable} />;
  }
  return <PanelMenu {...props}>{children}</PanelMenu>;
}

function ContextMenuRoot({ renderer, children, ...props }: ContextMenuProps) {
  const { choice, trigger, content, model } = useChoice('context-menu', renderer, children);
  if (trigger && content && choice.renderer === 'system') {
    return (
      <SystemContextMenu
        trigger={trigger}
        content={content}
        model={model}
        open={props.open}
        defaultOpen={props.defaultOpen}
        onOpenChange={props.onOpenChange}
      />
    );
  }
  return <PanelContextMenu {...props}>{children}</PanelContextMenu>;
}

MenuRoot.displayName = 'Menu';
ContextMenuRoot.displayName = 'ContextMenu';

/**
 * A menu written with PanelUI's parts, drawn by Apple's menu on iOS, a Liquid Glass menu on
 * Android 13+, and PanelUI's menu everywhere else. See the package README for what each renderer
 * draws.
 */
export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Background: PanelMenu.Background,
  Label: PanelMenu.Label,
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: PanelMenu.RadioGroup,
  RadioItem: MenuRadioItem,
  Separator: PanelMenu.Separator,
  Sub: PanelMenu.Sub,
  SubTrigger: MenuSubTrigger,
  SubContent: PanelMenu.SubContent,
});

/**
 * The actions for a piece of content, opened by holding it. Apple's context menu on iOS (with an
 * optional `ContextMenu.Preview`), PanelUI's everywhere else.
 */
export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  // PanelUI's own component, so its check for a declared preview still finds it. Typed here because
  // PanelUI doesn't export the function by name.
  Preview: PanelContextMenu.Preview as ComponentType<ContextMenuPreviewProps>,
  Background: PanelMenu.Background,
  Label: PanelMenu.Label,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: PanelMenu.RadioGroup,
  RadioItem: MenuRadioItem,
  Separator: PanelMenu.Separator,
  Sub: PanelMenu.Sub,
  SubTrigger: MenuSubTrigger,
  SubContent: PanelMenu.SubContent,
});
