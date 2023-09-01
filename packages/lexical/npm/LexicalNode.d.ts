/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalEditor } from './LexicalEditor';
import type { GridSelection, NodeSelection, RangeSelection } from './LexicalSelection';
import { ElementNode } from '.';
export type NodeMap = Map<NodeKey, LexicalNode>;
export type SerializedLexicalNode = {
    type: string;
    version: number;
};
export declare function removeNode(nodeToRemove: LexicalNode, restoreSelection: boolean, preserveEmptyParent?: boolean): void;
export type DOMConversion<T extends HTMLElement = HTMLElement> = {
    conversion: DOMConversionFn<T>;
    priority: 0 | 1 | 2 | 3 | 4;
};
export type DOMConversionFn<T extends HTMLElement = HTMLElement> = (element: T) => DOMConversionOutput | null;
export type DOMChildConversion = (lexicalNode: LexicalNode, parentLexicalNode: LexicalNode | null | undefined) => LexicalNode | null | undefined;
export type DOMConversionMap<T extends HTMLElement = HTMLElement> = Record<NodeName, (node: T) => DOMConversion<T> | null>;
type NodeName = string;
export type DOMConversionOutput = {
    after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
    forChild?: DOMChildConversion;
    node: null | LexicalNode | Array<LexicalNode>;
};
export type DOMExportOutput = {
    after?: (generatedElement: HTMLElement | Text | null | undefined) => HTMLElement | Text | null | undefined;
    element: HTMLElement | Text | null;
};
export type NodeKey = string;
export declare class LexicalNode {
    [x: string]: any;
    /** @internal */
    __type: string;
    /** @internal */
    __key: string;
    /** @internal */
    __parent: null | NodeKey;
    /** @internal */
    __prev: null | NodeKey;
    /** @internal */
    __next: null | NodeKey;
    /**
     * Returns the string type of this node. Every node must
     * implement this and it MUST BE UNIQUE amongst nodes registered
     * on the editor.
     *
     */
    static getType(): string;
    /**
     * Clones this node, creating a new node with a different key
     * and adding it to the EditorState (but not attaching it anywhere!). All nodes must
     * implement this method.
     *
     */
    static clone(_data: unknown): LexicalNode;
    constructor(key?: NodeKey);
    /**
     * Returns the string type of this node.
     */
    getType(): string;
    /**
     * Returns true if there is a path between this node and the RootNode, false otherwise.
     * This is a way of determining if the node is "attached" EditorState. Unattached nodes
     * won't be reconciled and will ultimatelt be cleaned up by the Lexical GC.
     */
    isAttached(): boolean;
    /**
     * Returns true if this node is contained within the provided Selection., false otherwise.
     * Relies on the algorithms implemented in {@link BaseSelection.getNodes} to determine
     * what's included.
     *
     * @param selection - The selection that we want to determine if the node is in.
     */
    isSelected(selection?: null | RangeSelection | NodeSelection | GridSelection): boolean;
    /**
     * Returns this nodes key.
     */
    getKey(): NodeKey;
    /**
     * Returns the zero-based index of this node within the parent.
     */
    getIndexWithinParent(): number;
    /**
     * Returns the parent of this node, or null if none is found.
     */
    getParent<T extends ElementNode>(): T | null;
    /**
     * Returns the parent of this node, or throws if none is found.
     */
    getParentOrThrow<T extends ElementNode>(): T;
    /**
     * Returns the highest (in the EditorState tree)
     * non-root ancestor of this node, or null if none is found. See {@link lexical!$isRootOrShadowRoot}
     * for more information on which Elements comprise "roots".
     */
    getTopLevelElement(): ElementNode | this | null;
    /**
     * Returns the highest (in the EditorState tree)
     * non-root ancestor of this node, or throws if none is found. See {@link lexical!$isRootOrShadowRoot}
     * for more information on which Elements comprise "roots".
     */
    getTopLevelElementOrThrow(): ElementNode | this;
    /**
     * Returns a list of the every ancestor of this node,
     * all the way up to the RootNode.
     *
     */
    getParents(): Array<ElementNode>;
    /**
     * Returns a list of the keys of every ancestor of this node,
     * all the way up to the RootNode.
     *
     */
    getParentKeys(): Array<NodeKey>;
    /**
     * Returns the "previous" siblings - that is, the node that comes
     * before this one in the same parent.
     *
     */
    getPreviousSibling<T extends LexicalNode>(): T | null;
    /**
     * Returns the "previous" siblings - that is, the nodes that come between
     * this one and the first child of it's parent, inclusive.
     *
     */
    getPreviousSiblings<T extends LexicalNode>(): Array<T>;
    /**
     * Returns the "next" siblings - that is, the node that comes
     * after this one in the same parent
     *
     */
    getNextSibling<T extends LexicalNode>(): T | null;
    /**
     * Returns all "next" siblings - that is, the nodes that come between this
     * one and the last child of it's parent, inclusive.
     *
     */
    getNextSiblings<T extends LexicalNode>(): Array<T>;
    /**
     * Returns the closest common ancestor of this node and the provided one or null
     * if one cannot be found.
     *
     * @param node - the other node to find the common ancestor of.
     */
    getCommonAncestor<T extends ElementNode = ElementNode>(node: LexicalNode): T | null;
    /**
     * Returns true if the provided node is the exact same one as this node, from Lexical's perspective.
     * Always use this instead of referential equality.
     *
     * @param object - the node to perform the equality comparison on.
     */
    is(object: LexicalNode | null | undefined): boolean;
    /**
     * Returns true if this node logical precedes the target node in the editor state.
     *
     * @param targetNode - the node we're testing to see if it's after this one.
     */
    isBefore(targetNode: LexicalNode): boolean;
    /**
     * Returns true if this node is the parent of the target node, false otherwise.
     *
     * @param targetNode - the would-be child node.
     */
    isParentOf(targetNode: LexicalNode): boolean;
    /**
     * Returns a list of nodes that are between this node and
     * the target node in the EditorState.
     *
     * @param targetNode - the node that marks the other end of the range of nodes to be returned.
     */
    getNodesBetween(targetNode: LexicalNode): Array<LexicalNode>;
    /**
     * Returns true if this node has been marked dirty during this update cycle.
     *
     */
    isDirty(): boolean;
    /**
     * Returns the latest version of the node from the active EditorState.
     * This is used to avoid getting values from stale node references.
     *
     */
    getLatest(): this;
    /**
     * Returns a mutable version of the node. Will throw an error if
     * called outside of a Lexical Editor {@link LexicalEditor.update} callback.
     *
     */
    getWritable(): this;
    /**
     * Returns the text content of the node. Override this for
     * custom nodes that should have a representation in plain text
     * format (for copy + paste, for example)
     *
     */
    getTextContent(): string;
    /**
     * Returns the length of the string produced by calling getTextContent on this node.
     *
     */
    getTextContentSize(): number;
    /**
     * Called during the reconciliation process to determine which nodes
     * to insert into the DOM for this Lexical Node.
     *
     * This method must return exactly one HTMLElement. Nested elements are not supported.
     *
     * Do not attempt to update the Lexical EditorState during this phase of the update lifecyle.
     *
     * @param _config - allows access to things like the EditorTheme (to apply classes) during reconciliation.
     * @param _editor - allows access to the editor for context during reconciliation.
     *
     * */
    createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement;
    /**
     * Called when a node changes and should update the DOM
     * in whatever way is necessary to make it align with any changes that might
     * have happened during the update.
     *
     * Returning "true" here will cause lexical to unmount and recreate the DOM node
     * (by calling createDOM). You would need to do this if the element tag changes,
     * for instance.
     *
     * */
    updateDOM(_prevNode: unknown, _dom: HTMLElement, _config: EditorConfig): boolean;
    /**
     * Controls how the this node is serialized to HTML. This is important for
     * copy and paste between Lexical and non-Lexical editors, or Lexical editors with different namespaces,
     * in which case the primary transfer format is HTML. It's also important if you're serializing
     * to HTML for any other reason via {@link @lexical/html!$generateHtmlFromNodes}. You could
     * also use this method to build your own HTML renderer.
     *
     * */
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    /**
     * Controls how the this node is serialized to JSON. This is important for
     * copy and paste between Lexical editors sharing the same namespace. It's also important
     * if you're serializing to JSON for persistent storage somewhere.
     * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
     *
     * */
    exportJSON(): SerializedLexicalNode;
    /**
     * Controls how the this node is deserialized from JSON. This is usually boilerplate,
     * but provides an abstraction between the node implementation and serialized interface that can
     * be important if you ever make breaking changes to a node schema (by adding or removing properties).
     * See [Serialization & Deserialization](https://lexical.dev/docs/concepts/serialization#lexical---html).
     *
     * */
    static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode;
    /**
     * @experimental
     *
     * Registers the returned function as a transform on the node during
     * Editor initialization. Most such use cases should be addressed via
     * the {@link LexicalEditor.registerNodeTransform} API.
     *
     * Experimental - use at your own risk.
     */
    static transform(): ((node: LexicalNode) => void) | null;
    /**
     * Removes this LexicalNode from the EditorState. If the node isn't re-inserted
     * somewhere, the Lexical garbage collector will eventually clean it up.
     *
     * @param preserveEmptyParent - If falsy, the node's parent will be removed if
     * it's empty after the removal operation. This is the default behavior, subject to
     * other node heuristics such as {@link ElementNode#canBeEmpty}
     * */
    remove(preserveEmptyParent?: boolean): void;
    /**
     * Replaces this LexicalNode with the provided node, optionally transferring the children
     * of the replaced node to the replacing node.
     *
     * @param replaceWith - The node to replace this one with.
     * @param includeChildren - Whether or not to transfer the children of this node to the replacing node.
     * */
    replace<N extends LexicalNode>(replaceWith: N, includeChildren?: boolean): N;
    /**
     * Inserts a node after this LexicalNode (as the next sibling).
     *
     * @param nodeToInsert - The node to insert after this one.
     * @param restoreSelection - Whether or not to attempt to resolve the
     * selection to the appropriate place after the operation is complete.
     * */
    insertAfter(nodeToInsert: LexicalNode, restoreSelection?: boolean): LexicalNode;
    /**
     * Inserts a node before this LexicalNode (as the previous sibling).
     *
     * @param nodeToInsert - The node to insert after this one.
     * @param restoreSelection - Whether or not to attempt to resolve the
     * selection to the appropriate place after the operation is complete.
     * */
    insertBefore(nodeToInsert: LexicalNode, restoreSelection?: boolean): LexicalNode;
    /**
     * Whether or not this node has a required parent. Used during copy + paste operations
     * to normalize nodes that would otherwise be orphaned. For example, ListItemNodes without
     * a ListNode parent or TextNodes with a ParagraphNode parent.
     *
     * */
    isParentRequired(): boolean;
    /**
     * The creation logic for any required parent. Should be implemented if {@link isParentRequired} returns true.
     *
     * */
    createParentElementNode(): ElementNode;
    /**
     * Moves selection to the previous sibling of this node, at the specified offsets.
     *
     * @param anchorOffset - The anchor offset for selection.
     * @param focusOffset -  The focus offset for selection
     * */
    selectPrevious(anchorOffset?: number, focusOffset?: number): RangeSelection;
    /**
     * Moves selection to the next sibling of this node, at the specified offsets.
     *
     * @param anchorOffset - The anchor offset for selection.
     * @param focusOffset -  The focus offset for selection
     * */
    selectNext(anchorOffset?: number, focusOffset?: number): RangeSelection;
    /**
     * Marks a node dirty, triggering transforms and
     * forcing it to be reconciled during the update cycle.
     *
     * */
    markDirty(): void;
}
export {};
