/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  Store as ProxyStore,
  wrapStore as reduxWrapStore,
} from '@eduardoac-skimlinks/webext-redux';

export type BackgroundConfiguration = Parameters<typeof reduxWrapStore>[1];
export type PagesConfiguration = ConstructorParameters<typeof ProxyStore>[0];
