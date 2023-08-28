module.exports = {
  root: true,
  extends: 'universe/native',
  overrides: [
    {
      extends: 'universe/node',
      files: ['metro.config.js'],
    },
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'error',
  },
};
