module.exports = {
  extends: [
    'airbnb-base',
    'prettier',
  ],
  env: {
    webextensions: true,
    browser: true,
  },
  globals: {
    P: 'readonly',
    _: 'readonly',
  },
};
