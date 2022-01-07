/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  IntentionallyMarkedAsDirtyElement,
  RegisteredNode,
} from './LexicalEditor';
import type {RootNode} from './nodes/base/LexicalRootNode';
import type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
import type {TextNode, TextFormatType} from './nodes/base/LexicalTextNode';
import type {Node as ReactNode} from 'react';
import type {EditorState} from './LexicalEditorState';
import type {Selection} from './LexicalSelection';

import {
  RTL_REGEX,
  LTR_REGEX,
  TEXT_TYPE_TO_FORMAT,
  HAS_DIRTY_NODES,
} from './LexicalConstants';
import {
  $isTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isDecoratorNode,
} from '.';
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  updateEditor,
} from './LexicalUpdates';
import {flushRootMutations} from './LexicalMutations';
import invariant from 'shared/invariant';

export const emptyFunction = () => {};

let keyCounter = 0;

export function resetRandomKey(): void {
  keyCounter = 0;
}

export function generateRandomKey(): string {
  return '' + keyCounter++;
}

export function getRegisteredNodeOrThrow(
  editor: LexicalEditor,
  nodeType: string,
): RegisteredNode {
  const registeredNode = editor._registeredNodes.get(nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'registeredNode: Type %s not found', nodeType);
  }
  return registeredNode;
}

export const isArray = Array.isArray;

const NativePromise = window.Promise;

export const scheduleMicroTask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => NativePromise.resolve().then(fn);

export function isSelectionWithinEditor(
  editor: LexicalEditor,
  anchorDOM: null | Node,
  focusDOM: null | Node,
): boolean {
  const rootElement = editor.getRootElement();
  try {
    return (
      rootElement !== null &&
      rootElement.contains(anchorDOM) &&
      rootElement.contains(focusDOM) &&
      // If selection is inside a decorator, then we treat it as
      // if the focus is not in Lexical.
      anchorDOM != null &&
      !$isDecoratorNode($getNearestNodeFromDOMNode(anchorDOM))
    );
  } catch (error) {
    return false;
  }
}

export function getTextDirection(text: string): 'ltr' | 'rtl' | null {
  if (RTL_REGEX.test(text)) {
    return 'rtl';
  }
  if (LTR_REGEX.test(text)) {
    return 'ltr';
  }
  return null;
}

export function $isTokenOrInertOrSegmented(node: TextNode): boolean {
  return node.isToken() || node.isInert() || node.isSegmented();
}

export function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node != null) {
    if (node.nodeType === 3) {
      // $FlowFixMe: this is a Text
      return node;
    }
    node = node.firstChild;
  }
  return null;
}

export function toggleTextFormatType(
  format: number,
  type: TextFormatType,
  alignWithFormat: null | number,
): number {
  const activeFormat = TEXT_TYPE_TO_FORMAT[type];
  const isStateFlagPresent = format & activeFormat;

  if (
    isStateFlagPresent &&
    (alignWithFormat === null || (alignWithFormat & activeFormat) === 0)
  ) {
    // Remove the state flag.
    return format ^ activeFormat;
  }
  if (alignWithFormat === null || alignWithFormat & activeFormat) {
    // Add the state flag.
    return format | activeFormat;
  }
  return format;
}

export function $isLeafNode(node: ?LexicalNode): boolean %checks {
  return $isTextNode(node) || $isLineBreakNode(node) || $isDecoratorNode(node);
}

export function $generateKey(node: LexicalNode): NodeKey {
  errorOnReadOnly();
  errorOnInfiniteTransforms();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/element
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  return key;
}

function $internallyMarkParentElementsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyElements.set(nextParentKey, false);
    nextParentKey = node.__parent;
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function $internallyMarkNodeAsDirty(node: LexicalNode): void {
  errorOnInfiniteTransforms();
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    $internallyMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
  }
  const key = latest.__key;
  editor._dirtyType = HAS_DIRTY_NODES;
  if ($isElementNode(node)) {
    dirtyElements.set(key, true);
  } else {
    // TODO split internally MarkNodeAsDirty into two dedicated Element/leave functions
    editor._dirtyLeaves.add(key);
  }
}

export function $internallyMarkSiblingsAsDirty(node: LexicalNode) {
  const previousNode = node.getPreviousSibling();
  const nextNode = node.getNextSibling();
  if (previousNode !== null) {
    $internallyMarkNodeAsDirty(previousNode);
  }
  if (nextNode !== null) {
    $internallyMarkNodeAsDirty(nextNode);
  }
}

export function $setCompositionKey(compositionKey: null | NodeKey): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
  editor._compositionKey = compositionKey;
  if (previousCompositionKey !== null) {
    const node = $getNodeByKey(previousCompositionKey);
    if (node !== null) {
      node.getWritable();
    }
  }
  if (compositionKey !== null) {
    const node = $getNodeByKey(compositionKey);
    if (node !== null) {
      node.getWritable();
    }
  }
}

export function $getCompositionKey(): null | NodeKey {
  const editor = getActiveEditor();
  return editor._compositionKey;
}

export function $getNodeByKey<N: LexicalNode>(key: NodeKey): N | null {
  const editorState = getActiveEditorState();
  const node = editorState._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

export function getNodeFromDOMNode(dom: Node): LexicalNode | null {
  const editor = getActiveEditor();
  // $FlowFixMe: internal field
  const key: NodeKey | undefined = dom['__lexicalKey_' + editor._key];
  if (key !== undefined) {
    return $getNodeByKey(key);
  }
  return null;
}

export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
): LexicalNode | null {
  let dom = startingDOM;
  while (dom != null) {
    const node = getNodeFromDOMNode(dom);
    if (node !== null) {
      return node;
    }
    dom = dom.parentNode;
  }
  return null;
}

export function cloneDecorators(editor: LexicalEditor): {[NodeKey]: ReactNode} {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}

export function $pushLogEntry(entry: string): void {
  const editor = getActiveEditor();
  editor._log.push(entry);
}

export function getEditorStateTextContent(editorState: EditorState): string {
  return editorState.read((view) => $getRoot().getTextContent());
}

export function markAllNodesAsDirty(editor: LexicalEditor, type: string): void {
  // Mark all existing text nodes as dirty
  updateEditor(
    editor,
    () => {
      const editorState = getActiveEditorState();
      if (editorState.isEmpty()) {
        return;
      }
      if (type === 'root') {
        $getRoot().markDirty();
        return;
      }
      const nodeMap = editorState._nodeMap;
      const nodeMapEntries = Array.from(nodeMap);
      // For...of would be faster here, but this will get
      // compiled away to a slow-path with Babel.
      for (let i = 0; i < nodeMapEntries.length; i++) {
        const node = nodeMapEntries[i][1];
        node.markDirty();
      }
    },
    true,
    editor._pendingEditorState === null
      ? {
          tag: 'without-history',
        }
      : undefined,
  );
}

export function $getRoot(): RootNode {
  // $FlowFixMe: root is always in our Map
  return ((getActiveEditorState()._nodeMap.get('root'): any): RootNode);
}

export function $setSelection(selection: null | Selection): void {
  const editorState = getActiveEditorState();
  editorState._selection = selection;
}

export function $flushMutations(): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  flushRootMutations(editor);
}

export function getNodeFromDOM(dom: Node): null | LexicalNode {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOM(dom, editor);
  if (nodeKey === null) {
    const rootElement = editor.getRootElement();
    if (dom === rootElement) {
      return $getNodeByKey('root');
    }
    return null;
  }
  return $getNodeByKey(nodeKey);
}

export function domIsElement(dom: Node): boolean {
  return dom.nodeType === 1;
}

export function getTextNodeOffset(
  node: TextNode,
  moveSelectionToEnd: boolean,
): number {
  return moveSelectionToEnd ? node.getTextContentSize() : 0;
}

function getNodeKeyFromDOM(
  // Note that node here refers to a DOM Node, not an Lexical Node
  dom: Node,
  editor: LexicalEditor,
): NodeKey | null {
  let node = dom;
  while (node != null) {
    const key: NodeKey | void =
      // $FlowFixMe: internal field
      node['__lexicalKey_' + editor._key];
    if (key !== undefined) {
      return key;
    }
    node = node.parentNode;
  }
  return null;
}

export function doesContainGrapheme(str: string): boolean {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]/g.test(str);
}

export function getEditorsToPropagate(
  editor: LexicalEditor,
): Array<LexicalEditor> {
  const editorsToPropagate = [];
  let currentEditor = editor;
  while (currentEditor !== null) {
    editorsToPropagate.push(currentEditor);
    currentEditor = currentEditor._parentEditor;
  }
  return editorsToPropagate;
}
