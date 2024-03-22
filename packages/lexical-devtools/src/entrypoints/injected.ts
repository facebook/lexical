/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import useExtensionStore, {storeReadyPromise} from '../store';

export default defineUnlistedScript({
  main() {
    storeReadyPromise
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('Hello from injected script!');
        useExtensionStore.subscribe((state) => {
          // eslint-disable-next-line no-console
          console.warn(`New store value in injected script`, state);
        });
        setInterval(() => useExtensionStore.getState().increase(1), 5000);
      })
      .catch(console.error);
  },
});
