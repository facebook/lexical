/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode} from 'outline';

export default function isImmutableOrInertOrSegmented(
  node: OutlineNode,
): boolean {
  return node.isImmutable() || node.isInert() || node.isSegmented();
}
