module.exports = {
  '*.!(svg)': 'prettier --write',
  '*.(js|mjs|jsx)': ['flow focus-check', 'eslint --fix'],
};
