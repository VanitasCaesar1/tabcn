/**
 * usePanelOverlap: how much of a panel the bar's top edge hides, so a peeking panel can show
 * the same strip above a floating bar (16 pt behind its rounded ends) and a docked one (0).
 */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  TabBarProvider,
  type TabBarRootProps,
  TabBarStateProvider,
  usePanelOverlap,
} from '../index';
import { makeTabState, TestBar } from './fixtures';

function Overlap() {
  return <Text testID="overlap">{usePanelOverlap()}</Text>;
}

function App({ placement }: { placement?: TabBarRootProps['placement'] }) {
  return (
    <TabBarProvider>
      <Overlap />
      {placement ? (
        <TabBarStateProvider value={makeTabState()}>
          <TestBar placement={placement} />
        </TabBarStateProvider>
      ) : null}
    </TabBarProvider>
  );
}

const overlap = () => screen.getByTestId('overlap').props.children;

test('16 under a floating bar', async () => {
  await render(<App placement="floating" />);
  expect(overlap()).toBe(16);
});

test('0 under a docked bar, and back to 16 when the bar turns floating', async () => {
  const view = await render(<App placement="docked" />);
  expect(overlap()).toBe(0);
  await view.rerender(<App placement="floating" />);
  expect(overlap()).toBe(16);
});

test('16 before any bar reports, and without a provider', async () => {
  await render(<App />);
  expect(overlap()).toBe(16);
  await render(<Overlap />);
  expect(screen.getAllByTestId('overlap').at(-1)?.props.children).toBe(16);
});
