import { Menu as PanelMenu } from 'panelui-native/components/menu';
import { Fragment } from 'react';
import { Menu } from '../menu';
import type { MenuCheckboxNode, MenuItemNode, MenuRadioGroupNode, MenuSubNode } from '../model';
import { walkMenu } from '../walk';

const Icon = (_props: { color?: string }) => null;

describe('walkMenu', () => {
  it('reads items, labels and separators with path ids', () => {
    const model = walkMenu(
      <>
        <Menu.Label>Edit</Menu.Label>
        <Menu.Item description="Give it a new name" systemImage="pencil">
          Rename
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item variant="destructive" disabled>
          Delete
        </Menu.Item>
      </>,
    );
    expect(model.nodes.map((node) => [node.kind, node.id])).toEqual([
      ['label', '0'],
      ['item', '1'],
      ['separator', '2'],
      ['item', '3'],
    ]);
    const rename = model.nodes[1] as MenuItemNode;
    expect(rename).toMatchObject({
      title: 'Rename',
      description: 'Give it a new name',
      systemImage: 'pencil',
      destructive: false,
      closeOnSelect: true,
    });
    const remove = model.nodes[3] as MenuItemNode;
    expect(remove).toMatchObject({ destructive: true, disabled: true });
    expect(model.panelOnly.size).toBe(0);
  });

  it("applies PanelUI's keep-open defaults and lets props override them", () => {
    const model = walkMenu(
      <>
        <Menu.Item>Open</Menu.Item>
        <Menu.Item closeOnSelect={false}>Pin</Menu.Item>
        <Menu.CheckboxItem checked>Bold</Menu.CheckboxItem>
        <Menu.RadioGroup value="a">
          <Menu.RadioItem value="a">A</Menu.RadioItem>
        </Menu.RadioGroup>
      </>,
    );
    expect(model.actions.get('0')?.close).toBe(true);
    expect(model.actions.get('1')?.close).toBe(false);
    expect(model.actions.get('2')?.close).toBe(false);
    expect(model.actions.get('3.0')?.close).toBe(true);
  });

  it('runs what each row does without PanelUI', () => {
    const onSelect = jest.fn();
    const onCheckedChange = jest.fn();
    const onValueChange = jest.fn();
    const onRadioSelect = jest.fn();
    const model = walkMenu(
      <>
        <Menu.Item onSelect={onSelect}>Open</Menu.Item>
        <Menu.CheckboxItem checked={false} onCheckedChange={onCheckedChange}>
          Bold
        </Menu.CheckboxItem>
        <Menu.RadioGroup value="grid" onValueChange={onValueChange}>
          <Menu.RadioItem value="grid">Grid</Menu.RadioItem>
          <Menu.RadioItem value="list" onSelect={onRadioSelect}>
            List
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </>,
    );
    model.actions.get('0')?.run();
    model.actions.get('1')?.run();
    model.actions.get('2.1')?.run();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onValueChange).toHaveBeenCalledWith('list');
    expect(onRadioSelect).toHaveBeenCalledTimes(1);

    const checkbox = model.nodes[1] as MenuCheckboxNode;
    expect(checkbox.checked).toBe(false);
    const group = model.nodes[2] as MenuRadioGroupNode;
    expect(group.children.map((radio) => [radio.value, radio.selected])).toEqual([
      ['grid', true],
      ['list', false],
    ]);
  });

  it('does nothing for a disabled row', () => {
    const onSelect = jest.fn();
    const model = walkMenu(
      <Menu.Item disabled onSelect={onSelect}>
        Open
      </Menu.Item>,
    );
    model.actions.get('0')?.run();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('reads submenus and flags them as glass-incompatible', () => {
    const model = walkMenu(
      <Menu.Sub>
        <Menu.SubTrigger systemImage="square.and.arrow.up">Share</Menu.SubTrigger>
        <Menu.SubContent>
          <Menu.Item>Copy link</Menu.Item>
        </Menu.SubContent>
      </Menu.Sub>,
    );
    const sub = model.nodes[0] as MenuSubNode;
    expect(sub).toMatchObject({ kind: 'sub', title: 'Share', systemImage: 'square.and.arrow.up' });
    expect(sub.children.map((node) => node.id)).toEqual(['0.0']);
    expect(model.actions.has('0.0')).toBe(true);
    expect(model.panelOnly.has('submenu')).toBe(true);
  });

  it('records features a native renderer ignores', () => {
    const model = walkMenu(
      <>
        <PanelMenu.Background />
        <Menu.Item shortcut="⌘R" trailing={<Icon />} onPress={() => {}} icon={<Icon />}>
          Rename
        </Menu.Item>
      </>,
    );
    expect([...model.ignored].sort()).toEqual(
      ['background', 'on-press', 'react-icon', 'shortcut', 'trailing'].sort(),
    );
  });

  it("recognises PanelUI's own parts, so a PanelUI tree works after changing the import", () => {
    const model = walkMenu(
      <>
        <PanelMenu.Item>Rename</PanelMenu.Item>
        <PanelMenu.CheckboxItem checked>Bold</PanelMenu.CheckboxItem>
      </>,
    );
    expect(model.nodes.map((node) => node.kind)).toEqual(['item', 'checkbox']);
    expect(model.panelOnly.size).toBe(0);
  });

  it('opens fragments and arrays', () => {
    const rows = ['A', 'B'].map((title) => <Menu.Item key={title}>{title}</Menu.Item>);
    const model = walkMenu(
      <>
        {rows}
        <Fragment key="nested">
          <Menu.Item>C</Menu.Item>
        </Fragment>
      </>,
    );
    expect(model.nodes.map((node) => (node as MenuItemNode).title)).toEqual(['A', 'B', 'C']);
  });

  it('flags unknown children and labels that are not text', () => {
    function DeleteRow() {
      return <Menu.Item>Delete</Menu.Item>;
    }
    const model = walkMenu(
      <>
        <DeleteRow />
        <Menu.Item>
          <Icon />
        </Menu.Item>
      </>,
    );
    expect(model.unknown).toEqual(['DeleteRow']);
    expect(model.panelOnly.has('unknown')).toBe(true);
    expect(model.panelOnly.has('rich-label')).toBe(true);
  });
});
