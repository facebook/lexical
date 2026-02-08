module.exports = {
  '*.(js|mjs|jsx|css|html|d.ts|ts|mts|tsx|yml|mdx|json)': 'prettier --write',
  '*.(js|mjs|jsx|ts|mts|tsx)': ['eslint --fix'],
};
