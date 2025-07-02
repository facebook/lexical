/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalNode, RangeSelection, SerializedElementNode } from 'lexical';
import { ElementNode } from 'lexical';
export type SerializedOverflowNode = SerializedElementNode;
/** @noInheritDoc */
export declare class OverflowNode extends ElementNode {
    static getType(): string;
    static clone(node: OverflowNode): OverflowNode;
    static importJSON(serializedNode: SerializedOverflowNode): OverflowNode;
    static importDOM(): null;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: this, dom: HTMLElement): boolean;
    insertNewAfter(selection: RangeSelection, restoreSelection?: boolean): null | LexicalNode;
    excludeFromCopy(): boolean;
    static transform(): (node: LexicalNode) => void;
}
export declare function $createOverflowNode(): OverflowNode;
export declare function $isOverflowNode(node: LexicalNode | null | undefined): node is OverflowNode;
//# sourceMappingURL=index.d.ts.map