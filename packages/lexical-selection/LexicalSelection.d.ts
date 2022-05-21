/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementNode,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  Point,
  RangeSelection,
} from 'lexical';

export function $cloneContents<T extends LexicalNode>(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, T]>;
  range: Array<NodeKey>;
};
export function $cloneWithProperties<T extends LexicalNode>(node: T): T;
export function getStyleObjectFromCSS(css: string): {
  [key: string]: string;
} | null;
export function $patchStyleText(
  selection: RangeSelection | GridSelection,
  patch: {
    [key: string]: string;
  },
): void;
export function $getSelectionStyleValueForProperty(
  selection: RangeSelection,
  styleProperty: string,
  defaultValue: string,
): string;
export function $moveCaretSelection(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void;
export function $isParentElementRTL(selection: RangeSelection): boolean;
export function $moveCharacter(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void;
export function $selectAll(selection: RangeSelection): void;
export function $wrapLeafNodesInElements(
  selection: RangeSelection,
  createElement: () => ElementNode,
  wrappingElement?: ElementNode,
): void;
export function $isAtNodeEnd(point: Point): boolean;
export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean;

declare function createDOMRange(
  editor: LexicalEditor,
  anchorNode: LexicalNode,
  anchorOffset: number,
  focusNode: LexicalNode,
  focusOffset: number,
): Range | null;

declare function createRectsFromDOMRange(
  editor: LexicalEditor,
  range: Range,
): Array<ClientRect>;
