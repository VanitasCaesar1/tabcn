import { StyleSheet, View } from 'react-native';
import { TabBarProvider, type TabBarState, TabBarStateProvider, type TabItem } from 'tabcn';

import type { Demo } from '@/demos';

const noop = () => {};

/**
 * A still of a design for the gallery: the real component, fed static tab state through
 * TabBarStateProvider (no navigator), on the reference's background.
 */
export function DesignPreview({ demo }: { demo: Demo }) {
  const active = demo.initialTab ?? 0;
  const tabs: TabItem[] = demo.tabs.map((tab, index) => ({
    key: `preview-${index}`,
    routeName: `preview-${index}`,
    index,
    focused: index === active,
    label: tab.label,
    badge: tab.badge,
    renderIcon: tab.icon,
    press: noop,
    longPress: noop,
  }));
  const state: TabBarState = {
    tabs,
    activeIndex: active,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    hideOnKeyboard: false,
    reportHeight: noop,
  };
  const height = (demo.barHeight ?? 58) + 28;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { height, backgroundColor: demo.background }]}
    >
      <View style={[styles.stage, { height }]}>
        {/* Its own provider, for bars that use panel or minimize hooks (Quick Create's bar). */}
        <TabBarProvider>
          <TabBarStateProvider value={state}>
            {demo.render({ onActionPress: noop })}
          </TabBarStateProvider>
        </TabBarProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 12, overflow: 'hidden', borderCurve: 'continuous' },
  // Docked bars sit at the bottom; floating bars position themselves 12pt above it.
  stage: { justifyContent: 'flex-end', paddingBottom: 2 },
});
