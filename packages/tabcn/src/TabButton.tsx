import { type ComponentRef, type ReactNode, useRef } from 'react';
import { Platform, type Pressable } from 'react-native';

import { PressableScale, type PressableScaleProps } from './PressableScale';
import { type TabItem, useTabBar } from './state';
import { useTabListContext } from './TabList';

export interface TabButtonProps
  extends Omit<PressableScaleProps, 'children' | 'onPress' | 'onLongPress' | 'role'> {
  tab: TabItem;
  /** Scale while pressed. Default 1: tabs don't shrink on press; the active-tab change is the feedback. */
  scale?: number;
  children?: ReactNode | ((state: { focused: boolean; pressed: boolean }) => ReactNode);
}

/**
 * A tab. Handles press and long press, the `tab` role and selected state, and
 * reports its position so `TabIndicator` can move to it.
 */
export function TabButton({ tab, children, onLayout, scale = 1, ...rest }: TabButtonProps) {
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

  const accessibilityLabel =
    tab.accessibilityLabel ??
    (Platform.OS === 'ios' ? `${tab.label}, tab, ${tab.index + 1} of ${tabs.length}` : tab.label);

  return (
    <PressableScale
      ref={ref}
      role="tab"
      accessibilityState={{ selected: tab.focused }}
      aria-selected={tab.focused}
      accessibilityLabel={accessibilityLabel}
      testID={tab.testID}
      scale={scale}
      onPress={tab.press}
      onLongPress={tab.longPress}
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
