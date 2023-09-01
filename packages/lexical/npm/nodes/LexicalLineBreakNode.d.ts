/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, NodeKey, SerializedLexicalNode } from '../LexicalNode';
import { LexicalNode } from '../LexicalNode';
export type SerializedLineBreakNode = SerializedLexicalNode;
/** @noInheritDoc */
export declare class LineBreakNode extends LexicalNode {
    static getType(): string;
    static clone(node: LineBreakNode): LineBreakNode;
    constructor(key?: NodeKey);
    getTextContent(): '\n';
    createDOM(): HTMLElement;
    updateDOM(): false;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedLineBreakNode: SerializedLineBreakNode): LineBreakNode;
    exportJSON(): SerializedLexicalNode;
}
export declare function $createLineBreakNode(): LineBreakNode;
export declare function $isLineBreakNode(node: LexicalNode | null | undefined): node is LineBreakNode;
