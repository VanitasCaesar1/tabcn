/**
 * Live tabs (docs/designs/bottom-components.md, Live tabs): useLiveTab shares a progress
 * value and a line of text per route under the provider, without re-rendering anything
 * that doesn't read that route's text; and the Live Tabs design draws them.
 */
import { act, render, screen } from '@testing-library/react-native';
import { type ComponentType, Profiler, type ReactNode } from 'react';
import { Text } from 'react-native';

import { type LiveTab, TabBarProvider, TabBarStateProvider, useLiveTab } from '../index';
import { makeTabState } from './fixtures';

const handles: Record<string, LiveTab> = {};
const renders: Record<string, number> = {};

function Reader({ id, name }: { id: string; name: string }) {
  const live = useLiveTab(name);
  handles[id] = live;
  renders[id] = (renders[id] ?? 0) + 1;
  return <Text>{`${id}: ${live.text ?? 'none'}`}</Text>;
}

beforeEach(() => {
  for (const key of Object.keys(handles)) delete handles[key];
  for (const key of Object.keys(renders)) delete renders[key];
});

function App() {
  return (
    <TabBarProvider>
      <Reader id="writer" name="timer" />
      <Reader id="tab" name="timer" />
      <Reader id="other" name="downloads" />
    </TabBarProvider>
  );
}

const { LiveTabs } = require('../../../../registry/designs/live-tabs/live-tabs') as {
  LiveTabs: ComponentType<{ haptics?: boolean }>;
};

let barCommits = 0;
const countCommit = () => {
  barCommits += 1;
};
const liveState = makeTabState();

/** The Live Tabs bar under a provider, with its commits counted. */
function LiveApp({ children }: { children?: ReactNode }) {
  return (
    <TabBarProvider>
      {children}
      <Profiler id="bar" onRender={countCommit}>
        <TabBarStateProvider value={liveState}>
          <LiveTabs haptics={false} />
        </TabBarStateProvider>
      </Profiler>
    </TabBarProvider>
  );
}

describe('useLiveTab', () => {
  it('shares one progress value per name, and writing it re-renders nothing', async () => {
    await render(<App />);
    expect(handles.writer?.progress).toBe(handles.tab?.progress);
    expect(handles.other?.progress).not.toBe(handles.tab?.progress);
    const before = { ...renders };
    await act(async () => {
      if (handles.writer) handles.writer.progress.value = 0.4;
    });
    expect(handles.tab?.progress.value).toBe(0.4);
    expect(renders).toEqual(before);
  });

  it('re-renders only the readers of a name when its text changes', async () => {
    await render(<App />);
    const setText = handles.writer?.setText;
    const before = { ...renders };
    await act(async () => handles.writer?.setText('4:59'));
    expect(screen.getByText('tab: 4:59')).toBeTruthy();
    expect(renders.tab).toBe((before.tab ?? 0) + 1);
    expect(renders.other).toBe(before.other);
    // The setter is stable, and the same text again re-renders nothing.
    expect(handles.writer?.setText).toBe(setText);
    await act(async () => handles.writer?.setText('4:59'));
    expect(renders.tab).toBe((before.tab ?? 0) + 1);
    await act(async () => handles.writer?.setText(undefined));
    expect(screen.getByText('tab: none')).toBeTruthy();
  });

  it('keeps values per provider', async () => {
    await render(
      <>
        <TabBarProvider>
          <Reader id="a" name="timer" />
        </TabBarProvider>
        <TabBarProvider>
          <Reader id="b" name="timer" />
        </TabBarProvider>
      </>,
    );
    await act(async () => handles.a?.setText('one'));
    expect(screen.getByText('a: one')).toBeTruthy();
    expect(screen.getByText('b: none')).toBeTruthy();
  });

  it('is inert without a provider, with a development warning', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await render(<Reader id="alone" name="timer" />);
    await act(async () => handles.alone?.setText('ignored'));
    expect(screen.getByText('alone: none')).toBeTruthy();
    if (handles.alone) handles.alone.progress.value = 0.5;
    expect(handles.alone?.progress.value).toBe(0.5);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('useLiveTab() needs'));
    warn.mockRestore();
  });
});

describe('live-tabs', () => {
  beforeEach(() => {
    barCommits = 0;
  });

  it('shows live text on its tab and reads it as the tab’s value', async () => {
    await render(
      <LiveApp>
        <Reader id="writer" name="search" />
      </LiveApp>,
    );
    const search = () => screen.getAllByRole('tab')[1];
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(search()?.props.accessibilityValue?.text).toBeUndefined();
    await act(async () => handles.writer?.setText('3 new'));
    expect(screen.getByText('3 new', { includeHiddenElements: true })).toBeTruthy();
    expect(search()?.props.accessibilityValue?.text).toBe('3 new');
    // The label stays for the crossfade back, and the tab keeps its name and position.
    expect(screen.getByText('Search')).toBeTruthy();
    expect(search()?.props.accessibilityLabel).toBe('Search, tab, 2 of 3');
    await act(async () => handles.writer?.setText(undefined));
    expect(search()?.props.accessibilityValue?.text).toBeUndefined();
  });

  it('draws progress without committing the bar', async () => {
    await render(
      <LiveApp>
        <Reader id="writer" name="profile" />
      </LiveApp>,
    );
    const before = barCommits;
    await act(async () => {
      if (!handles.writer) return;
      for (let i = 1; i < 60; i++) handles.writer.progress.value = i / 60;
    });
    expect(barCommits).toBe(before);
  });
});
