/**
 * PanelUI Colors (registry/themes/panelui-colors.ts): each design's `colors` from the running
 * PanelUI theme. Uniwind is mocked with a theme table that tests can change, the way a theme
 * switch would.
 */
import { act, renderHook } from '@testing-library/react-native';

let mockTheme: Record<string, string | undefined> = {};
const mockListeners = new Set<() => void>();
jest.mock(
  'uniwind',
  () => {
    const { useEffect, useReducer } = require('react');
    return {
      useCSSVariable: (names: string[]) => {
        const [, rerender] = useReducer((n: number) => n + 1, 0);
        useEffect(() => {
          mockListeners.add(rerender);
          return () => {
            mockListeners.delete(rerender);
          };
        }, []);
        return names.map((name) => mockTheme[name]);
      },
    };
  },
  { virtual: true },
);

const { usePanelUIColors, withAlpha } =
  require('../../../../registry/themes/panelui-colors') as typeof import('../../../../registry/themes/panelui-colors');

const PANEL_LIGHT = {
  '--color-surface': '#f7f7f7',
  '--color-surface-tertiary': '#eaeaea',
  '--color-foreground': '#262626',
  '--color-card': '#ffffff',
  '--color-border': 'rgba(0, 0, 0, 0.08)',
};

beforeEach(() => {
  mockTheme = { ...PANEL_LIGHT };
});

test('maps a design’s slots to the theme’s tokens', async () => {
  const { result } = await renderHook(() => usePanelUIColors('soft-pill'));
  expect(result.current).toEqual({
    background: '#f7f7f7',
    capsule: '#eaeaea',
    foreground: '#262626',
  });
});

test('applies a slot’s opacity on top of the token’s own', async () => {
  mockTheme['--color-foreground'] = '#262626';
  const { result } = await renderHook(() => usePanelUIColors('glass-expand'));
  expect(result.current.background).toBe('rgba(255, 255, 255, 0.7)');
  expect(result.current.shade).toBe('rgba(38, 38, 38, 0.035)');
  expect(withAlpha('rgba(0, 0, 0, 0.5)', 0.5)).toBe('rgba(0, 0, 0, 0.25)');
  expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  expect(withAlpha('#00000080', 1)).toBe('rgba(0, 0, 0, 0.502)');
  // Formats it can't read stay as they are.
  expect(withAlpha('oklch(0.5 0.1 200)', 0.5)).toBe('oklch(0.5 0.1 200)');
});

test('leaves out a slot whose token the theme lacks, so the design keeps its own colour', async () => {
  mockTheme['--color-surface-tertiary'] = undefined;
  const { result } = await renderHook(() => usePanelUIColors('soft-pill'));
  expect(result.current).not.toHaveProperty('capsule');
  expect(result.current.background).toBe('#f7f7f7');
});

test('returns the same object until the theme changes, then the new colours', async () => {
  const { result, rerender } = await renderHook(() => usePanelUIColors('soft-pill'));
  const first = result.current;
  await rerender({});
  expect(result.current).toBe(first);

  await act(async () => {
    mockTheme = { ...PANEL_LIGHT, '--color-surface': '#141414', '--color-foreground': '#f5f5f5' };
    for (const listener of mockListeners) listener();
  });
  expect(result.current).not.toBe(first);
  expect(result.current.background).toBe('#141414');
  expect(result.current.foreground).toBe('#f5f5f5');
});
