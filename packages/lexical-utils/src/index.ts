/** @module @lexical/utils */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  createEditor,
  DEPRECATED_$isGridSelection,
  EditorState,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
  NodeKey,
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
      element.classList.add(...className.split(' '));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParseObject = any;

function unstable_internalCreateNodeFromParse(
  parsedNode: ParseObject,
  parsedNodeMap: Map<string, ParseObject>,
  editor: LexicalEditor,
  parentKey: null | NodeKey,
  activeEditorState: EditorState,
): LexicalNode {
  const nodeType = parsedNode.__type;
  const registeredNode = editor._nodes.get(nodeType);

  if (registeredNode === undefined) {
    invariant(false, 'createNodeFromParse: type "%s" + not found', nodeType);
  }

  // Check for properties that are editors
  for (const property in parsedNode) {
    const value = parsedNode[property];

    if (value != null && typeof value === 'object') {
      const parsedEditorState = value.editorState;

      if (parsedEditorState != null) {
        const nestedEditor = createEditor({
          namespace: parsedEditorState.namespace,
        });
        nestedEditor._nodes = editor._nodes;
        nestedEditor._parentEditor = editor._parentEditor;
        nestedEditor._pendingEditorState =
          unstable_convertLegacyJSONEditorState(
            nestedEditor,
            parsedEditorState,
          );
        parsedNode[property] = nestedEditor;
      }
    }
  }

  const NodeKlass = registeredNode.klass;
  const parsedKey = parsedNode.__key;
  // We set the parsedKey to undefined before calling clone() so that
  // we get a new random key assigned.
  parsedNode.__key = undefined;
  const node = NodeKlass.clone(parsedNode);
  parsedNode.__key = parsedKey;
  const key = node.__key;
  activeEditorState._nodeMap.set(key, node);

  node.__parent = parentKey;

  // We will need to recursively handle the children in the case
  // of a ElementNode.
  if ($isElementNode(node)) {
    const children = parsedNode.__children;

    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const parsedChild = parsedNodeMap.get(childKey);

      if (parsedChild !== undefined) {
        const child = unstable_internalCreateNodeFromParse(
          parsedChild,
          parsedNodeMap,
          editor,
          key,
          activeEditorState,
        );
        const newChildKey = child.__key;

        node.__children.push(newChildKey);
      }
    }

    node.__indent = parsedNode.__indent;
    node.__format = parsedNode.__format;
    node.__dir = parsedNode.__dir;
  } else if ($isTextNode(node)) {
    node.__format = parsedNode.__format;
    node.__style = parsedNode.__style;
    node.__mode = parsedNode.__mode;
    node.__detail = parsedNode.__detail;
  }
  return node;
}

function unstable_parseEditorState(
  parsedEditorState: ParseObject,
  editor: LexicalEditor,
): EditorState {
  // This is hacky, do not do this!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EditorStateClass: any = editor._editorState.constructor;
  const nodeMap = new Map();
  const editorState = new EditorStateClass(nodeMap);
  const parsedNodeMap: Map<string, ParseObject> = new Map(
    parsedEditorState._nodeMap,
  );
  // root always exists in Map
  const parsedRoot = parsedNodeMap.get('root');
  const isUpdating = editor._updating;
  try {
    editor._updating = false;
    editor.update(() => {
      const dirtyElements = editor._dirtyElements;
      const dirtyLeaves = editor._dirtyLeaves;
      const dirtyType = editor._dirtyType;
      editor._dirtyElements = new Map();
      editor._dirtyLeaves = new Set();
      editor._dirtyType = 0;
      try {
        unstable_internalCreateNodeFromParse(
          parsedRoot,
          parsedNodeMap,
          editor,
          null,
          editorState,
        );
      } finally {
        editor._dirtyElements = dirtyElements;
        editor._dirtyLeaves = dirtyLeaves;
        editor._dirtyType = dirtyType;
      }
    });
  } finally {
    editor._updating = isUpdating;
  }
  editorState._readOnly = true;
  return editorState;
}

// TODO: remove this function in version 0.4
export function unstable_convertLegacyJSONEditorState(
  editor: LexicalEditor,
  maybeStringifiedEditorState: string,
): EditorState {
  const parsedEditorState =
    typeof maybeStringifiedEditorState === 'string'
      ? JSON.parse(maybeStringifiedEditorState)
      : maybeStringifiedEditorState;
  return unstable_parseEditorState(parsedEditorState, editor);
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
    const focusNode = selection.focus.getNode();
    focusNode.getTopLevelElementOrThrow().insertAfter(node);
  } else if (
    $isNodeSelection(selection) ||
    DEPRECATED_$isGridSelection(selection)
  ) {
    const nodes = selection.getNodes();
    nodes[nodes.length - 1].getTopLevelElementOrThrow().insertAfter(node);
  } else {
    const root = $getRoot();
    root.append(node);
  }
  const paragraphNode = $createParagraphNode();
  node.insertAfter(paragraphNode);
  paragraphNode.select();
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
