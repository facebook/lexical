/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $caretFromPoint,
  $cloneWithProperties,
  $createParagraphNode,
  $findMatchingParent,
  $getAdjacentChildCaret,
  $getAdjacentSiblingOrParentSiblingCaret,
  $getCaretInDirection,
  $getChildCaret,
  $getChildCaretOrSelf,
  $getCollapsedCaretRange,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $getSiblingCaret,
  $getState,
  $isChildCaret,
  $isElementNode,
  $isRangeSelection,
  $isSiblingCaret,
  $isTextPointCaret,
  $normalizeCaret,
  $rewindSiblingCaret,
  $setSelection,
  $setSelectionFromCaretRange,
  $setState,
  $splitAtPointCaretNext,
  type CaretDirection,
  type EditorState,
  ElementNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  makeStepwiseIterator,
  type NodeCaret,
  type NodeKey,
  PointCaret,
  type SiblingCaret,
  SplitAtPointCaretNextOptions,
  StateConfig,
  ValueOrUpdater,
} from 'lexical';
// This underscore postfixing is used as a hotfix so we do not
// export shared types from this module #5918
import {CAN_USE_DOM as CAN_USE_DOM_} from 'shared/canUseDOM';
import {
  CAN_USE_BEFORE_INPUT as CAN_USE_BEFORE_INPUT_,
  IS_ANDROID as IS_ANDROID_,
  IS_ANDROID_CHROME as IS_ANDROID_CHROME_,
  IS_APPLE as IS_APPLE_,
  IS_APPLE_WEBKIT as IS_APPLE_WEBKIT_,
  IS_CHROME as IS_CHROME_,
  IS_FIREFOX as IS_FIREFOX_,
  IS_IOS as IS_IOS_,
  IS_SAFARI as IS_SAFARI_,
} from 'shared/environment';
import invariant from 'shared/invariant';
import normalizeClassNames from 'shared/normalizeClassNames';

export {default as markSelection} from './markSelection';
export {default as mergeRegister} from './mergeRegister';
export {default as positionNodeOnRange} from './positionNodeOnRange';
export {default as selectionAlwaysOnDisplay} from './selectionAlwaysOnDisplay';
export {
  $findMatchingParent,
  $getAdjacentSiblingOrParentSiblingCaret,
  $splitNode,
  isBlockDomNode,
  isHTMLAnchorElement,
  isHTMLElement,
  isInlineDomNode,
} from 'lexical';
// Hotfix to export these with inlined types #5918
export const CAN_USE_BEFORE_INPUT: boolean = CAN_USE_BEFORE_INPUT_;
export const CAN_USE_DOM: boolean = CAN_USE_DOM_;
export const IS_ANDROID: boolean = IS_ANDROID_;
export const IS_ANDROID_CHROME: boolean = IS_ANDROID_CHROME_;
export const IS_APPLE: boolean = IS_APPLE_;
export const IS_APPLE_WEBKIT: boolean = IS_APPLE_WEBKIT_;
export const IS_CHROME: boolean = IS_CHROME_;
export const IS_FIREFOX: boolean = IS_FIREFOX_;
export const IS_IOS: boolean = IS_IOS_;
export const IS_SAFARI: boolean = IS_SAFARI_;

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
 * filesResult.forEach(file => editor.dispatchCommand('INSERT_IMAGE', \\{
 *   src: file.result,
 * \\}));
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

export interface DFSNode {
  readonly depth: number;
  readonly node: LexicalNode;
}

/**
 * "Depth-First Search" starts at the root/top node of a tree and goes as far as it can down a branch end
 * before backtracking and finding a new path. Consider solving a maze by hugging either wall, moving down a
 * branch until you hit a dead-end (leaf) and backtracking to find the nearest branching path and repeat.
 * It will then return all the nodes found in the search in an array of objects.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An array of objects of all the nodes found by the search, including their depth into the tree.
 * \\{depth: number, node: LexicalNode\\} It will always return at least 1 node (the start node).
 */
export function $dfs(
  startNode?: LexicalNode,
  endNode?: LexicalNode,
): Array<DFSNode> {
  return Array.from($dfsIterator(startNode, endNode));
}

/**
 * Get the adjacent caret in the same direction
 *
 * @param caret A caret or null
 * @returns `caret.getAdjacentCaret()` or `null`
 */
export function $getAdjacentCaret<D extends CaretDirection>(
  caret: null | NodeCaret<D>,
): null | SiblingCaret<LexicalNode, D> {
  return caret ? caret.getAdjacentCaret() : null;
}

/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export function $reverseDfs(
  startNode?: LexicalNode,
  endNode?: LexicalNode,
): Array<DFSNode> {
  return Array.from($reverseDfsIterator(startNode, endNode));
}

/**
 * $dfs iterator (left to right). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export function $dfsIterator(
  startNode?: LexicalNode,
  endNode?: LexicalNode,
): IterableIterator<DFSNode> {
  return $dfsCaretIterator('next', startNode, endNode);
}

function $getEndCaret<D extends CaretDirection>(
  startNode: LexicalNode,
  direction: D,
): null | NodeCaret<D> {
  const rval = $getAdjacentSiblingOrParentSiblingCaret(
    $getSiblingCaret(startNode, direction),
  );
  return rval && rval[0];
}

function $dfsCaretIterator<D extends CaretDirection>(
  direction: D,
  startNode?: LexicalNode,
  endNode?: LexicalNode,
): IterableIterator<DFSNode> {
  const root = $getRoot();
  const start = startNode || root;
  const startCaret = $isElementNode(start)
    ? $getChildCaret(start, direction)
    : $getSiblingCaret(start, direction);
  const startDepth = $getDepth(start);
  const endCaret = endNode
    ? $getAdjacentChildCaret(
        $getChildCaretOrSelf($getSiblingCaret(endNode, direction)),
      )
    : $getEndCaret(start, direction);
  let depth = startDepth;
  return makeStepwiseIterator({
    hasNext: (state): state is NodeCaret<'next'> => state !== null,
    initial: startCaret,
    map: (state) => ({depth, node: state.origin}),
    step: (state: NodeCaret<'next'>) => {
      if (state.isSameNodeCaret(endCaret)) {
        return null;
      }
      if ($isChildCaret(state)) {
        depth++;
      }
      const rval = $getAdjacentSiblingOrParentSiblingCaret(state);
      if (!rval || rval[0].isSameNodeCaret(endCaret)) {
        return null;
      }
      depth += rval[1];
      return rval[0];
    },
  });
}

/**
 * Returns the Node sibling when this exists, otherwise the closest parent sibling. For example
 * R -> P -> T1, T2
 *   -> P2
 * returns T2 for node T1, P2 for node T2, and null for node P2.
 * @param node LexicalNode.
 * @returns An array (tuple) containing the found Lexical node and the depth difference, or null, if this node doesn't exist.
 */
export function $getNextSiblingOrParentSibling(
  node: LexicalNode,
): null | [LexicalNode, number] {
  const rval = $getAdjacentSiblingOrParentSiblingCaret(
    $getSiblingCaret(node, 'next'),
  );
  return rval && [rval[0].origin, rval[1]];
}

export function $getDepth(node: null | LexicalNode): number {
  let depth = -1;
  for (
    let innerNode = node;
    innerNode !== null;
    innerNode = innerNode.getParent()
  ) {
    depth++;
  }
  return depth;
}

/**
 * Performs a right-to-left preorder tree traversal.
 * From the starting node it goes to the rightmost child, than backtracks to parent and finds new rightmost path.
 * It will return the next node in traversal sequence after the startingNode.
 * The traversal is similar to $dfs functions above, but the nodes are visited right-to-left, not left-to-right.
 * @param startingNode - The node to start the search.
 * @returns The next node in pre-order right to left traversal sequence or `null`, if the node does not exist
 */
export function $getNextRightPreorderNode(
  startingNode: LexicalNode,
): LexicalNode | null {
  const startCaret = $getChildCaretOrSelf(
    $getSiblingCaret(startingNode, 'previous'),
  );
  const next = $getAdjacentSiblingOrParentSiblingCaret(startCaret, 'root');
  return next && next[0].origin;
}

/**
 * $dfs iterator (right to left). Tree traversal is done on the fly as new values are requested with O(1) memory.
 * @param startNode - The node to start the search, if omitted, it will start at the root node.
 * @param endNode - The node to end the search, if omitted, it will find all descendants of the startingNode.
 * @returns An iterator, each yielded value is a DFSNode. It will always return at least 1 node (the start node).
 */
export function $reverseDfsIterator(
  startNode?: LexicalNode,
  endNode?: LexicalNode,
): IterableIterator<DFSNode> {
  return $dfsCaretIterator('previous', startNode, endNode);
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

  const $elementNodeTransform = (node: N) => {
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

  return editor.registerNodeTransform(targetNode, $elementNodeTransform);
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
    nodeMap.set(key, $cloneWithProperties(node));
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
 * within the tree, as a child of the root node. A paragraph will then be added after the inserted node and selected.
 * @param node - The node to be inserted
 * @returns The node after its insertion
 */
export function $insertNodeToNearestRoot<T extends LexicalNode>(node: T): T {
  const selection = $getSelection() || $getPreviousSelection();
  let initialCaret: undefined | PointCaret<'next'>;
  if ($isRangeSelection(selection)) {
    initialCaret = $caretFromPoint(selection.focus, 'next');
  } else {
    if (selection != null) {
      const nodes = selection.getNodes();
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        initialCaret = $getSiblingCaret(lastNode, 'next');
      }
    }
    initialCaret =
      initialCaret ||
      $getChildCaret($getRoot(), 'previous')
        .getFlipped()
        .insert($createParagraphNode());
  }
  const insertCaret = $insertNodeToNearestRootAtCaret(node, initialCaret);
  const adjacent = $getAdjacentChildCaret(insertCaret);
  const selectionCaret = $isChildCaret(adjacent)
    ? $normalizeCaret(adjacent)
    : insertCaret;
  $setSelectionFromCaretRange($getCollapsedCaretRange(selectionCaret));
  return node.getLatest();
}

/**
 * If the insertion caret is the root/shadow root node (see {@link lexical!$isRootOrShadowRoot}),
 * the node will be inserted there, otherwise the parent nodes will be split according to the
 * given options.
 * @param node - The node to be inserted
 * @param caret - The location to insert or split from
 * @returns The node after its insertion
 */
export function $insertNodeToNearestRootAtCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(
  node: T,
  caret: PointCaret<D>,
  options?: SplitAtPointCaretNextOptions,
): NodeCaret<D> {
  let insertCaret: PointCaret<'next'> = $getCaretInDirection(caret, 'next');
  for (
    let nextCaret: null | PointCaret<'next'> = insertCaret;
    nextCaret;
    nextCaret = $splitAtPointCaretNext(nextCaret, options)
  ) {
    insertCaret = nextCaret;
  }
  invariant(
    !$isTextPointCaret(insertCaret),
    '$insertNodeToNearestRootAtCaret: An unattached TextNode can not be split',
  );
  insertCaret.insert(
    node.isInline() ? $createParagraphNode().append(node) : node,
  );
  return $getCaretInDirection(
    $getSiblingCaret(node.getLatest(), 'next'),
    caret.direction,
  );
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
export type ObjectKlass<T> = new (...args: any[]) => T;

/**
 * @param object = The instance of the type
 * @param objectClass = The class of the type
 * @returns Whether the object is has the same Klass of the objectClass, ignoring the difference across window (e.g. different iframes)
 */
export function objectKlassEquals<T>(
  object: unknown,
  objectClass: ObjectKlass<T>,
): object is T {
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
  $getChildCaret(parent, 'next').insert(node);
}

let NEEDS_MANUAL_ZOOM = IS_FIREFOX || !CAN_USE_DOM ? false : undefined;
function needsManualZoom(): boolean {
  if (NEEDS_MANUAL_ZOOM === undefined) {
    // If the browser implements standardized CSS zoom, then the client rect
    // will be wider after zoom is applied
    // https://chromestatus.com/feature/5198254868529152
    // https://github.com/facebook/lexical/issues/6863
    const div = document.createElement('div');
    div.style.cssText =
      'position: absolute; opacity: 0; width: 100px; left: -1000px;';
    document.body.appendChild(div);
    const noZoom = div.getBoundingClientRect();
    div.style.setProperty('zoom', '2');
    NEEDS_MANUAL_ZOOM = div.getBoundingClientRect().width === noZoom.width;
    document.body.removeChild(div);
  }
  return NEEDS_MANUAL_ZOOM;
}

/**
 * Calculates the zoom level of an element as a result of using
 * css zoom property. For browsers that implement standardized CSS
 * zoom (Firefox, Chrome >= 128), this will always return 1.
 * @param element
 */
export function calculateZoomLevel(element: Element | null): number {
  let zoom = 1;
  if (needsManualZoom()) {
    while (element) {
      zoom *= Number(window.getComputedStyle(element).getPropertyValue('zoom'));
      element = element.parentElement;
    }
  }
  return zoom;
}

/**
 * Checks if the editor is a nested editor created by LexicalNestedComposer
 */
export function $isEditorIsNestedEditor(editor: LexicalEditor): boolean {
  return editor._parentEditor !== null;
}

/**
 * A depth first last-to-first traversal of root that stops at each node that matches
 * $predicate and ensures that its parent is root. This is typically used to discard
 * invalid or unsupported wrapping nodes. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * @param root The root to start the traversal
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns true if this unwrapped or removed any nodes
 */
export function $unwrapAndFilterDescendants(
  root: ElementNode,
  $predicate: (node: LexicalNode) => boolean,
): boolean {
  return $unwrapAndFilterDescendantsImpl(root, $predicate, null);
}

function $unwrapAndFilterDescendantsImpl(
  root: ElementNode,
  $predicate: (node: LexicalNode) => boolean,
  $onSuccess: null | ((node: LexicalNode) => void),
): boolean {
  let didMutate = false;
  for (const node of $lastToFirstIterator(root)) {
    if ($predicate(node)) {
      if ($onSuccess !== null) {
        $onSuccess(node);
      }
      continue;
    }
    didMutate = true;
    if ($isElementNode(node)) {
      $unwrapAndFilterDescendantsImpl(
        node,
        $predicate,
        $onSuccess || ((child) => node.insertAfter(child)),
      );
    }
    node.remove();
  }
  return didMutate;
}

/**
 * A depth first traversal of the children array that stops at and collects
 * each node that `$predicate` matches. This is typically used to discard
 * invalid or unsupported wrapping nodes on a children array in the `after`
 * of an {@link lexical!DOMConversionOutput}. For example, a TableNode must only have
 * TableRowNode as children, but an importer might add invalid nodes based on
 * caption, tbody, thead, etc. and this will unwrap and discard those.
 *
 * This function is read-only and performs no mutation operations, which makes
 * it suitable for import and export purposes but likely not for any in-place
 * mutation. You should use {@link $unwrapAndFilterDescendants} for in-place
 * mutations such as node transforms.
 *
 * @param children The children to traverse
 * @param $predicate Should return true for nodes that are permitted to be children of root
 * @returns The children or their descendants that match $predicate
 */
export function $descendantsMatching<T extends LexicalNode>(
  children: LexicalNode[],
  $predicate: (node: LexicalNode) => node is T,
): T[];
export function $descendantsMatching(
  children: LexicalNode[],
  $predicate: (node: LexicalNode) => boolean,
): LexicalNode[] {
  const result: LexicalNode[] = [];
  const stack = Array.from(children).reverse();
  for (let child = stack.pop(); child !== undefined; child = stack.pop()) {
    if ($predicate(child)) {
      result.push(child);
    } else if ($isElementNode(child)) {
      for (const grandchild of $lastToFirstIterator(child)) {
        stack.push(grandchild);
      }
    }
  }
  return result;
}

/**
 * Return an iterator that yields each child of node from first to last, taking
 * care to preserve the next sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
export function $firstToLastIterator(node: ElementNode): Iterable<LexicalNode> {
  return $childIterator($getChildCaret(node, 'next'));
}

/**
 * Return an iterator that yields each child of node from last to first, taking
 * care to preserve the previous sibling before yielding the value in case the caller
 * removes the yielded node.
 *
 * @param node The node whose children to iterate
 * @returns An iterator of the node's children
 */
export function $lastToFirstIterator(node: ElementNode): Iterable<LexicalNode> {
  return $childIterator($getChildCaret(node, 'previous'));
}

function $childIterator<D extends CaretDirection>(
  startCaret: NodeCaret<D>,
): IterableIterator<LexicalNode> {
  const seen = __DEV__ ? new Set<NodeKey>() : null;
  return makeStepwiseIterator({
    hasNext: $isSiblingCaret,
    initial: startCaret.getAdjacentCaret(),
    map: (caret) => {
      const origin = caret.origin.getLatest();
      if (__DEV__ && seen !== null) {
        const key = origin.getKey();
        invariant(
          !seen.has(key),
          '$childIterator: Cycle detected, node with key %s has already been traversed',
          String(key),
        );
        seen.add(key);
      }
      return origin;
    },
    step: (caret: SiblingCaret<LexicalNode, D>) => caret.getAdjacentCaret(),
  });
}

/**
 * Replace this node with its children
 *
 * @param node The ElementNode to unwrap and remove
 */
export function $unwrapNode(node: ElementNode): void {
  $rewindSiblingCaret($getSiblingCaret(node, 'next')).splice(
    1,
    node.getChildren(),
  );
}

/**
 * A wrapper that creates bound functions and methods for the
 * StateConfig to save some boilerplate when defining methods
 * or exporting only the accessors from your modules rather
 * than exposing the StateConfig directly.
 */
export interface StateConfigWrapper<K extends string, V> {
  /** A reference to the stateConfig */
  readonly stateConfig: StateConfig<K, V>;
  /** `(node) => $getState(node, stateConfig)` */
  readonly $get: <T extends LexicalNode>(node: T) => V;
  /** `(node, valueOrUpdater) => $setState(node, stateConfig, valueOrUpdater)` */
  readonly $set: <T extends LexicalNode>(
    node: T,
    valueOrUpdater: ValueOrUpdater<V>,
  ) => T;
  /** `[$get, $set]` */
  readonly accessors: readonly [$get: this['$get'], $set: this['$set']];
  /**
   * `() => function () { return $get(this) }`
   *
   * Should be called with an explicit `this` type parameter.
   *
   * @example
   * ```ts
   * class MyNode {
   *   // …
   *   myGetter = myWrapper.makeGetterMethod<this>();
   * }
   * ```
   */
  makeGetterMethod<T extends LexicalNode>(): (this: T) => V;
  /**
   * `() => function (valueOrUpdater) { return $set(this, valueOrUpdater) }`
   *
   * Must be called with an explicit `this` type parameter.
   *
   * @example
   * ```ts
   * class MyNode {
   *   // …
   *   mySetter = myWrapper.makeSetterMethod<this>();
   * }
   * ```
   */
  makeSetterMethod<T extends LexicalNode>(): (
    this: T,
    valueOrUpdater: ValueOrUpdater<V>,
  ) => T;
}

/**
 * EXPERIMENTAL
 *
 * A convenience interface for working with {@link $getState} and
 * {@link $setState}.
 *
 * @param stateConfig The stateConfig to wrap with convenience functionality
 * @returns a StateWrapper
 */
export function makeStateWrapper<K extends string, V>(
  stateConfig: StateConfig<K, V>,
): StateConfigWrapper<K, V> {
  const $get: StateConfigWrapper<K, V>['$get'] = (node) =>
    $getState(node, stateConfig);
  const $set: StateConfigWrapper<K, V>['$set'] = (node, valueOrUpdater) =>
    $setState(node, stateConfig, valueOrUpdater);
  return {
    $get,
    $set,
    accessors: [$get, $set],
    makeGetterMethod: () =>
      function $getter() {
        return $get(this);
      },
    makeSetterMethod: () =>
      function $setter(valueOrUpdater) {
        return $set(this, valueOrUpdater);
      },
    stateConfig,
  };
}
