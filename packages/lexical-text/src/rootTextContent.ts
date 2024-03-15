/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$getRoot} from 'lexical';

/**
 * Returns the root's text content.
 * @returns The root's text content.
 */
export function $rootTextContent(): string {
  const root = $getRoot();

  return root.getTextContent();
}
