module.exports = {
  // rn-macos 0.81.6 ships the OLD hermesc (rejects ES6 classes, #fields, async arrow/generator
  // funcs). SDK 56 defaults Hermes to the 'hermes-stable' profile, which preserves that syntax
  // for a modern hermesc. Force the legacy 'hermes-v0' profile so the bundle is downleveled to
  // what this hermesc accepts. Ignored on web (uses the web profile). Drop once rn-macos ships a
  // modern hermesc.
  presets: [['babel-preset-expo', { unstable_transformProfile: 'hermes-v0' }]],
};
