/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {
  ElementNode,
  GridSelection,
  LexicalNode,
  NodeKey,
  NodeSelection,
  Point,
  RangeSelection,
} from 'lexical';
export function $cloneContents(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
};
export function $cloneWithProperties<LexicalNode>(
  node: LexicalNode,
): LexicalNode;
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
