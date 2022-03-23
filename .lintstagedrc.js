module.exports = {
  '*': 'prettier --write',
  '*.(js|mjs|jsx)': ['flow focus-check', 'eslint --fix'],
};
