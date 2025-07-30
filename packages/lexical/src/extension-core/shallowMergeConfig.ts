/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ExtensionConfigBase} from './types';

/**
 * The default merge strategy for extension configuration is a shallow merge.
 *
 * @param config - A full config
 * @param overrides - A partial config of overrides
 * @returns config if there are no overrides, otherwise `{...config, ...overrides}`
 */
export function shallowMergeConfig<T extends ExtensionConfigBase>(
  config: T,
  overrides?: Partial<T>,
): T {
  if (!overrides || config === overrides) {
    return config;
  }
  for (const k in overrides) {
    if (config[k] !== overrides[k]) {
      return {...config, ...overrides};
    }
  }
  return config;
}
