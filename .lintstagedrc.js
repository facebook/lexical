module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|ts|tsx|yml)': 'prettier --write',
  '*.(js|mjs|jsx|ts|tsx)': ['eslint --fix'],
};
