/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *

 */
import type { DOMConversionMap, EditorConfig, LexicalCommand, LexicalNode, NodeKey, RangeSelection, SerializedElementNode } from 'lexical';
import { Spread } from 'globals';
import { ElementNode } from 'lexical';
export declare type SerializedLinkNode = Spread<{
    type: 'link';
    url: string;
    version: 1;
}, SerializedElementNode>;
export declare class LinkNode extends ElementNode {
    __url: string;
    static getType(): string;
    static clone(node: LinkNode): LinkNode;
    constructor(url: string, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLAnchorElement;
    updateDOM(prevNode: LinkNode, anchor: HTMLAnchorElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedLinkNode): LinkNode;
    exportJSON(): SerializedLinkNode;
    getURL(): string;
    setURL(url: string): void;
    insertNewAfter(selection: RangeSelection): null | ElementNode;
    canInsertTextBefore(): false;
    canInsertTextAfter(): false;
    canBeEmpty(): false;
    isInline(): true;
}
export declare function $createLinkNode(url: string): LinkNode;
export declare function $isLinkNode(node: LexicalNode | null | undefined): node is LinkNode;
export declare type SerializedAutoLinkNode = Spread<{
    type: 'autolink';
    version: 1;
}, SerializedLinkNode>;
export declare class AutoLinkNode extends LinkNode {
    static getType(): string;
    static clone(node: AutoLinkNode): AutoLinkNode;
    static importJSON(serializedNode: SerializedLinkNode | SerializedAutoLinkNode): AutoLinkNode;
    static importDOM(): null;
    exportJSON(): SerializedAutoLinkNode;
    insertNewAfter(selection: RangeSelection): null | ElementNode;
}
export declare function $createAutoLinkNode(url: string): AutoLinkNode;
export declare function $isAutoLinkNode(node: LexicalNode | null | undefined): node is AutoLinkNode;
export declare const TOGGLE_LINK_COMMAND: LexicalCommand<string | null>;
export declare function toggleLink(url: null | string): void;
