// Target of the "react-native-reanimated" mapping. It's a separate file from
// reanimated-impl.js on purpose: expo-router/testing-library calls
// jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock')),
// and if both names pointed at one file, that factory would require itself.
module.exports = require('./reanimated-impl');
