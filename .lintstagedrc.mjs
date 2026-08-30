/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default {
  '*.(js|mjs|jsx|css|html|d.ts|ts|mts|tsx|yml|mdx|json)': 'prettier --write',
  '*.(js|mjs|jsx|ts|mts|tsx)': ['eslint --fix'],
};
