module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|ts|tsx|yml|mdx)': 'prettier --write',
  '*.(js|mjs|jsx|ts|tsx)': ['eslint --fix'],
};
