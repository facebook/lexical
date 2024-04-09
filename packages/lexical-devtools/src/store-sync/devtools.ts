/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {StoreApi} from 'zustand';

import getConfiguration from './internal/getConfiguration';
import storeReadyPromiseBase from './internal/pages';

export default async function storeReadyPromise<T>(
  store: StoreApi<T>,
): Promise<void> {
  const configuration = getConfiguration(store);
  await storeReadyPromiseBase(store, configuration);
}
