/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from '../LexicalNode';

import {ElementNode} from './LexicalElementNode';

export class GridRowNode extends ElementNode {}

export function $isGridRowNode(node: ?LexicalNode): boolean %checks {
  return node instanceof GridRowNode;
}
