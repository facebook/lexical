/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from '../LexicalNode';

import {ElementNode} from './LexicalElementNode';

export class DEPRECATED_GridRowNode extends ElementNode {}

export function DEPRECATED_$isGridRowNode(
  node: LexicalNode | null | undefined,
): node is DEPRECATED_GridRowNode {
  return node instanceof DEPRECATED_GridRowNode;
}
