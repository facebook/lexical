/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export default defineContentScript({
  main() {
    // eslint-disable-next-line no-console
    console.log('Hello from Lexical DevTools extension content script.');
  },
  matches: ['*://*.lexical.dev/*'],
});
