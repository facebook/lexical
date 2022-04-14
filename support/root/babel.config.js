'use strict';
const path = require('path');

const _dirname = process.cwd();

module.exports = {
  plugins: [
    [
      require(path.join(
        _dirname,
        './scripts/error-codes/transform-error-messages',
      )),
      {noMinify: true},
    ],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-flow',
  ],
};
