/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { GridSelection, LexicalEditor, LexicalNode, NodeKey, NodeSelection, RangeSelection } from 'lexical';
export declare function $getHtmlContent(editor: LexicalEditor): string | null;
export declare function $appendSelectedNodesToClone(editor: LexicalEditor, selection: RangeSelection | NodeSelection | GridSelection, currentNode: LexicalNode, nodeMap: Map<NodeKey, LexicalNode>, range: Array<NodeKey>, shouldIncludeInRange?: boolean): Array<NodeKey>;
export declare function $insertDataTransferForPlainText(dataTransfer: DataTransfer, selection: RangeSelection | GridSelection): void;
export declare function $insertDataTransferForRichText(dataTransfer: DataTransfer, selection: RangeSelection | GridSelection, editor: LexicalEditor): void;
