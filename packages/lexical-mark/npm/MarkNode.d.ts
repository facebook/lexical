/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, GridSelection, LexicalNode, NodeKey, NodeSelection, RangeSelection, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from 'lexical';
export type SerializedMarkNode = Spread<{
    ids: Array<string>;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class MarkNode extends ElementNode {
    /** @internal */
    __ids: Array<string>;
    static getType(): string;
    static clone(node: MarkNode): MarkNode;
    static importDOM(): null;
    static importJSON(serializedNode: SerializedMarkNode): MarkNode;
    exportJSON(): SerializedMarkNode;
    constructor(ids: Array<string>, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: MarkNode, element: HTMLElement, config: EditorConfig): boolean;
    hasID(id: string): boolean;
    getIDs(): Array<string>;
    addID(id: string): void;
    deleteID(id: string): void;
    insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | ElementNode;
    canInsertTextBefore(): false;
    canInsertTextAfter(): false;
    canBeEmpty(): false;
    isInline(): true;
    extractWithChild(child: LexicalNode, selection: RangeSelection | NodeSelection | GridSelection, destination: 'clone' | 'html'): boolean;
    excludeFromCopy(destination: 'clone' | 'html'): boolean;
}
export declare function $createMarkNode(ids: Array<string>): MarkNode;
export declare function $isMarkNode(node: LexicalNode | null): node is MarkNode;
