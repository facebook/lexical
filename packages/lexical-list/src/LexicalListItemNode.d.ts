/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { BaseSelection, DOMConversionMap, DOMExportOutput, EditorConfig, LexicalNode, LexicalUpdateJSON, NodeKey, ParagraphNode, RangeSelection, SerializedElementNode, Spread } from 'lexical';
import { ElementNode, LexicalEditor } from 'lexical';
export type SerializedListItemNode = Spread<{
    checked: boolean | undefined;
    value: number;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class ListItemNode extends ElementNode {
    /** @internal */
    __value: number;
    /** @internal */
    __checked?: boolean;
    static getType(): string;
    static clone(node: ListItemNode): ListItemNode;
    constructor(value?: number, checked?: boolean, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: ListItemNode, dom: HTMLElement, config: EditorConfig): boolean;
    static transform(): (node: LexicalNode) => void;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedListItemNode): ListItemNode;
    updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedListItemNode>): this;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedListItemNode;
    append(...nodes: LexicalNode[]): this;
    replace<N extends LexicalNode>(replaceWithNode: N, includeChildren?: boolean): N;
    insertAfter(node: LexicalNode, restoreSelection?: boolean): LexicalNode;
    remove(preserveEmptyParent?: boolean): void;
    insertNewAfter(_: RangeSelection, restoreSelection?: boolean): ListItemNode | ParagraphNode;
    collapseAtStart(selection: RangeSelection): true;
    getValue(): number;
    setValue(value: number): this;
    getChecked(): boolean | undefined;
    setChecked(checked?: boolean): this;
    toggleChecked(): this;
    getIndent(): number;
    setIndent(indent: number): this;
    /** @deprecated @internal */
    canInsertAfter(node: LexicalNode): boolean;
    /** @deprecated @internal */
    canReplaceWith(replacement: LexicalNode): boolean;
    canMergeWith(node: LexicalNode): boolean;
    extractWithChild(child: LexicalNode, selection: BaseSelection): boolean;
    isParentRequired(): true;
    createParentElementNode(): ElementNode;
    canMergeWhenEmpty(): true;
}
/**
 * Creates a new List Item node, passing true/false will convert it to a checkbox input.
 * @param checked - Is the List Item a checkbox and, if so, is it checked? undefined/null: not a checkbox, true/false is a checkbox and checked/unchecked, respectively.
 * @returns The new List Item.
 */
export declare function $createListItemNode(checked?: boolean): ListItemNode;
/**
 * Checks to see if the node is a ListItemNode.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode, false otherwise.
 */
export declare function $isListItemNode(node: LexicalNode | null | undefined): node is ListItemNode;
//# sourceMappingURL=LexicalListItemNode.d.ts.map