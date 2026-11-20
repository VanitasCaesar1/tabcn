// Minimal stand-in for react-native-reanimated under Jest. tabcn's tests cover
// navigation, accessibility and layout reporting, not animation curves, and
// Reanimated 4.7's own Jest setup mixes its native and JS code paths. Animations
// resolve to their end value immediately.
const React = require('react');
const { View, Text, ScrollView, Image } = require('react-native');

function makeShared(initial) {
  const sv = { value: initial };
  sv.get = () => sv.value;
  sv.set = (v) => {
    sv.value = typeof v === 'function' ? v(sv.value) : v;
  };
  sv.modify = (fn) => {
    sv.value = fn ? fn(sv.value) : sv.value;
  };
  sv.addListener = () => {};
  sv.removeListener = () => {};
  return sv;
}

function createAnimatedComponent(Component) {
  return React.forwardRef(function Animated(props, ref) {
    return React.createElement(Component, { ...props, ref });
  });
}

const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const linear = (t) => t;
const Easing = {
  linear,
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  bezier: () => linear,
  in: (f) => f,
  out: (f) => f,
  inOut: (f) => f,
};

module.exports = {
  __esModule: true,
  default: {
    View: createAnimatedComponent(View),
    Text: createAnimatedComponent(Text),
    ScrollView: createAnimatedComponent(ScrollView),
    Image: createAnimatedComponent(Image),
    createAnimatedComponent,
  },
  createAnimatedComponent,
  ReduceMotion,
  Easing,
  useSharedValue: (initial) => React.useState(() => makeShared(initial))[0],
  useAnimatedStyle: () => ({}),
  useAnimatedReaction: () => {},
  useDerivedValue: (fn) => makeShared(fn()),
  withSpring: (to) => to,
  withTiming: (to) => to,
  withDelay: (_d, a) => a,
  interpolate: (v, input, output) =>
    output[0] + ((v - input[0]) / (input[1] - input[0])) * (output[1] - output[0]),
  interpolateColor: (_v, _i, output) => output[0],
  runOnJS: (fn) => fn,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  ZoomIn: {},
  ZoomOut: {},
  LinearTransition: {},
};
