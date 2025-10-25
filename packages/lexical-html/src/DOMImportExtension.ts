/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMImportConfig, DOMImportExtensionOutput} from './types';

import {defineExtension, shallowMergeConfig} from 'lexical';

import {compileDOMImportOverrides} from './compileDOMImportOverrides';
import {compileLegacyImportDOM} from './compileLegacyImportDOM';
import {DOMImportExtensionName} from './constants';

/** @internal @experimental */
export const DOMImportExtension = defineExtension<
  DOMImportConfig,
  typeof DOMImportExtensionName,
  DOMImportExtensionOutput,
  null
>({
  build: compileDOMImportOverrides,
  config: {compileLegacyImportNode: compileLegacyImportDOM, overrides: []},
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    for (const k of ['overrides'] as const) {
      if (partial[k]) {
        (merged[k] as unknown[]) = [...config[k], ...partial[k]];
      }
    }
    return merged;
  },
  name: DOMImportExtensionName,
});
