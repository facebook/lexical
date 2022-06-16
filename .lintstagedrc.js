module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|js.flow|ts|tsx)': 'prettier --write',
  '*.(js|mjs|jsx|ts|tsx)': ['eslint --fix'],
};
