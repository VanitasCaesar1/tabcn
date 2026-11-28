import type { ReactElement } from 'react';
import { GLASS_ICON_COLORS, toGlassItems } from '../glass-items';
import { Menu } from '../menu';
import { walkMenu } from '../walk';

const Icon = (_props: { color?: string }) => null;

describe('toGlassItems', () => {
  it("maps the model to the native module's rows", () => {
    const { nodes } = walkMenu(
      <>
        <Menu.Label>View as</Menu.Label>
        <Menu.RadioGroup value="grid">
          <Menu.RadioItem value="grid">Grid</Menu.RadioItem>
          <Menu.RadioItem value="list">List</Menu.RadioItem>
        </Menu.RadioGroup>
        <Menu.Separator />
        <Menu.CheckboxItem checked description="Show hidden files">
          Hidden
        </Menu.CheckboxItem>
        <Menu.Item variant="destructive" disabled>
          Delete
        </Menu.Item>
      </>,
    );
    expect(toGlassItems(nodes, 'dark').items).toEqual(
      [
        { id: '0', title: 'View as', heading: true },
        { id: '1.0', title: 'Grid', checked: true },
        { id: '1.1', title: 'List', checked: false },
        { id: '2', title: '', separator: true },
        { id: '3', title: 'Hidden', subtitle: 'Show hidden files', checked: true, keepOpen: true },
        { id: '4', title: 'Delete', destructive: true, disabled: true },
      ].map((item) => expect.objectContaining(item)),
    );
  });

  it('puts React icons in slots, tinted to the row unless they carry a colour', () => {
    const { nodes } = walkMenu(
      <>
        <Menu.Item icon={<Icon />}>Share</Menu.Item>
        <Menu.Item icon={<Icon />} variant="destructive">
          Delete
        </Menu.Item>
        <Menu.Item icon={<Icon color="#00f" />}>Brand</Menu.Item>
      </>,
    );
    const { items, icons } = toGlassItems(nodes, 'light');
    expect(items.map((item) => item.iconSlot)).toEqual([0, 1, 2]);
    const colors = (icons as ReactElement<{ color?: string }>[]).map((icon) => icon.props.color);
    expect(colors).toEqual([
      GLASS_ICON_COLORS.light.base,
      GLASS_ICON_COLORS.light.destructive,
      '#00f',
    ]);
  });
});
