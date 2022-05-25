/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  NodeSelection,
  GridSelection,
} from 'lexical';

export function $generateHtmlFromNodes(
  editor: LexicalEditor,
  selection?: RangeSelection | NodeSelection | GridSelection | null,
): string;

export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document,
): Array<LexicalNode>;
