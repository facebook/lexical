/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import transformErrorMessages from './scripts/error-codes/transform-error-messages.mjs';

export default {
  plugins: [[transformErrorMessages, {noMinify: true}]],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    ['@babel/preset-react', {runtime: 'automatic'}],
    '@babel/preset-flow',
  ],
};
