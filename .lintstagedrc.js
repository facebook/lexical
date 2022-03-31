module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|js.flow)': 'prettier --write',
  '*.(js|mjs|jsx)': ['flow focus-check', 'eslint --fix'],
};
