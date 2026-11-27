/**
 * Motion pass and side rail (docs/designs/motion-and-rail.md): minimize on scroll,
 * BadgeCount, and TabBarRoot placement="rail".
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { deepFocusedKey } from '../adapter-bridge';
import {
  BadgeCount,
  TabBarProvider,
  type TabBarRootProps,
  type TabBarState,
  TabBarStateProvider,
  tabcnSpring,
  useMinimizeOnScroll,
  useRestoreTabBar,
  useTabBarMinimized,
} from '../index';
import { HIDDEN_OPACITY } from '../motion';
import { flatStyle, layoutFrame, makeTabState, TestBar } from './fixtures';

let minimized: SharedValue<number> | undefined;
let restoreBar: (() => void) | undefined;

function ScrollScreen({ threshold }: { threshold?: number }) {
  const onScroll = useMinimizeOnScroll(threshold === undefined ? undefined : { threshold });
  minimized = useTabBarMinimized();
  restoreBar = useRestoreTabBar();
  return <Animated.ScrollView testID="list" onScroll={onScroll} />;
}

function App({
  state = makeTabState(),
  minimizeBehavior = 'onScrollDown',
  provider = true,
  threshold,
}: {
  state?: TabBarState;
  minimizeBehavior?: TabBarRootProps['minimizeBehavior'];
  provider?: boolean;
  threshold?: number;
}) {
  const body: ReactNode = (
    <>
      <ScrollScreen threshold={threshold} />
      <TabBarStateProvider value={state}>
        <TestBar minimizeBehavior={minimizeBehavior} />
      </TabBarStateProvider>
    </>
  );
  return provider ? <TabBarProvider>{body}</TabBarProvider> : body;
}

/** Scrolls the list to `y` in a `contentHeight` pt tall list shown in an 800 pt viewport. */
async function scrollTo(y: number, contentHeight = 2000) {
  await act(async () => {
    await fireEvent.scroll(screen.getByTestId('list'), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 390, height: contentHeight },
        layoutMeasurement: { width: 390, height: 800 },
      },
    });
  });
}

beforeEach(() => {
  minimized = undefined;
  restoreBar = undefined;
});

describe('minimize on scroll', () => {
  it('minimizes after scrolling down by the threshold (default 24)', async () => {
    await render(<App />);
    expect(minimized?.value).toBe(0);
    await scrollTo(10);
    await scrollTo(23);
    expect(minimized?.value).toBe(0);
    await scrollTo(24);
    expect(minimized?.value).toBe(1);
  });

  it('restores after an upward scroll of the threshold, or on reaching the top', async () => {
    await render(<App threshold={40} />);
    await scrollTo(300);
    expect(minimized?.value).toBe(1);
    await scrollTo(400);
    await scrollTo(370);
    expect(minimized?.value).toBe(1);
    await scrollTo(360);
    expect(minimized?.value).toBe(0);
    await scrollTo(500);
    expect(minimized?.value).toBe(1);
    await scrollTo(0);
    expect(minimized?.value).toBe(0);
  });

  it('ignores scrolling past the end (bounce)', async () => {
    await render(<App />);
    await scrollTo(1200);
    expect(minimized?.value).toBe(1);
    // Rubber-banding past the end (max offset 1200) and back must not restore the bar.
    await scrollTo(1260);
    await scrollTo(1210);
    expect(minimized?.value).toBe(1);
  });

  it('ignores the offset change a content-size change causes', async () => {
    await render(<App />);
    await scrollTo(1200);
    expect(minimized?.value).toBe(1);
    // The list's bottom padding follows the now compact bar: the content shrinks by 33 pt
    // and the scroll view clamps the offset by as much. That is not an upward scroll.
    await scrollTo(1167, 1967);
    expect(minimized?.value).toBe(1);
    // Counting starts again from there.
    await scrollTo(1150, 1967);
    expect(minimized?.value).toBe(1);
    await scrollTo(1140, 1967);
    expect(minimized?.value).toBe(0);
  });

  it('lets touches through a minimized floating bar where it draws nothing', async () => {
    const state = makeTabState();
    await render(
      <TabBarProvider>
        <ScrollScreen />
        <TabBarStateProvider value={state}>
          <TestBar placement="floating" minimizeBehavior="onScrollDown" />
        </TabBarStateProvider>
      </TabBarProvider>,
    );
    // The floating box: the bar root's child that reports the bar's frame.
    const box = () => {
      const found = screen
        .getByTestId('bar')
        .children.find((c) => typeof c !== 'string' && typeof c.props.onLayout === 'function');
      return typeof found === 'string' ? undefined : found;
    };
    expect(box()?.props.pointerEvents).toBeUndefined();
    await scrollTo(300);
    expect(minimized?.value).toBe(1);
    expect(box()?.props.pointerEvents).toBe('box-none');
    await act(async () => restoreBar?.());
    expect(box()?.props.pointerEvents).toBeUndefined();
  });

  it('restores the bar when the active tab changes', async () => {
    const tabs = makeTabState().tabs;
    const first = makeTabState();
    await render(<App state={first} />);
    await scrollTo(300);
    expect(minimized?.value).toBe(1);
    await screen.rerender(
      <App
        state={makeTabState({
          activeIndex: 1,
          tabs: tabs.map((t) => ({ ...t, focused: t.index === 1 })),
        })}
      />,
    );
    expect(minimized?.value).toBe(0);
  });

  it('finds the deepest focused route, so a screen pushed inside a tab restores the bar', () => {
    const tab = (key: string, state?: Parameters<typeof deepFocusedKey>[0]) => ({
      key,
      name: key,
      state,
    });
    expect(deepFocusedKey({ index: 1, routes: [tab('a'), tab('b')] })).toBe('b');
    expect(
      deepFocusedKey({
        index: 0,
        routes: [tab('a', { index: 1, routes: [tab('list'), tab('detail')] }), tab('b')],
      }),
    ).toBe('detail');
  });

  it('useRestoreTabBar brings a minimized bar back without changing tabs', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await scrollTo(300);
    expect(minimized?.value).toBe(1);
    await act(async () => restoreBar?.());
    expect(minimized?.value).toBe(0);
    expect(state.tabs.some((t) => (t.press as jest.Mock).mock.calls.length > 0)).toBe(false);
    // Scrolling on down by the threshold minimizes it again.
    await scrollTo(310);
    expect(minimized?.value).toBe(0);
    await scrollTo(324);
    expect(minimized?.value).toBe(1);
  });

  it('useRestoreTabBar does nothing without a provider', async () => {
    await render(<App provider={false} />);
    expect(() => restoreBar?.()).not.toThrow();
    expect(minimized?.value).toBe(0);
  });

  it('does nothing while the bar does not opt in', async () => {
    await render(<App minimizeBehavior="none" />);
    await scrollTo(300);
    expect(minimized?.value).toBe(0);
  });

  it('does nothing without a provider', async () => {
    await render(<App provider={false} />);
    await scrollTo(300);
    expect(minimized?.value).toBe(0);
  });

  it('reports the bar’s measured height as it compacts', async () => {
    const state = makeTabState();
    await render(<App state={state} />);
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutFrame(0, 0, 390, 83));
    });
    expect(state.reportHeight).toHaveBeenLastCalledWith(83);
    await scrollTo(300);
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutFrame(0, 0, 390, 60));
    });
    expect(state.reportHeight).toHaveBeenLastCalledWith(60);
  });
});

/** The badge's characters, left to right (hidden from screen readers, so included here). */
const badgeText = () =>
  screen
    .getAllByText(/^.$/, { includeHiddenElements: true })
    .map((t) => t.props.children as string)
    .join('');

/** Lays out every digit slot, as the device does after each commit. */
async function layoutSlots() {
  await act(async () => {
    for (const digit of screen.getAllByText(/^\d$/, { includeHiddenElements: true })) {
      await fireEvent(digit, 'layout', layoutFrame(0, 0, 8, 16));
    }
  });
}

describe('BadgeCount', () => {
  it('renders the value, hidden from screen readers', async () => {
    await render(<BadgeCount value={7} />);
    expect(screen.queryByText('7')).toBeNull();
    expect(badgeText()).toBe('7');
  });

  it('clamps values above max to max+, with the + outside the rolling digits', async () => {
    await render(<BadgeCount value={120} />);
    expect(badgeText()).toBe('99+');
    await screen.rerender(<BadgeCount value={12} max={9} />);
    await layoutSlots();
    expect(badgeText()).toBe('9+');
    await screen.rerender(<BadgeCount value={9} max={9} />);
    await layoutSlots();
    expect(badgeText()).toBe('9');
  });

  it('shows only the new digits once a change has rolled in', async () => {
    await render(<BadgeCount value={19} />);
    await layoutSlots();
    // Measured slots roll at once (the test animation finishes immediately).
    await screen.rerender(<BadgeCount value={20} />);
    expect(badgeText()).toBe('20');
  });

  it('holds a new leading digit hidden until its slot is measured, then rolls it in', async () => {
    await render(<BadgeCount value={9} />);
    await layoutSlots();
    await screen.rerender(<BadgeCount value={10} />);
    const leading = screen.getByText('1', { includeHiddenElements: true });
    expect(flatStyle(leading).opacity).toBe(0);
    await layoutSlots();
    expect(flatStyle(screen.getByText('1', { includeHiddenElements: true })).opacity).toBe(
      undefined,
    );
    expect(badgeText()).toBe('10');
  });
});

describe('TabButton badge', () => {
  it('reads the tab’s badge with its label', async () => {
    const base = makeTabState();
    const state = makeTabState({
      tabs: base.tabs.map((t) => (t.index === 1 ? { ...t, badge: 12 } : t)),
    });
    await render(
      <TabBarStateProvider value={state}>
        <TestBar />
      </TabBarStateProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Search, 12, tab, 2 of 3' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Home, tab, 1 of 3' })).toBeTruthy();
  });
});

describe('tabcnSpring', () => {
  it('clamps overshoot, so a retarget mid-flight never carries past the new target', () => {
    expect(tabcnSpring).toMatchObject({ overshootClamping: true });
  });
});

describe('TabBarRoot placement="rail"', () => {
  it('sits in the layout beside the screens, padded by the top, left and bottom insets', async () => {
    const state = makeTabState({ insets: { top: 24, right: 0, bottom: 20, left: 30 } });
    await render(
      <TabBarStateProvider value={state}>
        <TestBar placement="rail" />
      </TabBarStateProvider>,
    );
    const style = flatStyle(screen.getByTestId('bar'));
    expect(style).toMatchObject({ paddingTop: 24, paddingBottom: 20, paddingLeft: 30 });
    expect(style.position).toBeUndefined();
  });

  it('takes its width in the layout and reports no bottom height to screens', async () => {
    const state = makeTabState();
    await render(
      <TabBarStateProvider value={state}>
        <TestBar placement="rail" />
      </TabBarStateProvider>,
    );
    await act(async () => {
      await fireEvent(screen.getByTestId('bar'), 'layout', layoutFrame(0, 0, 88, 844));
    });
    // The navigator lays screens out beside the rail's own width; nothing covers the bottom.
    expect(state.reportHeight).toHaveBeenLastCalledWith(0);
  });
});

describe('HIDDEN_OPACITY', () => {
  it('stops iOS fades just above UIKit’s hidden cutoff, so Liquid Glass keeps drawing', () => {
    // Under a view below 0.01, a glass view whose effect changes never draws again (iOS 26.5).
    // Under Jest, Platform.OS is 'ios'.
    expect(HIDDEN_OPACITY).toBeGreaterThan(0.01);
    expect(HIDDEN_OPACITY).toBeLessThan(0.02);
  });
});
