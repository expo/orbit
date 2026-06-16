module.exports = {
  presets: ['babel-preset-expo'],
  // force-transform classes + private fields/methods so the bundle is digestible by
  // react-native-macos@0.81.6's hermesc, which rejects ES6 `class` and `#field`.
  // Remove once react-native-macos ships a modern hermesc.
  plugins: [
    ['@babel/plugin-transform-classes', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
  ],
};
