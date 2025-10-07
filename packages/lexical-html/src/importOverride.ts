/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMImportConfigMatch,
  DOMImportFunction,
  NodeNameToType,
} from './types';

/**
 * A convenience function for type inference when constructing DOM overrides for
 * use with {@link DOMImportExtension}.
 *
 * @__NO_SIDE_EFFECTS__
 */

export function importOverride<T extends string>(
  tag: T,
  $import: DOMImportFunction<NodeNameToType<T>>,
  options: Omit<DOMImportConfigMatch, 'tag' | '$import'> = {},
): DOMImportConfigMatch {
  return {
    ...options,
    $import: $import as DOMImportFunction<Node>,
    tag: tag.toLowerCase(),
  };
}
