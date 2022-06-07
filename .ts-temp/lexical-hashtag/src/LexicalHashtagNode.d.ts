/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *

 */
import type { EditorConfig, LexicalNode, NodeKey, SerializedTextNode } from 'lexical';
import { TextNode } from 'lexical';
export declare class HashtagNode extends TextNode {
    static getType(): string;
    static clone(node: HashtagNode): HashtagNode;
    constructor(text: string, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    static importJSON(serializedNode: SerializedTextNode): HashtagNode;
    exportJSON(): SerializedTextNode;
    canInsertTextBefore(): boolean;
    isTextEntity(): true;
}
export declare function $createHashtagNode(text?: string): HashtagNode;
export declare function $isHashtagNode(node: LexicalNode | null | undefined): node is HashtagNode;
