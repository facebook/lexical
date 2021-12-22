/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {TextNode} from 'lexical';

export default function isTokenOrInert(node: TextNode): boolean {
  return node.isToken() || node.isInert();
}
