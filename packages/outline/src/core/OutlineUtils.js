/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {OutlineNode, NodeKey, NodeMap} from './OutlineNode';
import type {TextFormatType} from './OutlineTextNode';
import type {Node as ReactNode} from 'react';

import {
  RTL_REGEX,
  LTR_REGEX,
  TEXT_TYPE_TO_FORMAT,
  HAS_DIRTY_NODES,
} from './OutlineConstants';
import {isTextNode, isLineBreakNode, isDecoratorNode} from '.';
import {
  errorOnReadOnly,
  getActiveEditor,
  getActiveViewModel,
} from './OutlineUpdates';

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
      rootElement.contains(focusDOM)
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

export function getDOMTextNode(element: Node): Text | null {
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
  const viewModel = getActiveViewModel();
  const key = generateRandomKey();
  viewModel._nodeMap.set(key, node);
  editor._dirtyNodes.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  return key;
}

export function markParentsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtySubTrees: Set<NodeKey>,
): void {
  let nextParentKey = parentKey;
  while (nextParentKey !== null) {
    if (dirtySubTrees.has(nextParentKey)) {
      return;
    }
    dirtySubTrees.add(nextParentKey);
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    nextParentKey = node.__parent;
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function internallyMarkNodeAsDirty(node: OutlineNode): void {
  const latest = node.getLatest();
  const parent = latest.__parent;
  const viewModel = getActiveViewModel();
  const editor = getActiveEditor();
  const nodeMap = viewModel._nodeMap;
  if (parent !== null) {
    const dirtySubTrees = editor._dirtySubTrees;
    markParentsAsDirty(parent, nodeMap, dirtySubTrees);
  }
  const dirtyNodes = editor._dirtyNodes;
  editor._dirtyType = HAS_DIRTY_NODES;
  dirtyNodes.add(latest.__key);
}

export function setCompositionKey(compositionKey: null | NodeKey): void {
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
  const viewModel = getActiveViewModel();
  const node = viewModel._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

export function getNodeFromDOMNode(dom: Node): OutlineNode | null {
  // $FlowFixMe: internal field
  const key: NodeKey | undefined = dom.__outlineInternalRef;
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
