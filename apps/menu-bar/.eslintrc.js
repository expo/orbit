module.exports = {
  root: true,
  extends: 'universe/native',
  plugins: ['react-compiler'],
  overrides: [
    {
      extends: 'universe/node',
      files: ['metro.config.js'],
    },
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'error',
    'react-compiler/react-compiler': 'error',
  },
  ignorePatterns: [
    'electron/.vite/**',
    'electron/dist/**',
    'electron/node_modules/**',
    'electron/out/**',
    'src/generated/**',
  ],
};
