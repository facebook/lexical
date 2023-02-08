/** @module @lexical/utils */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $copyNode,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  DEPRECATED_$isGridSelection,
  EditorState,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

export type DFSNode = Readonly<{
  depth: number;
  node: LexicalNode;
}>;

export function addClassNamesToElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void {
  classNames.forEach((className) => {
    if (typeof className === 'string') {
      const classesToAdd = className.split(' ').filter((n) => n !== '');
      element.classList.add(...classesToAdd);
    }
  });
}

export function removeClassNamesFromElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void {
  classNames.forEach((className) => {
    if (typeof className === 'string') {
      element.classList.remove(...className.split(' '));
    }
  });
}

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

export function $findMatchingParent(
  startingNode: LexicalNode,
  findFn: (node: LexicalNode) => boolean,
): LexicalNode | null {
  let curr: ElementNode | LexicalNode | null = startingNode;

  while (curr !== $getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }

    curr = curr.getParent();
  }

  return null;
}

type Func = () => void;

export function mergeRegister(...func: Array<Func>): () => void {
  return () => {
    func.forEach((f) => f());
  };
}

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

export function $restoreEditorState(
  editor: LexicalEditor,
  editorState: EditorState,
): void {
  const FULL_RECONCILE = 2;
  const nodeMap = new Map(editorState._nodeMap);
  const activeEditorState = editor._pendingEditorState;

  if (activeEditorState) {
    activeEditorState._nodeMap = nodeMap;
  }

  editor._dirtyType = FULL_RECONCILE;
  const selection = editorState._selection;
  $setSelection(selection === null ? null : selection.clone());
}

export function $insertNodeToNearestRoot<T extends LexicalNode>(node: T): T {
  const selection = $getSelection();
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
    if ($isNodeSelection(selection) || DEPRECATED_$isGridSelection(selection)) {
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

export function $wrapNodeInElement(
  node: LexicalNode,
  createElementNode: () => ElementNode,
): ElementNode {
  const elementNode = createElementNode();
  node.replace(elementNode);
  elementNode.append(node);
  return elementNode;
}

export function $splitNode(
  node: ElementNode,
  offset: number,
): [ElementNode | null, ElementNode] {
  let startNode = node.getChildAtIndex(offset);
  if (startNode == null) {
    startNode = node;
  }

  invariant(
    !$isRootOrShadowRoot(node),
    'Can not call $splitNode() on root element',
  );

  const recurse = (
    currentNode: LexicalNode,
  ): [ElementNode, ElementNode, LexicalNode] => {
    const parent = currentNode.getParentOrThrow();
    const isParentRoot = $isRootOrShadowRoot(parent);
    // The node we start split from (leaf) is moved, but its recursive
    // parents are copied to create separate tree
    const nodeToMove =
      currentNode === startNode && !isParentRoot
        ? currentNode
        : $copyNode(currentNode);

    if (isParentRoot) {
      currentNode.insertAfter(nodeToMove);
      return [
        currentNode as ElementNode,
        nodeToMove as ElementNode,
        nodeToMove,
      ];
    } else {
      const [leftTree, rightTree, newParent] = recurse(parent);
      const nextSiblings = currentNode.getNextSiblings();

      newParent.append(nodeToMove, ...nextSiblings);
      return [leftTree, rightTree, nodeToMove];
    }
  };

  const [leftTree, rightTree] = recurse(startNode);

  return [leftTree, rightTree];
}
