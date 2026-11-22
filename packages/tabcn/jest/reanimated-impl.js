// Minimal stand-in for react-native-reanimated under Jest. tabcn's tests cover
// navigation, accessibility and layout reporting, not animation curves, and
// Reanimated 4.7's own Jest setup mixes its native and JS code paths. Animations
// resolve to their end value immediately and call their completion callback with
// `finished: true`.
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

// Layout animation builders (FadeIn.duration(200).delay(60), LinearTransition.springify()...):
// every method returns the same chainable builder.
function builder() {
  const b = new Proxy(function layoutAnimation() {}, {
    get: (_t, key) => (key === 'then' ? undefined : () => b),
  });
  return b;
}

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
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing,
  useSharedValue: (initial) => React.useState(() => makeShared(initial))[0],
  makeMutable: (initial) => makeShared(initial),
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useAnimatedReaction: () => {},
  useDerivedValue: (fn) => makeShared(fn()),
  withSpring: (to, _config, callback) => {
    callback?.(true);
    return to;
  },
  withTiming: (to, _config, callback) => {
    callback?.(true);
    return to;
  },
  cancelAnimation: () => {},
  // Used by react-native-gesture-handler when its callbacks are worklets.
  useEvent: (callback) => callback,
  useHandler: () => ({ context: {}, doDependenciesDiffer: true }),
  useComposedEventHandler: (handlers) => (event) => {
    for (const handler of handlers) handler?.(event);
  },
  isSharedValue: (value) =>
    value != null && typeof value === 'object' && typeof value.modify === 'function',
  // Calls `onScroll` with the event payload, as Reanimated does on the UI thread.
  useAnimatedScrollHandler: (handlers) => (event) =>
    handlers.onScroll?.(event?.nativeEvent ? event.nativeEvent : event),
  withDelay: (_d, a) => a,
  withRepeat: (a) => a,
  // Skips layout animations for its children (Cart Pill's count): renders them as they are.
  LayoutAnimationConfig: ({ children }) => React.createElement(React.Fragment, null, children),
  withSequence: (...steps) => steps[steps.length - 1],
  interpolate: (v, input, output) =>
    output[0] + ((v - input[0]) / (input[1] - input[0])) * (output[1] - output[0]),
  interpolateColor: (_v, _i, output) => output[0],
  runOnJS: (fn) => fn,
  // The OS "reduce motion" setting: off under Jest.
  useReducedMotion: () => false,
  // No keyboard under Jest: height 0, closed.
  useAnimatedKeyboard: () => ({ height: { value: 0 }, state: { value: 0 } }),
  KeyboardState: { UNKNOWN: 0, OPENING: 1, OPEN: 2, CLOSING: 3, CLOSED: 4 },
  FadeIn: builder(),
  FadeOut: builder(),
  ZoomIn: builder(),
  ZoomOut: builder(),
  LinearTransition: builder(),
};
