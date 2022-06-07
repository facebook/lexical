/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode } from '../LexicalNode';
import type { SerializedElementNode } from './LexicalElementNode';
import { ElementNode } from './LexicalElementNode';
export declare type SerializedRootNode = SerializedElementNode;
export declare class RootNode extends ElementNode {
    __cachedText: null | string;
    static getType(): string;
    static clone(): RootNode;
    constructor();
    getTopLevelElementOrThrow(): never;
    getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
    remove(): never;
    replace<N = LexicalNode>(node: N): never;
    insertBefore(nodeToInsert: LexicalNode): LexicalNode;
    insertAfter(nodeToInsert: LexicalNode): LexicalNode;
    updateDOM(prevNode: RootNode, dom: HTMLElement): false;
    append(...nodesToAppend: LexicalNode[]): this;
    static importJSON(serializedNode: SerializedRootNode): RootNode;
    exportJSON(): SerializedRootNode;
}
export declare function $createRootNode(): RootNode;
export declare function $isRootNode(node: RootNode | LexicalNode | null | undefined): node is RootNode;
