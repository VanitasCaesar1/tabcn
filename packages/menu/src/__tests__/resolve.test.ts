import type { MenuPanelOnlyFeature } from '../model';
import { ignoredBy, resolveRenderer } from '../resolve';
import { schemeOf } from '../scheme';

const none = { system: false, glass: false };
const ios = { system: true, glass: false };
const android = { system: false, glass: true };
const model = (...panelOnly: MenuPanelOnlyFeature[]) => ({
  panelOnly: new Set(panelOnly),
  unknown: [],
});

describe('resolveRenderer', () => {
  it('picks the native renderer that is available', () => {
    expect(resolveRenderer({ kind: 'menu', requested: 'auto', available: ios }).renderer).toBe(
      'system',
    );
    expect(resolveRenderer({ kind: 'menu', requested: 'auto', available: android }).renderer).toBe(
      'glass',
    );
    expect(resolveRenderer({ kind: 'menu', requested: 'auto', available: none }).renderer).toBe(
      'panel',
    );
  });

  it('honours an explicit renderer, falling back to PanelUI when it is unavailable', () => {
    expect(resolveRenderer({ kind: 'menu', requested: 'panel', available: ios }).renderer).toBe(
      'panel',
    );
    const glassOnIos = resolveRenderer({ kind: 'menu', requested: 'glass', available: ios });
    expect(glassOnIos.renderer).toBe('panel');
    expect(glassOnIos.reason).toMatch(/glass module/);
    expect(
      resolveRenderer({ kind: 'menu', requested: 'system', available: android }).renderer,
    ).toBe('panel');
  });

  it('keeps menus with submenus off glass but on the system menu', () => {
    const sub = model('submenu');
    const onAndroid = resolveRenderer({
      kind: 'menu',
      requested: 'auto',
      available: android,
      model: sub,
    });
    expect(onAndroid.renderer).toBe('panel');
    expect(onAndroid.reason).toMatch(/submenus/);
    expect(
      resolveRenderer({ kind: 'menu', requested: 'auto', available: ios, model: sub }).renderer,
    ).toBe('system');
  });

  it('uses PanelUI for unknown children and rich labels everywhere', () => {
    for (const feature of ['unknown', 'rich-label'] as const) {
      expect(
        resolveRenderer({ kind: 'menu', requested: 'auto', available: ios, model: model(feature) })
          .renderer,
      ).toBe('panel');
      expect(
        resolveRenderer({
          kind: 'menu',
          requested: 'glass',
          available: android,
          model: model(feature),
        }).renderer,
      ).toBe('panel');
    }
  });

  it('has no glass context menu and drops glass after a failure', () => {
    expect(
      resolveRenderer({ kind: 'context-menu', requested: 'auto', available: android }).renderer,
    ).toBe('panel');
    expect(
      resolveRenderer({ kind: 'context-menu', requested: 'auto', available: ios }).renderer,
    ).toBe('system');
    const failed = resolveRenderer({
      kind: 'menu',
      requested: 'auto',
      available: android,
      glassFailed: true,
    });
    expect(failed.renderer).toBe('panel');
    expect(failed.reason).toMatch(/failed/);
  });
});

describe('ignoredBy', () => {
  const ignored = new Set(['shortcut', 'react-icon', 'background'] as const);
  it('lists only what the renderer drops', () => {
    expect(ignoredBy('system', { ignored })).toEqual(['shortcut', 'background', 'react-icon']);
    expect(ignoredBy('glass', { ignored })).toEqual(['shortcut', 'background']);
    expect(ignoredBy('panel', { ignored })).toEqual([]);
  });
});

describe('schemeOf', () => {
  it('reads light and dark from hex and rgb colours', () => {
    expect(schemeOf('#121a3d')).toBe('dark');
    expect(schemeOf('#232323')).toBe('dark');
    expect(schemeOf('#ffffff')).toBe('light');
    expect(schemeOf('#fff')).toBe('light');
    expect(schemeOf('rgba(24, 25, 26, 0.9)')).toBe('dark');
    expect(schemeOf('rgb(250 250 250)')).toBe('light');
  });

  it('gives up on anything else', () => {
    expect(schemeOf('oklch(0.2 0.02 260)')).toBeNull();
    expect(schemeOf(undefined)).toBeNull();
    expect(schemeOf('unset')).toBeNull();
  });
});
