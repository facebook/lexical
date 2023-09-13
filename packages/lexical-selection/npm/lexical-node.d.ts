/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { GridSelection, LexicalEditor, LexicalNode, NodeSelection, Point, RangeSelection, TextNode } from 'lexical';
/**
 * Returns a copy of a node, but generates a new key for the copy.
 * @param node - The node to be cloned.
 * @returns The clone of the node.
 */
export declare function $cloneWithProperties<T extends LexicalNode>(node: T): T;
/**
 * Generally used to append text content to HTML and JSON. Grabs the text content and "slices"
 * it to be generated into the new TextNode.
 * @param selection - The selection containing the node whose TextNode is to be edited.
 * @param textNode - The TextNode to be edited.
 * @returns The updated TextNode.
 */
export declare function $sliceSelectedTextNodeContent(selection: RangeSelection | GridSelection | NodeSelection, textNode: TextNode): LexicalNode;
/**
 * Determines if the current selection is at the end of the node.
 * @param point - The point of the selection to test.
 * @returns true if the provided point offset is in the last possible position, false otherwise.
 */
export declare function $isAtNodeEnd(point: Point): boolean;
/**
 * Trims text from a node in order to shorten it, eg. to enforce a text's max length. If it deletes text
 * that is an ancestor of the anchor then it will leave 2 indents, otherwise, if no text content exists, it deletes
 * the TextNode. It will move the focus to either the end of any left over text or beginning of a new TextNode.
 * @param editor - The lexical editor.
 * @param anchor - The anchor of the current selection, where the selection should be pointing.
 * @param delCount - The amount of characters to delete. Useful as a dynamic variable eg. textContentSize - maxLength;
 */
export declare function trimTextContentFromAnchor(editor: LexicalEditor, anchor: Point, delCount: number): void;
/**
 * Gets the TextNode's style object and adds the styles to the CSS.
 * @param node - The TextNode to add styles to.
 */
export declare function $addNodeStyle(node: TextNode): void;
/**
 * Applies the provided styles to the TextNodes in the provided Selection.
 * Will update partially selected TextNodes by splitting the TextNode and applying
 * the styles to the appropriate one.
 * @param selection - The selected node(s) to update.
 * @param patch - The patch to apply, which can include multiple styles. { CSSProperty: value }
 */
export declare function $patchStyleText(selection: RangeSelection | GridSelection, patch: Record<string, string | null>): void;
