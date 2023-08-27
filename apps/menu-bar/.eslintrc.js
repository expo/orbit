module.exports = {
  root: true,
  extends: ['universe/native', 'universe/node'],
  rules: {
    // suppress errors for missing 'import React' in files
    'react/react-in-jsx-scope': 'off',
  },
};
