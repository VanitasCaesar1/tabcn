import { type ComponentRef, type ReactNode, useRef } from 'react';
import { type AccessibilityActionEvent, Platform, type Pressable } from 'react-native';

import { PressableScale, type PressableScaleProps } from './PressableScale';
import { type TabItem, useTabBar } from './state';
import { useTabListContext } from './TabList';

/** The spoken name of a tab's long-press action when the design doesn't pass one. */
const DEFAULT_LONG_PRESS_LABEL = 'Long press';

export interface TabButtonProps
  extends Omit<PressableScaleProps, 'children' | 'onPress' | 'onLongPress' | 'role'> {
  tab: TabItem;
  /** Scale while pressed. Default 1: tabs don't shrink on press; the active-tab change is the feedback. */
  scale?: number;
  /**
   * Runs after the tab's `tabLongPress` event, such as opening a panel of sub-tabs above
   * the tab. Also offered to screen readers as the tab's `longpress` action. VoiceOver reads
   * that action by its label: pass `accessibilityActions={[{ name: 'longpress', label }]}`
   * to name it (such as "Show sub-tabs"); it defaults to "Long press".
   */
  onLongPress?: () => void;
  children?: ReactNode | ((state: { focused: boolean; pressed: boolean }) => ReactNode);
}

/**
 * A tab. Handles press and long press, the `tab` role and selected state, and
 * reports its position so `TabIndicator` can move to it. Its default accessibility label
 * includes the tab's `badge` (`Inbox, 12, tab, 2 of 5` on iOS). A passed
 * `accessibilityState` (such as `expanded` from `usePanelAnchor`) is merged with `selected`.
 */
export function TabButton({
  tab,
  children,
  onLayout,
  onLongPress,
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
  scale = 1,
  ...rest
}: TabButtonProps) {
  const { tabs } = useTabBar();
  const { listRef, frames } = useTabListContext('TabButton');
  const ref = useRef<ComponentRef<typeof Pressable>>(null);

  const measure = () => {
    const node = ref.current;
    const list = listRef.current;
    if (!node || !list) return;
    node.measureLayout(list, (x, y, width, height) => {
      frames.modify((all) => {
        'worklet';
        all[tab.index] = { x, y, width, height };
        return all;
      }, true);
    });
  };

  // The badge is read with the label: a badge drawn inside the button can't be reached.
  const badge = tab.badge === undefined ? '' : String(tab.badge).trim();
  const named = badge ? `${tab.label}, ${badge}` : tab.label;
  const accessibilityLabel =
    tab.accessibilityLabel ??
    (Platform.OS === 'ios' ? `${named}, tab, ${tab.index + 1} of ${tabs.length}` : named);

  const longPress = () => {
    tab.longPress();
    onLongPress?.();
  };
  // With its own long press, the tab offers it to screen readers too, keeping the label of a
  // `longpress` action the design passes (VoiceOver reads it as a custom action).
  const passed = accessibilityActions?.find((a) => a.name === 'longpress');
  const actions = onLongPress
    ? [
        ...(accessibilityActions ?? []).filter((a) => a.name !== 'longpress'),
        { name: 'longpress' as const, label: passed?.label ?? DEFAULT_LONG_PRESS_LABEL },
      ]
    : accessibilityActions;
  const onAction = (event: AccessibilityActionEvent) => {
    if (onLongPress && event.nativeEvent.actionName === 'longpress') longPress();
    else onAccessibilityAction?.(event);
  };

  return (
    <PressableScale
      ref={ref}
      role="tab"
      accessibilityState={{ ...accessibilityState, selected: tab.focused }}
      aria-selected={tab.focused}
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={actions}
      onAccessibilityAction={onLongPress || onAccessibilityAction ? onAction : undefined}
      testID={tab.testID}
      scale={scale}
      onPress={tab.press}
      onLongPress={longPress}
      onLayout={(e) => {
        measure();
        onLayout?.(e);
      }}
      {...rest}
    >
      {typeof children === 'function'
        ? ({ pressed }) => children({ focused: tab.focused, pressed })
        : children}
    </PressableScale>
  );
}
