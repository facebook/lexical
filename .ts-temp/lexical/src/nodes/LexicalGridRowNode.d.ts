/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode } from '../LexicalNode';
import { ElementNode } from './LexicalElementNode';
export declare class GridRowNode extends ElementNode {
}
export declare function $isGridRowNode(node: LexicalNode | null | undefined): node is GridRowNode;
