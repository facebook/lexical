module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|js.flow|ts|tsx)': 'prettier --write',
  '*.(js|mjs|jsx)': ['flow focus-check', 'eslint --fix'],
  '*.(ts|tsx)': ['eslint --fix'],
};
