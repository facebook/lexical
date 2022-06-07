/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementNode, GridSelection, LexicalEditor, LexicalNode, NodeKey, NodeSelection, Point, RangeSelection, TextNode } from 'lexical';
export declare function $cloneWithProperties<T extends LexicalNode>(node: T): T;
export declare function $cloneContents(selection: RangeSelection | NodeSelection | GridSelection): {
    nodeMap: Array<[NodeKey, LexicalNode]>;
    range: Array<NodeKey>;
};
export declare function getStyleObjectFromCSS(css: string): Record<string, string> | null;
export declare function $patchStyleText(selection: RangeSelection | GridSelection, patch: Record<string, string>): void;
export declare function $getSelectionStyleValueForProperty(selection: RangeSelection, styleProperty: string, defaultValue?: string): string;
export declare function $moveCaretSelection(selection: RangeSelection, isHoldingShift: boolean, isBackward: boolean, granularity: 'character' | 'word' | 'lineboundary'): void;
export declare function $isParentElementRTL(selection: RangeSelection): boolean;
export declare function $moveCharacter(selection: RangeSelection, isHoldingShift: boolean, isBackward: boolean): void;
export declare function $selectAll(selection: RangeSelection): void;
export declare function $wrapLeafNodesInElements(selection: RangeSelection, createElement: () => ElementNode, wrappingElement?: ElementNode): void;
export declare function $isAtNodeEnd(point: Point): boolean;
export declare function $shouldOverrideDefaultCharacterSelection(selection: RangeSelection, isBackward: boolean): boolean;
export declare function createDOMRange(editor: LexicalEditor, anchorNode: LexicalNode, _anchorOffset: number, focusNode: LexicalNode, _focusOffset: number): Range | null;
export declare function createRectsFromDOMRange(editor: LexicalEditor, range: Range): Array<ClientRect>;
export declare function trimTextContentFromAnchor(editor: LexicalEditor, anchor: Point, delCount: number): void;
export declare function $sliceSelectedTextNodeContent(selection: RangeSelection | GridSelection | NodeSelection, textNode: TextNode): LexicalNode;
