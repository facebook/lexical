module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|ts|tsx)': 'prettier --write',
  '*.(js|mjs|jsx|ts|tsx)': ['eslint --fix'],
};
