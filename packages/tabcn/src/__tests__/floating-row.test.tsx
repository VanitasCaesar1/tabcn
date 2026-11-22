/**
 * A floating bar whose design lays its root out as a row (a pill and a round button, with a
 * gap) stays centred under a provider. The provider wraps the children in a view that grows
 * (`flexGrow: 1`) to fill the box; kept as a row, the box let that wrapper grow along it to the
 * screen's width, so the row sat against the leading edge. The row, alignment and gap now
 * belong to the wrapper alone.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewStyle } from 'react-native';

import { TabBarProvider, TabBarRoot, TabBarStateProvider } from '../index';
import { closest, flatStyle, makeTabState } from './fixtures';

const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 89 };

function App({ provider }: { provider: boolean }) {
  const bar = (
    <TabBarStateProvider value={makeTabState()}>
      <TabBarRoot placement="floating" style={row}>
        <Text>pill</Text>
        <Text>button</Text>
      </TabBarRoot>
    </TabBarStateProvider>
  );
  return provider ? <TabBarProvider>{bar}</TabBarProvider> : bar;
}

const styleOf = (props: Record<string, unknown>) =>
  (StyleSheet.flatten(props.style as never) ?? {}) as ViewStyle;

/** The floating box: the nearest view above the tabs with `maxWidth: '100%'`. */
const box = () => closest(screen.getByText('pill'), (p) => styleOf(p).maxWidth === '100%');

/** The provider's wrapper round the design's children: it grows to fill the box. */
const wrapper = () =>
  closest(screen.getByText('pill'), (p) => {
    const style = styleOf(p);
    return style.flexGrow === 1 && style.alignSelf === 'stretch';
  });

test('under a provider the box is a plain column and the wrapper holds the row', async () => {
  await render(<App provider />);
  expect(flatStyle(box())).toMatchObject({ flexDirection: 'column', gap: 0 });
  expect(flatStyle(wrapper())).toMatchObject({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 89,
  });
});

test('without a provider the box keeps the design’s row', async () => {
  await render(<App provider={false} />);
  expect(flatStyle(box())).toMatchObject(row);
});
