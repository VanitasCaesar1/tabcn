// react-native-reanimated is mapped to ./reanimated.js (see "moduleNameMapper").
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// Mocks gesture handler's native module so 'tabcn/gestures' can be tested.
require('react-native-gesture-handler/jestSetup');
