// Stand-ins for PanelUI's parts: a plain View carrying the part's name, so tests can see what
// rendered without PanelUI's theme, Uniwind or Reanimated. Text is wrapped the way PanelUI's
// `textChildren` does.
const React = require('react');
const { Text, View } = require('react-native');

function wrapText(children) {
  return React.Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number'
      ? React.createElement(Text, null, child)
      : child,
  );
}

module.exports = function part(name) {
  function Part({ children, ...props }) {
    return React.createElement(View, { testID: name, ...props }, wrapText(children));
  }
  Part.displayName = name;
  return Part;
};
