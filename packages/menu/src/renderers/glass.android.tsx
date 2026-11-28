/**
 * The glass renderer: a fork of rit3zh/expo-glass-custom-menu's native Liquid Glass menu
 * (`packages/menu/android`, MIT, see NOTICE), drawing its own native rows from the model.
 */
import { requireNativeView, requireOptionalNativeModule } from 'expo';
import {
  Children,
  type ComponentType,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { type GlassItem, toGlassItems } from '../glass-items';
import type { MenuGlassOptions } from '../parts';
import { useMenuScheme } from '../scheme';
import type { RenderMenuProps } from './types';

/** Must match `GlassCapability.ApiVersion` in the Kotlin module. */
export const GLASS_API_VERSION = 1;
const MODULE = 'TabcnGlassMenu';
/** Must match `IconHostId` in `GlassMenuAndroidView.kt`. */
const ICON_HOST_ID = 'tabcn-menu-icons';

interface GlassModule {
  supportsGlass: boolean;
  apiVersion: number;
}

interface GlassHandle {
  open: (x?: number, y?: number, width?: number, height?: number) => Promise<void>;
  close: () => Promise<void>;
}

interface NativeGlassProps extends ViewProps {
  ref?: Ref<GlassHandle>;
  items: GlassItem[];
  colorScheme: 'light' | 'dark';
  glass: boolean;
  config: Record<string, unknown>;
  triggerConfig: Record<string, unknown>;
  onItemSelect: (event: { nativeEvent: { id: string; index: number; title: string } }) => void;
  onMenuOpenChange: (event: { nativeEvent: { open: boolean } }) => void;
  onGlassUnavailable: () => void;
  children?: ReactNode;
}

// `requireOptionalNativeModule` returns null in Expo Go and wherever the module isn't linked.
// The view is looked up only when the module exists: `requireNativeView` would otherwise hand
// back a component that renders nothing instead of failing.
const module = requireOptionalNativeModule<GlassModule>(MODULE);
const available = module?.supportsGlass === true && module.apiVersion === GLASS_API_VERSION;
const NativeGlass: ComponentType<NativeGlassProps> | null = available
  ? requireNativeView<NativeGlassProps>(MODULE)
  : null;

export function glassAvailable(): boolean {
  return available;
}

function configs(glass: MenuGlassOptions | undefined) {
  const config: Record<string, unknown> = {};
  if (glass?.blur !== undefined) config.blur = glass.blur;
  if (glass?.tintColor !== undefined) config.tintColor = glass.tintColor;
  if (glass?.tintOpacity !== undefined) config.tintOpacity = glass.tintOpacity;
  if (glass?.jelly !== undefined) config.jelly = glass.jelly;
  if (glass?.speed !== undefined) config.speed = glass.speed;
  const triggerConfig: Record<string, unknown> = {};
  if (glass?.morphOrigin !== undefined) triggerConfig.morphOrigin = glass.morphOrigin;
  return { config, triggerConfig };
}

export function GlassMenu({
  trigger,
  content,
  model,
  open,
  defaultOpen,
  onOpenChange,
  onGlassUnavailable,
}: RenderMenuProps) {
  const native = useRef<GlassHandle>(null);
  const mode = useMenuScheme();
  const reported = useRef(false);
  const glass = (content.props as { glass?: MenuGlassOptions }).glass;
  const { items, icons } = useMemo(() => toGlassItems(model.nodes, mode), [model.nodes, mode]);
  const { config, triggerConfig } = useMemo(() => configs(glass), [glass]);

  // The native session owns the open state. A controlled `open` is forwarded to it, and only what
  // it reports back reaches `onOpenChange`.
  useEffect(() => {
    if (open === undefined || open === reported.current) return;
    if (open) void native.current?.open();
    else void native.current?.close();
  }, [open]);

  // Read once on mount, like PanelUI's `defaultOpen`.
  const openOnMount = useRef(defaultOpen);
  useEffect(() => {
    if (openOnMount.current) void native.current?.open();
  }, []);

  if (!NativeGlass) return null;

  const child = Children.only(
    (trigger.props as { children: ReactElement }).children,
  ) as ReactElement<{
    onPress?: (...args: unknown[]) => void;
  }>;
  const opener = cloneElement(child, {
    onPress: (...args: unknown[]) => {
      child.props.onPress?.(...args);
      void native.current?.open();
    },
  });

  return (
    <NativeGlass
      ref={native}
      style={styles.trigger}
      items={items}
      colorScheme={mode}
      glass={glass?.trigger === true}
      config={config}
      triggerConfig={triggerConfig}
      onItemSelect={({ nativeEvent }) => {
        // The native side closes the menu itself unless the row is `keepOpen`.
        model.actions.get(nativeEvent.id)?.run();
      }}
      onMenuOpenChange={({ nativeEvent }) => {
        if (nativeEvent.open === reported.current) return;
        reported.current = nativeEvent.open;
        onOpenChange?.(nativeEvent.open);
      }}
      onGlassUnavailable={() => onGlassUnavailable?.()}
    >
      {opener}
      {/* React icons, drawn by the native side into their rows. Never on screen themselves. */}
      <View
        nativeID={ICON_HOST_ID}
        collapsable={false}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={styles.iconHost}
      >
        {icons.map((icon, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are positional by design
          <View key={index} collapsable={false} style={styles.iconSlot}>
            {icon}
          </View>
        ))}
      </View>
    </NativeGlass>
  );
}

const styles = StyleSheet.create({
  // Hugs the caller's control, as PanelUI's trigger does by cloning it.
  trigger: { alignSelf: 'flex-start' },
  iconHost: { position: 'absolute', left: 0, top: 0 },
  iconSlot: { alignSelf: 'flex-start' },
});
