import { render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ContextMenu, Menu, MenuConfigProvider } from '../index';

function Options({ renderer }: { renderer?: 'auto' | 'panel' }) {
  return (
    <Menu renderer={renderer}>
      <Menu.Trigger>
        <Pressable accessibilityRole="button">
          <Text>Options</Text>
        </Pressable>
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Item systemImage="pencil">Rename</Menu.Item>
        <Menu.Item variant="destructive" systemImage="trash">
          Delete
        </Menu.Item>
      </Menu.Content>
    </Menu>
  );
}

describe('Menu', () => {
  it("renders PanelUI's menu, untouched, when asked for it", async () => {
    await render(<Options renderer="panel" />);
    expect(screen.getByTestId('PanelMenu')).toBeTruthy();
    expect(screen.getByTestId('PanelMenu.Trigger')).toBeTruthy();
    expect(screen.getAllByTestId('PanelMenu.Item')).toHaveLength(2);
  });

  it('takes the renderer from MenuConfigProvider', async () => {
    await render(
      <MenuConfigProvider renderer="panel">
        <Options />
      </MenuConfigProvider>,
    );
    expect(screen.getByTestId('PanelMenu')).toBeTruthy();
  });

  it("draws Apple's menu on iOS when @expo/ui is there", async () => {
    await render(<Options />);
    expect(screen.queryByTestId('PanelMenu')).toBeNull();
    expect(screen.getByText('Options')).toBeTruthy();
  });

  it('falls back to PanelUI for a child it does not recognise', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    function Wrapped() {
      return <Menu.Item>Rename</Menu.Item>;
    }
    await render(
      <Menu>
        <Menu.Trigger>
          <Pressable>
            <Text>Options</Text>
          </Pressable>
        </Menu.Trigger>
        <Menu.Content>
          <Wrapped />
        </Menu.Content>
      </Menu>,
    );
    expect(screen.getByTestId('PanelMenu')).toBeTruthy();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Wrapped'));
    warn.mockRestore();
  });
});

describe('ContextMenu', () => {
  it("renders PanelUI's context menu when asked for it", async () => {
    await render(
      <ContextMenu renderer="panel">
        <ContextMenu.Trigger>
          <Text>Message</Text>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>,
    );
    expect(screen.getByTestId('PanelContextMenu')).toBeTruthy();
    expect(screen.getByTestId('PanelContextMenu.Item')).toBeTruthy();
  });
});
