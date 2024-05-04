/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {INITIAL_SETTINGS, Settings} from './appSettings';

// Export a function so this is not tree-shaken,
// but evaluate it immediately so it executes before
// lexical computes CAN_USE_BEFORE_INPUT
export default (() => {
  // override default options with query parameters if any
  const urlSearchParams = new URLSearchParams(window.location.search);

  for (const param of Object.keys(INITIAL_SETTINGS)) {
    if (urlSearchParams.has(param)) {
      try {
        const value = JSON.parse(urlSearchParams.get(param) ?? 'true');
        INITIAL_SETTINGS[param as keyof Settings] = Boolean(value);
      } catch (error) {
        console.warn(`Unable to parse query parameter "${param}"`);
      }
    }
  }

  if (INITIAL_SETTINGS.disableBeforeInput) {
    // @ts-expect-error
    delete window.InputEvent.prototype.getTargetRanges;
  }
  return INITIAL_SETTINGS;
})();
