/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  IntentionallyMarkedAsDirtyBlock,
} from './OutlineEditor';
import type {OutlineNode, NodeKey, NodeMap} from './OutlineNode';
import type {TextFormatType} from './OutlineTextNode';
import type {Node as ReactNode} from 'react';
import type {EditorState} from './OutlineEditorState';
import type {Selection} from './OutlineSelection';
import type {RootNode} from './OutlineRootNode';

import {
  RTL_REGEX,
  LTR_REGEX,
  TEXT_TYPE_TO_FORMAT,
  HAS_DIRTY_NODES,
} from './OutlineConstants';
import {isTextNode, isBlockNode, isLineBreakNode, isDecoratorNode} from '.';
import {
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  updateEditor,
} from './OutlineUpdates';
import {flushRootMutations} from './OutlineMutations';

export const emptyFunction = () => {};

let keyCounter = 0;

export function resetRandomKey(): void {
  keyCounter = 0;
}

export function generateRandomKey(): string {
  return '' + keyCounter++;
}

// When we are dealing with setting selection on an empty text node, we
// need to apply some heuristics that alter the selection anchor. Specifically,
// if the text node is the start of a block or new line, the anchor should be in
// position 0. Otherwise, it should be in position 1. This is because we use the
// BYTE_ORDER_MARK character as a way of giving the empty text node some physical
// space so that browsers correctly insert text into them. The reason we need to
// apply heuristics around if we should use 0 or 1 is because of how we insertText.
// We let the browser natively insert text, but this can cause issues on a new block
// with things like autocorrect and the software keyboard suggestions. Conversely,
// IME input can break if the anchor is not at 1 in other cases.
export function getAdjustedSelectionOffset(anchorDOM: Node): number {
  const previousSibling = anchorDOM.previousSibling;
  return previousSibling == null || previousSibling.nodeName === 'BR' ? 0 : 1;
}

export const isArray = Array.isArray;

const NativePromise = window.Promise;

export const scheduleMicroTask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => NativePromise.resolve().then(fn);

export function isSelectionWithinEditor(
  editor: OutlineEditor,
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
      // if the focus is not in Outline.
      anchorDOM != null &&
      !isDecoratorNode(getNearestNodeFromDOMNode(anchorDOM))
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

export function isImmutableOrInertOrSegmented(node: OutlineNode): boolean {
  return node.isImmutable() || node.isInert() || node.isSegmented();
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

export function isLeafNode(node: ?OutlineNode): boolean %checks {
  return isTextNode(node) || isLineBreakNode(node) || isDecoratorNode(node);
}

export function generateKey(node: OutlineNode): NodeKey {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/block
  if (isBlockNode(node)) {
    editor._dirtyBlocks.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  return key;
}

export function markParentBlocksAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
): void {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtyBlocks.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyBlocks.set(nextParentKey, false);
    nextParentKey = node.__parent;
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function internallyMarkNodeAsDirty(node: OutlineNode): void {
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyBlocks = editor._dirtyBlocks;
  if (parent !== null) {
    markParentBlocksAsDirty(parent, nodeMap, dirtyBlocks);
  }
  const key = latest.__key;
  editor._dirtyType = HAS_DIRTY_NODES;
  if (isBlockNode(node)) {
    dirtyBlocks.set(key, true);
  } else {
    // TODO split internally MarkNodeAsDirty into two dedicated Block/leave functions
    editor._dirtyLeaves.add(key);
  }
}

export function setCompositionKey(compositionKey: null | NodeKey): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
  editor._compositionKey = compositionKey;
  if (previousCompositionKey !== null) {
    const node = getNodeByKey(previousCompositionKey);
    if (node !== null) {
      node.getWritable();
    }
  }
  if (compositionKey !== null) {
    const node = getNodeByKey(compositionKey);
    if (node !== null) {
      node.getWritable();
    }
  }
}

export function getCompositionKey(): null | NodeKey {
  const editor = getActiveEditor();
  return editor._compositionKey;
}

export function getNodeByKey<N: OutlineNode>(key: NodeKey): N | null {
  const editorState = getActiveEditorState();
  const node = editorState._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

export function getNodeFromDOMNode(dom: Node): OutlineNode | null {
  const editor = getActiveEditor();
  // $FlowFixMe: internal field
  const key: NodeKey | undefined = dom['__outlineKey_' + editor._key];
  if (key !== undefined) {
    return getNodeByKey(key);
  }
  return null;
}

export function getNearestNodeFromDOMNode(
  startingDOM: Node,
): OutlineNode | null {
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

export function cloneDecorators(editor: OutlineEditor): {[NodeKey]: ReactNode} {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}

export function pushLogEntry(entry: string): void {
  const editor = getActiveEditor();
  editor._log.push(entry);
}

export function getEditorStateTextContent(editorState: EditorState): string {
  return editorState.read((view) => view.getRoot().getTextContent());
}

export function markAllNodesAsDirty(
  editor: OutlineEditor,
  type: 'text' | 'decorator' | 'block' | 'root',
): void {
  // Mark all existing text nodes as dirty
  updateEditor(editor, () => {
    const editorState = getActiveEditorState();
    if (editorState.isEmpty()) {
      return;
    }
    if (type === 'root') {
      getRoot().markDirty();
      return;
    }
    const nodeMap = editorState._nodeMap;
    const nodeMapEntries = Array.from(nodeMap);
    // For...of would be faster here, but this will get
    // compiled away to a slow-path with Babel.
    for (let i = 0; i < nodeMapEntries.length; i++) {
      const node = nodeMapEntries[i][1];
      if (
        (type === 'text' && isTextNode(node)) ||
        (type === 'decorator' && isDecoratorNode(node)) ||
        (type === 'block' && isBlockNode(node))
      ) {
        node.markDirty();
      }
    }
  }, true);
}

export function getRoot(): RootNode {
  // $FlowFixMe: root is always in our Map
  return ((getActiveEditorState()._nodeMap.get('root'): any): RootNode);
}

export function clearSelection(): void {
  const editorState = getActiveEditorState();
  editorState._selection = null;
}

export function setSelection(selection: Selection): void {
  const editorState = getActiveEditorState();
  editorState._selection = selection;
}

export function flushMutations(): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  flushRootMutations(editor);
}
