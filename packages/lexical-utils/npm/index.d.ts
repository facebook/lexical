/** @module @lexical/utils */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { $splitNode, EditorState, ElementNode, isHTMLAnchorElement, isHTMLElement, Klass, LexicalEditor, LexicalNode } from 'lexical';
export { $splitNode, isHTMLAnchorElement, isHTMLElement };
export type DFSNode = Readonly<{
    depth: number;
    node: LexicalNode;
}>;
/**
 * Takes an HTML element and adds the classNames passed within an array,
 * ignoring any non-string types. A space can be used to add multiple classes
 * eg. addClassNamesToElement(element, ['element-inner active', true, null])
 * will add both 'element-inner' and 'active' as classes to that element.
 * @param element - The element in which the classes are added
 * @param classNames - An array defining the class names to add to the element
 */
export declare function addClassNamesToElement(element: HTMLElement, ...classNames: Array<typeof undefined | boolean | null | string>): void;
/**
 * Takes an HTML element and removes the classNames passed within an array,
 * ignoring any non-string types. A space can be used to remove multiple classes
 * eg. removeClassNamesFromElement(element, ['active small', true, null])
 * will remove both the 'active' and 'small' classes from that element.
 * @param element - The element in which the classes are removed
 * @param classNames - An array defining the class names to remove from the element
 */
export declare function removeClassNamesFromElement(element: HTMLElement, ...classNames: Array<typeof undefined | boolean | null | string>): void;
/**
 * Returns true if the file type matches the types passed within the acceptableMimeTypes array, false otherwise.
 * The types passed must be strings and are CASE-SENSITIVE.
 * eg. if file is of type 'text' and acceptableMimeTypes = ['TEXT', 'IMAGE'] the function will return false.
 * @param file - The file you want to type check.
 * @param acceptableMimeTypes - An array of strings of types which the file is checked against.
 * @returns true if the file is an acceptable mime type, false otherwise.
 */
export declare function isMimeType(file: File, acceptableMimeTypes: Array<string>): boolean;
/**
 * Lexical File Reader with:
 *  1. MIME type support
 *  2. batched results (HistoryPlugin compatibility)
 *  3. Order aware (respects the order when multiple Files are passed)
 *
 * const filesResult = await mediaFileReader(files, ['image/']);
 * filesResult.forEach(file => editor.dispatchCommand('INSERT_IMAGE', {
 *   src: file.result,
 * }));
 */
export declare function mediaFileReader(files: Array<File>, acceptableMimeTypes: Array<string>): Promise<Array<{
    file: File;
    result: string;
}>>;
/**
 * "Depth-First Search" starts at the root/top node of a tree and goes as far as it can down a branch end
 * before backtracking and finding a new path. Consider solving a maze by hugging either wall, moving down a
 * branch until you hit a dead-end (leaf) and backtracking to find the nearest branching path and repeat.
 * It will then return all the nodes found in the search in an array of objects.
 * @param startingNode - The node to start the search, if ommitted, it will start at the root node.
 * @param endingNode - The node to end the search, if ommitted, it will find all descendants of the startingNode.
 * @returns An array of objects of all the nodes found by the search, including their depth into the tree.
 * {depth: number, node: LexicalNode} It will always return at least 1 node (the ending node) so long as it exists
 */
export declare function $dfs(startingNode?: LexicalNode, endingNode?: LexicalNode): Array<DFSNode>;
/**
 * Takes a node and traverses up its ancestors (toward the root node)
 * in order to find a specific type of node.
 * @param node - the node to begin searching.
 * @param klass - an instance of the type of node to look for.
 * @returns the node of type klass that was passed, or null if none exist.
 */
export declare function $getNearestNodeOfType<T extends ElementNode>(node: LexicalNode, klass: Klass<T>): T | null;
/**
 * Returns the element node of the nearest ancestor, otherwise throws an error.
 * @param startNode - The starting node of the search
 * @returns The ancestor node found
 */
export declare function $getNearestBlockElementAncestorOrThrow(startNode: LexicalNode): ElementNode;
export type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;
export type DOMNodeToLexicalConversionMap = Record<string, DOMNodeToLexicalConversion>;
/**
 * Starts with a node and moves up the tree (toward the root node) to find a matching node based on
 * the search parameters of the findFn. (Consider JavaScripts' .find() function where a testing function must be
 * passed as an argument. eg. if( (node) => node.__type === 'div') ) return true; otherwise return false
 * @param startingNode - The node where the search starts.
 * @param findFn - A testing function that returns true if the current node satisfies the testing parameters.
 * @returns A parent node that matches the findFn parameters, or null if one wasn't found.
 */
export declare function $findMatchingParent(startingNode: LexicalNode, findFn: (node: LexicalNode) => boolean): LexicalNode | null;
type Func = () => void;
/**
 * Returns a function that will execute all functions passed when called. It is generally used
 * to register multiple lexical listeners and then tear them down with a single function call, such
 * as React's useEffect hook.
 * @example
 * ```ts
 * useEffect(() => {
 *   return mergeRegister(
 *     editor.registerCommand(...registerCommand1 logic),
 *     editor.registerCommand(...registerCommand2 logic),
 *     editor.registerCommand(...registerCommand3 logic)
 *   )
 * }, [editor])
 * ```
 * In this case, useEffect is returning the function returned by mergeRegister as a cleanup
 * function to be executed after either the useEffect runs again (due to one of its dependencies
 * updating) or the compenent it resides in unmounts.
 * Note the functions don't neccesarily need to be in an array as all arguements
 * are considered to be the func argument and spread from there.
 * @param func - An array of functions meant to be executed by the returned function.
 * @returns the function which executes all the passed register command functions.
 */
export declare function mergeRegister(...func: Array<Func>): () => void;
/**
 * Attempts to resolve nested element nodes of the same type into a single node of that type.
 * It is generally used for marks/commenting
 * @param editor - The lexical editor
 * @param targetNode - The target for the nested element to be extracted from.
 * @param cloneNode - See {@link $createMarkNode}
 * @param handleOverlap - Handles any overlap between the node to extract and the targetNode
 * @returns The lexical editor
 */
export declare function registerNestedElementResolver<N extends ElementNode>(editor: LexicalEditor, targetNode: Klass<N>, cloneNode: (from: N) => N, handleOverlap: (from: N, to: N) => void): () => void;
/**
 * Clones the editor and marks it as dirty to be reconciled. If there was a selection,
 * it would be set back to its previous state, or null otherwise.
 * @param editor - The lexical editor
 * @param editorState - The editor's state
 */
export declare function $restoreEditorState(editor: LexicalEditor, editorState: EditorState): void;
/**
 * If the selected insertion area is the root/shadow root node (see {@link lexical!$isRootOrShadowRoot}),
 * the node will be appended there, otherwise, it will be inserted before the insertion area.
 * If there is no selection where the node is to be inserted, it will be appended after any current nodes
 * within the tree, as a child of the root node. A paragraph node will then be added after the inserted node and selected.
 * @param node - The node to be inserted
 * @returns The node after its insertion
 */
export declare function $insertNodeToNearestRoot<T extends LexicalNode>(node: T): T;
/**
 * Wraps the node into another node created from a createElementNode function, eg. $createParagraphNode
 * @param node - Node to be wrapped.
 * @param createElementNode - Creates a new lexcial element to wrap the to-be-wrapped node and returns it.
 * @returns A new lexcial element with the previous node appended within (as a child, including its children).
 */
export declare function $wrapNodeInElement(node: LexicalNode, createElementNode: () => ElementNode): ElementNode;
type ObjectKlass<T> = new (...args: any[]) => T;
/**
 * @param object = The instance of the type
 * @param objectClass = The class of the type
 * @returns Whether the object is has the same Klass of the objectClass, ignoring the difference across window (e.g. different iframs)
 */
export declare function objectKlassEquals<T>(object: unknown, objectClass: ObjectKlass<T>): boolean;
/**
 * Filter the nodes
 * @param nodes Array of nodes that needs to be filtered
 * @param filterFn A filter function that returns node if the current node satisfies the condition otherwise null
 * @returns Array of filtered nodes
 */
export declare function $filter<T>(nodes: Array<LexicalNode>, filterFn: (node: LexicalNode) => null | T): Array<T>;
/**
 * Appends the node before the first child of the parent node
 * @param parent A parent node
 * @param node Node that needs to be appended
 */
export declare function $insertFirst(parent: ElementNode, node: LexicalNode): void;
