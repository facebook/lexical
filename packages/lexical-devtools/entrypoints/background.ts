/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import store from '../store';

export default defineBackground(() => {
  // eslint-disable-next-line no-console
  console.log('Hello from Lexical DevTools extension content script.', {
    id: browser.runtime.id,
  });

  // Store initialization so other extension surfaces can use it
  // as all changes go through background SW
  store.subscribe((_state) => {});
});
