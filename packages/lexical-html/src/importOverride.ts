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
  DOMImportTag,
  NodeNameToType,
} from './types';

/**
 * A convenience function for type inference when constructing DOM overrides for
 * use with {@link DOMImportExtension}.
 *
 * @__NO_SIDE_EFFECTS__
 */

export function importOverride<T extends DOMImportTag>(
  tag: T,
  $import: DOMImportFunction<NodeNameToType<T>>,
  options: Omit<DOMImportConfigMatch<DOMImportTag>, 'tag' | '$import'> = {},
): DOMImportConfigMatch<T> {
  return {
    ...options,
    $import: $import as DOMImportFunction<Node>,
    tag: tag.toLowerCase() as T,
  };
}
