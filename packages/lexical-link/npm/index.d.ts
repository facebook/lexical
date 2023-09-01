/** @module @lexical/link */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, EditorConfig, GridSelection, LexicalCommand, LexicalNode, NodeKey, NodeSelection, RangeSelection, SerializedElementNode } from 'lexical';
import { ElementNode, Spread } from 'lexical';
export type LinkAttributes = {
    rel?: null | string;
    target?: null | string;
    title?: null | string;
};
export type SerializedLinkNode = Spread<{
    url: string;
}, Spread<LinkAttributes, SerializedElementNode>>;
/** @noInheritDoc */
export declare class LinkNode extends ElementNode {
    /** @internal */
    __url: string;
    /** @internal */
    __target: null | string;
    /** @internal */
    __rel: null | string;
    /** @internal */
    __title: null | string;
    static getType(): string;
    static clone(node: LinkNode): LinkNode;
    constructor(url: string, attributes?: LinkAttributes, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLAnchorElement;
    updateDOM(prevNode: LinkNode, anchor: HTMLAnchorElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedLinkNode | SerializedAutoLinkNode): LinkNode;
    sanitizeUrl(url: string): string;
    exportJSON(): SerializedLinkNode | SerializedAutoLinkNode;
    getURL(): string;
    setURL(url: string): void;
    getTarget(): null | string;
    setTarget(target: null | string): void;
    getRel(): null | string;
    setRel(rel: null | string): void;
    getTitle(): null | string;
    setTitle(title: null | string): void;
    insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | ElementNode;
    canInsertTextBefore(): false;
    canInsertTextAfter(): false;
    canBeEmpty(): false;
    isInline(): true;
    extractWithChild(child: LexicalNode, selection: RangeSelection | NodeSelection | GridSelection, destination: 'clone' | 'html'): boolean;
}
/**
 * Takes a URL and creates a LinkNode.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes { target, rel, title }
 * @returns The LinkNode.
 */
export declare function $createLinkNode(url: string, attributes?: LinkAttributes): LinkNode;
/**
 * Determines if node is a LinkNode.
 * @param node - The node to be checked.
 * @returns true if node is a LinkNode, false otherwise.
 */
export declare function $isLinkNode(node: LexicalNode | null | undefined): node is LinkNode;
export type SerializedAutoLinkNode = SerializedLinkNode;
export declare class AutoLinkNode extends LinkNode {
    static getType(): string;
    static clone(node: AutoLinkNode): AutoLinkNode;
    static importJSON(serializedNode: SerializedAutoLinkNode): AutoLinkNode;
    static importDOM(): null;
    exportJSON(): SerializedAutoLinkNode;
    insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | ElementNode;
}
/**
 * Takes a URL and creates an AutoLinkNode. AutoLinkNodes are generally automatically generated
 * during typing, which is especially useful when a button to generate a LinkNode is not practical.
 * @param url - The URL the LinkNode should direct to.
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 * @returns The LinkNode.
 */
export declare function $createAutoLinkNode(url: string, attributes?: LinkAttributes): AutoLinkNode;
/**
 * Determines if node is an AutoLinkNode.
 * @param node - The node to be checked.
 * @returns true if node is an AutoLinkNode, false otherwise.
 */
export declare function $isAutoLinkNode(node: LexicalNode | null | undefined): node is AutoLinkNode;
export declare const TOGGLE_LINK_COMMAND: LexicalCommand<string | ({
    url: string;
} & LinkAttributes) | null>;
/**
 * Generates or updates a LinkNode. It can also delete a LinkNode if the URL is null,
 * but saves any children and brings them up to the parent node.
 * @param url - The URL the link directs to.
 * @param attributes - Optional HTML a tag attributes. { target, rel, title }
 */
export declare function toggleLink(url: null | string, attributes?: LinkAttributes): void;
