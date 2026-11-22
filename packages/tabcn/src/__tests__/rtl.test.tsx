/**
 * Right-to-left: tab frames are physical, so the indicator is pinned to the physical left. React
 * Native reads `left` as the start edge in RTL (unless the app turned the swap off), so there
 * the indicator uses `right`, which RN reads as the physical left.
 */
import { I18nManager } from 'react-native';
import { physicalLeft } from '../indicator';

function withLayout(isRTL: boolean, swap: boolean, run: () => void) {
  const rtl = jest.replaceProperty(I18nManager, 'isRTL', isRTL);
  const constants = jest
    .spyOn(I18nManager, 'getConstants')
    .mockReturnValue({ ...I18nManager.getConstants(), isRTL, doLeftAndRightSwapInRTL: swap });
  try {
    run();
  } finally {
    rtl.restore();
    constants.mockRestore();
  }
}

test('left-to-right pins the indicator with left', () => {
  withLayout(false, true, () => expect(physicalLeft()).toEqual({ left: 0 }));
});

test('right-to-left with the default swap pins it with right, the physical left', () => {
  withLayout(true, true, () => expect(physicalLeft()).toEqual({ right: 0 }));
});

test('right-to-left with the swap turned off keeps left', () => {
  withLayout(true, false, () => expect(physicalLeft()).toEqual({ left: 0 }));
});
