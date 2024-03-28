/** @module @lexical/utils */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$cloneWithProperties} from '@lexical/selection';
import {
  $createParagraphNode,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  $splitNode,
  EditorState,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {IS_FIREFOX} from 'shared/environment';
import invariant from 'shared/invariant';
import normalizeClassNames from 'shared/normalizeClassNames';

export {default as markSelection} from './markSelection';
export {default as mergeRegister} from './mergeRegister';
export {default as positionNodeOnRange} from './positionNodeOnRange';
export {$splitNode, isHTMLAnchorElement, isHTMLElement} from 'lexical';

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
export function addClassNamesToElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void {
  const classesToAdd = normalizeClassNames(...classNames);
  if (classesToAdd.length > 0) {
    element.classList.add(...classesToAdd);
  }
}

/**
 * Takes an HTML element and removes the classNames passed within an array,
 * ignoring any non-string types. A space can be used to remove multiple classes
 * eg. removeClassNamesFromElement(element, ['active small', true, null])
 * will remove both the 'active' and 'small' classes from that element.
 * @param element - The element in which the classes are removed
 * @param classNames - An array defining the class names to remove from the element
 */
export function removeClassNamesFromElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void {
  const classesToRemove = normalizeClassNames(...classNames);
  if (classesToRemove.length > 0) {
    element.classList.remove(...classesToRemove);
  }
}

/**
 * Returns true if the file type matches the types passed within the acceptableMimeTypes array, false otherwise.
 * The types passed must be strings and are CASE-SENSITIVE.
 * eg. if file is of type 'text' and acceptableMimeTypes = ['TEXT', 'IMAGE'] the function will return false.
 * @param file - The file you want to type check.
 * @param acceptableMimeTypes - An array of strings of types which the file is checked against.
 * @returns true if the file is an acceptable mime type, false otherwise.
 */
export function isMimeType(
  file: File,
  acceptableMimeTypes: Array<string>,
): boolean {
  for (const acceptableType of acceptableMimeTypes) {
    if (file.type.startsWith(acceptableType)) {
      return true;
    }
  }
  return false;
}

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
export function mediaFileReader(
  files: Array<File>,
  acceptableMimeTypes: Array<string>,
): Promise<Array<{file: File; result: string}>> {
  const filesIterator = files[Symbol.iterator]();
  return new Promise((resolve, reject) => {
    const processed: Array<{file: File; result: string}> = [];
    const handleNextFile = () => {
      const {done, value: file} = filesIterator.next();
      if (done) {
        return resolve(processed);
      }
      const fileReader = new FileReader();
      fileReader.addEventListener('error', reject);
      fileReader.addEventListener('load', () => {
        const result = fileReader.result;
        if (typeof result === 'string') {
          processed.push({file, result});
        }
        handleNextFile();
      });
      if (isMimeType(file, acceptableMimeTypes)) {
        fileReader.readAsDataURL(file);
      } else {
        handleNextFile();
      }
    };
    handleNextFile();
  });
}

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
export function $dfs(
  startingNode?: LexicalNode,
  endingNode?: LexicalNode,
): Array<DFSNode> {
  const nodes = [];
  const start = (startingNode || $getRoot()).getLatest();
  const end =
    endingNode || ($isElementNode(start) ? start.getLastDescendant() : start);
  let node: LexicalNode | null = start;
  let depth = $getDepth(node);

  while (node !== null && !node.is(end)) {
    nodes.push({depth, node});

    if ($isElementNode(node) && node.getChildrenSize() > 0) {
      node = node.getFirstChild();
      depth++;
    } else {
      // Find immediate sibling or nearest parent sibling
      let sibling = null;

      while (sibling === null && node !== null) {
        sibling = node.getNextSibling();

        if (sibling === null) {
          node = node.getParent();
          depth--;
        } else {
          node = sibling;
        }
      }
    }
  }

  if (node !== null && node.is(end)) {
    nodes.push({depth, node});
  }

  return nodes;
}

function $getDepth(node: LexicalNode): number {
  let innerNode: LexicalNode | null = node;
  let depth = 0;

  while ((innerNode = innerNode.getParent()) !== null) {
    depth++;
  }

  return depth;
}

/**
 * Takes a node and traverses up its ancestors (toward the root node)
 * in order to find a specific type of node.
 * @param node - the node to begin searching.
 * @param klass - an instance of the type of node to look for.
 * @returns the node of type klass that was passed, or null if none exist.
 */
export function $getNearestNodeOfType<T extends ElementNode>(
  node: LexicalNode,
  klass: Klass<T>,
): T | null {
  let parent: ElementNode | LexicalNode | null = node;

  while (parent != null) {
    if (parent instanceof klass) {
      return parent as T;
    }

    parent = parent.getParent();
  }

  return null;
}

/**
 * Returns the element node of the nearest ancestor, otherwise throws an error.
 * @param startNode - The starting node of the search
 * @returns The ancestor node found
 */
export function $getNearestBlockElementAncestorOrThrow(
  startNode: LexicalNode,
): ElementNode {
  const blockNode = $findMatchingParent(
    startNode,
    (node) => $isElementNode(node) && !node.isInline(),
  );
  if (!$isElementNode(blockNode)) {
    invariant(
      false,
      'Expected node %s to have closest block element node.',
      startNode.__key,
    );
  }
  return blockNode;
}

export type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;

export type DOMNodeToLexicalConversionMap = Record<
  string,
  DOMNodeToLexicalConversion
>;

/**
 * Starts with a node and moves up the tree (toward the root node) to find a matching node based on
 * the search parameters of the findFn. (Consider JavaScripts' .find() function where a testing function must be
 * passed as an argument. eg. if( (node) => node.__type === 'div') ) return true; otherwise return false
 * @param startingNode - The node where the search starts.
 * @param findFn - A testing function that returns true if the current node satisfies the testing parameters.
 * @returns A parent node that matches the findFn parameters, or null if one wasn't found.
 */
export const $findMatchingParent: {
  <T extends LexicalNode>(
    startingNode: LexicalNode,
    findFn: (node: LexicalNode) => node is T,
  ): T | null;
  (
    startingNode: LexicalNode,
    findFn: (node: LexicalNode) => boolean,
  ): LexicalNode | null;
} = (
  startingNode: LexicalNode,
  findFn: (node: LexicalNode) => boolean,
): LexicalNode | null => {
  let curr: ElementNode | LexicalNode | null = startingNode;

  while (curr !== $getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }

    curr = curr.getParent();
  }

  return null;
};

/**
 * Attempts to resolve nested element nodes of the same type into a single node of that type.
 * It is generally used for marks/commenting
 * @param editor - The lexical editor
 * @param targetNode - The target for the nested element to be extracted from.
 * @param cloneNode - See {@link $createMarkNode}
 * @param handleOverlap - Handles any overlap between the node to extract and the targetNode
 * @returns The lexical editor
 */
export function registerNestedElementResolver<N extends ElementNode>(
  editor: LexicalEditor,
  targetNode: Klass<N>,
  cloneNode: (from: N) => N,
  handleOverlap: (from: N, to: N) => void,
): () => void {
  const $isTargetNode = (node: LexicalNode | null | undefined): node is N => {
    return node instanceof targetNode;
  };

  const $findMatch = (node: N): {child: ElementNode; parent: N} | null => {
    // First validate we don't have any children that are of the target,
    // as we need to handle them first.
    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if ($isTargetNode(child)) {
        return null;
      }
    }

    let parentNode: N | null = node;
    let childNode = node;

    while (parentNode !== null) {
      childNode = parentNode;
      parentNode = parentNode.getParent();

      if ($isTargetNode(parentNode)) {
        return {child: childNode, parent: parentNode};
      }
    }

    return null;
  };

  const elementNodeTransform = (node: N) => {
    const match = $findMatch(node);

    if (match !== null) {
      const {child, parent} = match;

      // Simple path, we can move child out and siblings into a new parent.

      if (child.is(node)) {
        handleOverlap(parent, node);
        const nextSiblings = child.getNextSiblings();
        const nextSiblingsLength = nextSiblings.length;
        parent.insertAfter(child);

        if (nextSiblingsLength !== 0) {
          const newParent = cloneNode(parent);
          child.insertAfter(newParent);

          for (let i = 0; i < nextSiblingsLength; i++) {
            newParent.append(nextSiblings[i]);
          }
        }

        if (!parent.canBeEmpty() && parent.getChildrenSize() === 0) {
          parent.remove();
        }
      } else {
        // Complex path, we have a deep node that isn't a child of the
        // target parent.
        // TODO: implement this functionality
      }
    }
  };

  return editor.registerNodeTransform(targetNode, elementNodeTransform);
}

/**
 * Clones the editor and marks it as dirty to be reconciled. If there was a selection,
 * it would be set back to its previous state, or null otherwise.
 * @param editor - The lexical editor
 * @param editorState - The editor's state
 */
export function $restoreEditorState(
  editor: LexicalEditor,
  editorState: EditorState,
): void {
  const FULL_RECONCILE = 2;
  const nodeMap = new Map();
  const activeEditorState = editor._pendingEditorState;

  for (const [key, node] of editorState._nodeMap) {
    const clone = $cloneWithProperties(node);
    if ($isTextNode(clone)) {
      invariant($isTextNode(node), 'Expected node be a TextNode');
      clone.__text = node.__text;
    }
    nodeMap.set(key, clone);
  }

  if (activeEditorState) {
    activeEditorState._nodeMap = nodeMap;
  }

  editor._dirtyType = FULL_RECONCILE;
  const selection = editorState._selection;
  $setSelection(selection === null ? null : selection.clone());
}

/**
 * If the selected insertion area is the root/shadow root node (see {@link lexical!$isRootOrShadowRoot}),
 * the node will be appended there, otherwise, it will be inserted before the insertion area.
 * If there is no selection where the node is to be inserted, it will be appended after any current nodes
 * within the tree, as a child of the root node. A paragraph node will then be added after the inserted node and selected.
 * @param node - The node to be inserted
 * @returns The node after its insertion
 */
export function $insertNodeToNearestRoot<T extends LexicalNode>(node: T): T {
  const selection = $getSelection() || $getPreviousSelection();

  if ($isRangeSelection(selection)) {
    const {focus} = selection;
    const focusNode = focus.getNode();
    const focusOffset = focus.offset;

    if ($isRootOrShadowRoot(focusNode)) {
      const focusChild = focusNode.getChildAtIndex(focusOffset);
      if (focusChild == null) {
        focusNode.append(node);
      } else {
        focusChild.insertBefore(node);
      }
      node.selectNext();
    } else {
      let splitNode: ElementNode;
      let splitOffset: number;
      if ($isTextNode(focusNode)) {
        splitNode = focusNode.getParentOrThrow();
        splitOffset = focusNode.getIndexWithinParent();
        if (focusOffset > 0) {
          splitOffset += 1;
          focusNode.splitText(focusOffset);
        }
      } else {
        splitNode = focusNode;
        splitOffset = focusOffset;
      }
      const [, rightTree] = $splitNode(splitNode, splitOffset);
      rightTree.insertBefore(node);
      rightTree.selectStart();
    }
  } else {
    if (selection != null) {
      const nodes = selection.getNodes();
      nodes[nodes.length - 1].getTopLevelElementOrThrow().insertAfter(node);
    } else {
      const root = $getRoot();
      root.append(node);
    }
    const paragraphNode = $createParagraphNode();
    node.insertAfter(paragraphNode);
    paragraphNode.select();
  }
  return node.getLatest();
}

/**
 * Wraps the node into another node created from a createElementNode function, eg. $createParagraphNode
 * @param node - Node to be wrapped.
 * @param createElementNode - Creates a new lexical element to wrap the to-be-wrapped node and returns it.
 * @returns A new lexical element with the previous node appended within (as a child, including its children).
 */
export function $wrapNodeInElement(
  node: LexicalNode,
  createElementNode: () => ElementNode,
): ElementNode {
  const elementNode = createElementNode();
  node.replace(elementNode);
  elementNode.append(node);
  return elementNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ObjectKlass<T> = new (...args: any[]) => T;

/**
 * @param object = The instance of the type
 * @param objectClass = The class of the type
 * @returns Whether the object is has the same Klass of the objectClass, ignoring the difference across window (e.g. different iframs)
 */
export function objectKlassEquals<T>(
  object: unknown,
  objectClass: ObjectKlass<T>,
): boolean {
  return object !== null
    ? Object.getPrototypeOf(object).constructor.name === objectClass.name
    : false;
}

/**
 * Filter the nodes
 * @param nodes Array of nodes that needs to be filtered
 * @param filterFn A filter function that returns node if the current node satisfies the condition otherwise null
 * @returns Array of filtered nodes
 */

export function $filter<T>(
  nodes: Array<LexicalNode>,
  filterFn: (node: LexicalNode) => null | T,
): Array<T> {
  const result: T[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = filterFn(nodes[i]);
    if (node !== null) {
      result.push(node);
    }
  }
  return result;
}
/**
 * Appends the node before the first child of the parent node
 * @param parent A parent node
 * @param node Node that needs to be appended
 */
export function $insertFirst(parent: ElementNode, node: LexicalNode): void {
  const firstChild = parent.getFirstChild();
  if (firstChild !== null) {
    firstChild.insertBefore(node);
  } else {
    parent.append(node);
  }
}

/**
 * Calculates the zoom level of an element as a result of using
 * css zoom property.
 * @param element
 */
export function calculateZoomLevel(element: Element | null): number {
  if (IS_FIREFOX) {
    return 1;
  }
  let zoom = 1;
  while (element) {
    zoom *= Number(window.getComputedStyle(element).getPropertyValue('zoom'));
    element = element.parentElement;
  }
  return zoom;
}
