'use strict';

module.exports = {
  plugins: [
    [
      require('./scripts/error-codes/transform-error-messages'),
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
