import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CLOSE_ON_SELECT_DEFAULTS } from '../walk';

// The system and glass renderers run each row's behaviour themselves, so they copy PanelUI's
// `closeOnSelect` defaults. This reads the installed PanelUI source and fails when they change.
const root = dirname(require.resolve('panelui-native/package.json'));
const source = readFileSync(join(root, 'src/components/menu/index.tsx'), 'utf8');
const contextSource = readFileSync(join(root, 'src/components/context-menu/index.tsx'), 'utf8');

function defaultIn(component: string): boolean | undefined {
  const start = source.indexOf(`export function ${component}(`);
  if (start < 0) return undefined;
  const signature = source.slice(start, source.indexOf(')', start));
  const match = signature.match(/closeOnSelect = (true|false)/);
  return match ? match[1] === 'true' : undefined;
}

describe("PanelUI's menu internals", () => {
  it('keeps the closeOnSelect defaults this package copies', () => {
    expect(defaultIn('MenuItem')).toBe(CLOSE_ON_SELECT_DEFAULTS.item);
    expect(defaultIn('MenuCheckboxItem')).toBe(CLOSE_ON_SELECT_DEFAULTS.checkbox);
    expect(defaultIn('MenuRadioItem')).toBe(CLOSE_ON_SELECT_DEFAULTS.radio);
  });

  it('still identifies Menu.Background and ContextMenu.Preview by component identity', () => {
    expect(source).toContain('child.type === MenuBackground');
    expect(contextSource).toContain('child.type === ContextMenuPreview');
  });
});
