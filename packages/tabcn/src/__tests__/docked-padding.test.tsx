/**
 * A docked bar's root sets each padding edge to the safe-area inset. An explicit edge wins over
 * `paddingHorizontal`/`padding`, so a design's shorthand padding used to be dropped; the root
 * now adds it to the inset. An explicit edge in the design still wins.
 */
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewStyle } from 'react-native';

import { TabBarRoot, TabBarStateProvider } from '../index';
import { makeTabState } from './fixtures';

function bar(style: ViewStyle, insets = { top: 0, right: 0, bottom: 34, left: 0 }) {
  return render(
    <TabBarStateProvider value={makeTabState({ insets })}>
      <TabBarRoot placement="docked" style={style} testID="bar">
        <Text>tabs</Text>
      </TabBarRoot>
    </TabBarStateProvider>,
  );
}

const padding = () => {
  const flat = StyleSheet.flatten(screen.getByTestId('bar').props.style) as ViewStyle;
  return { left: flat.paddingLeft, right: flat.paddingRight, bottom: flat.paddingBottom };
};

test('paddingHorizontal adds to the side insets', async () => {
  await bar({ paddingHorizontal: 16 });
  expect(padding()).toEqual({ left: 16, right: 16, bottom: 34 });
});

test('padding adds to every inset, including the bottom', async () => {
  await bar({ padding: 8 }, { top: 0, right: 12, bottom: 34, left: 10 });
  expect(padding()).toEqual({ left: 18, right: 20, bottom: 42 });
});

test('an explicit edge in the design still wins', async () => {
  await bar({ paddingHorizontal: 16, paddingLeft: 5 });
  expect(padding()).toEqual({ left: 5, right: 16, bottom: 34 });
});
