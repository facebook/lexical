/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMapType} from './OutlineNode';
import {triggerListeners, ViewModel} from './OutlineView';
import type {OutlineEditor, EditorThemeClasses} from './OutlineEditor';
import type {Selection as OutlineSelection} from './OutlineSelection';
import type {Node as ReactNode} from 'react';

import {isBlockNode, isTextNode} from '.';
import {
  isSelectionWithinEditor,
  isImmutableOrInertOrSegmented,
  getDOMTextNode,
} from './OutlineUtils';
import {IS_INERT, IS_RTL, IS_LTR, IS_IMMUTABLE} from './OutlineConstants';
import invariant from 'shared/invariant';
import {isDecoratorNode} from './OutlineDecoratorNode';

let subTreeTextContent = '';
let editorTextContent = '';
let activeEditorThemeClasses: EditorThemeClasses;
let activeEditor: OutlineEditor;
let activeDirtySubTrees: Set<NodeKey>;
let activeDirtyNodes: Set<NodeKey>;
let activePrevNodeMap: NodeMapType;
let activeNextNodeMap: NodeMapType;
let activeViewModelIsDirty: boolean = false;

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap.get(key);

  if (parentDOM !== null) {
    const dom = getElementByKeyOrThrow(activeEditor, key);
    parentDOM.removeChild(dom);
  }
  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding OutlineNodes are removed from the view model.
  if (!activeNextNodeMap.has(key)) {
    activeEditor._keyToDOMMap.delete(key);
  }
  if (isBlockNode(node)) {
    const children = node.__children;
    destroyChildren(children, 0, children.length - 1, null);
  }
}

function destroyChildren(
  children: Array<NodeKey>,
  _startIndex: number,
  endIndex: number,
  dom: null | HTMLElement,
): void {
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    const child = children[startIndex];
    if (child !== undefined) {
      destroyNode(child, dom);
    }
  }
}

function createNode(
  key: NodeKey,
  parentDOM: null | HTMLElement,
  insertDOM: null | HTMLElement,
): HTMLElement {
  const node = activeNextNodeMap.get(key);
  if (node === undefined) {
    invariant(false, 'createNode: node does not exist in nodeMap');
  }
  const dom = node.createDOM(activeEditorThemeClasses);
  const flags = node.__flags;
  const isInert = flags & IS_INERT;
  const isImmutable = flags & IS_IMMUTABLE;
  storeDOMWithKey(key, dom, activeEditor);

  // This helps preserve the text, and stops spell check tools from
  // merging or break the spans (which happens if they are missing
  // this attribute).
  if (isTextNode(node)) {
    dom.setAttribute('data-outline-text', 'true');
  } else if (isDecoratorNode(node)) {
    dom.setAttribute('data-outline-decorator', 'true');
  }

  // Immutable and inert nodes are always non-editable and should be
  // marked so third-party tools know to not try and modify their contents.
  if (isImmutable || isInert) {
    dom.contentEditable = 'false';
  }
  if (isInert) {
    const domStyle = dom.style;
    domStyle.pointerEvents = 'none';
    domStyle.userSelect = 'none';
    // To support Safari
    domStyle.setProperty('-webkit-user-select', 'none');
  }

  if (isBlockNode(node)) {
    if (flags & IS_LTR) {
      dom.dir = 'ltr';
    } else if (flags & IS_RTL) {
      dom.dir = 'rtl';
    }
    // Handle block children
    const children = node.__children;
    const endIndex = children.length - 1;
    createChildren(children, 0, endIndex, dom, null);
  } else {
    if (isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    }
    const text = node.getTextContent();
    subTreeTextContent += text;
    editorTextContent += text;
  }
  if (parentDOM !== null) {
    if (insertDOM !== null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      parentDOM.appendChild(dom);
    }
  }
  return dom;
}

function createChildren(
  children: Array<NodeKey>,
  _startIndex: number,
  endIndex: number,
  dom: null | HTMLElement,
  insertDOM: null | HTMLElement,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    createNode(children[startIndex], dom, insertDOM);
  }
  // $FlowFixMe: internal field
  dom.__outlineTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

function reconcileChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  dom: HTMLElement,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  const prevChildrenLength = prevChildren.length;
  const nextChildrenLength = nextChildren.length;
  if (prevChildrenLength === 1 && nextChildrenLength === 1) {
    const prevChildKey = prevChildren[0];
    const nextChildKey = nextChildren[0];
    if (prevChildKey === nextChildKey) {
      reconcileNode(prevChildKey, dom);
    } else {
      const lastDOM = getElementByKeyOrThrow(activeEditor, prevChildKey);
      const replacementDOM = createNode(nextChildKey, null, null);
      dom.replaceChild(replacementDOM, lastDOM);
      destroyNode(prevChildKey, null);
    }
  } else if (prevChildrenLength === 0) {
    if (nextChildrenLength !== 0) {
      createChildren(nextChildren, 0, nextChildrenLength - 1, dom, null);
    }
  } else if (nextChildrenLength === 0) {
    if (prevChildrenLength !== 0) {
      destroyChildren(prevChildren, 0, prevChildrenLength - 1, null);
      // Fast path for removing DOM nodes
      dom.textContent = '';
    }
  } else {
    reconcileNodeChildren(
      prevChildren,
      nextChildren,
      prevChildrenLength,
      nextChildrenLength,
      dom,
    );
  }
  // $FlowFixMe: internal field
  dom.__outlineTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

function reconcileNode(key: NodeKey, parentDOM: HTMLElement | null): void {
  const prevNode = activePrevNodeMap.get(key);
  const nextNode = activeNextNodeMap.get(key);
  if (prevNode === undefined || nextNode === undefined) {
    invariant(
      false,
      'reconcileNode: prevNode or nextNode does not exist in nodeMap',
    );
  }
  const isDirty =
    activeViewModelIsDirty ||
    activeDirtyNodes.has(key) ||
    activeDirtySubTrees.has(key);
  const dom = getElementByKeyOrThrow(activeEditor, key);

  if (prevNode === nextNode && !isDirty) {
    if (isBlockNode(prevNode)) {
      // $FlowFixMe: internal field
      const prevSubTreeTextContent = dom.__outlineTextContent;
      if (prevSubTreeTextContent !== undefined) {
        subTreeTextContent += prevSubTreeTextContent;
        editorTextContent += prevSubTreeTextContent;
      }
    } else {
      const text = prevNode.getTextContent();
      editorTextContent += text;
      subTreeTextContent += text;
    }
    return;
  }
  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorThemeClasses)) {
    const replacementDOM = createNode(key, null, null);
    if (parentDOM === null) {
      invariant(false, 'reconcileNode: parentDOM is null');
    }
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return;
  }
  const nextFlags = nextNode.__flags;

  if (isBlockNode(prevNode) && isBlockNode(nextNode)) {
    const prevFlags = prevNode.__flags;
    if (nextFlags & IS_LTR) {
      if ((prevFlags & IS_LTR) === 0) {
        dom.dir = 'ltr';
      }
    } else if (nextFlags & IS_RTL) {
      if ((prevFlags & IS_RTL) === 0) {
        dom.dir = 'rtl';
      }
    } else if (prevFlags & IS_LTR || prevFlags & IS_RTL) {
      dom.removeAttribute('dir');
    }
    // Reconcile block children
    const prevChildren = prevNode.__children;
    const nextChildren = nextNode.__children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || isDirty) {
      reconcileChildren(prevChildren, nextChildren, dom);
    }
  } else {
    if (isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    }
    // Handle text content, for LTR, LTR cases.
    const text = nextNode.getTextContent();
    subTreeTextContent += text;
    editorTextContent += text;
  }
}

export function cloneDecorators(editor: OutlineEditor): {[NodeKey]: ReactNode} {
  const currentDecorators = editor._decorators;
  const pendingDecorators = {...currentDecorators};
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}

function reconcileDecorator(key: NodeKey, decorator: ReactNode): void {
  let pendingDecorators = activeEditor._pendingDecorators;
  const currentDecorators = activeEditor._decorators;

  if (pendingDecorators === null) {
    if (currentDecorators[key] === decorator) {
      return;
    }
    pendingDecorators = cloneDecorators(activeEditor);
  }
  pendingDecorators[key] = decorator;
}

function createKeyToIndexMap(
  children: Array<NodeKey>,
  startIndex: number,
  endIndex: number,
): Map<NodeKey, number> {
  let i, key;
  const map = new Map();
  for (i = startIndex; i <= endIndex; ++i) {
    key = children[i];
    if (key !== undefined) {
      map.set(key, i);
    }
  }
  return map;
}

function findIndexInPrevChildren(
  targetKey: NodeKey,
  prevChildren: Array<NodeKey>,
  startIndex: number,
  endIndex: number,
): number {
  for (let i = startIndex; i < endIndex; i++) {
    const c = prevChildren[i];
    if (c === targetKey) {
      return i;
    }
  }
  invariant(false, 'findIndexInPrevChildren: index in prevChildren not found');
}

// Disclaimer: this logic was adapted from Vue (MIT):
// https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L404

function reconcileNodeChildren(
  _prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  dom: HTMLElement,
): void {
  let hasClonedPrevChildren = false;
  let prevStartIndex = 0;
  let nextStartIndex = 0;
  let prevChildren = _prevChildren;
  let prevEndIndex = prevChildren.length - 1;
  let prevStartKey = prevChildren[0];
  let prevEndKey: NodeKey = prevChildren[prevEndIndex];
  let nextEndIndex = nextChildren.length - 1;
  let nextStartKey = nextChildren[0];
  let nextEndKey = nextChildren[nextEndIndex];
  let prevKeyToIndexMap = null;

  while (prevStartIndex <= prevEndIndex && nextStartIndex <= nextEndIndex) {
    if (prevStartKey === undefined) {
      prevStartKey = prevChildren[++prevStartIndex];
    } else if (nextEndKey === undefined) {
      nextEndKey = prevChildren[--prevEndIndex];
    } else if (prevStartKey === nextStartKey) {
      reconcileNode(prevStartKey, dom);
      prevStartKey = prevChildren[++prevStartIndex];
      nextStartKey = nextChildren[++nextStartIndex];
    } else if (prevEndKey === nextEndKey) {
      reconcileNode(prevEndKey, dom);
      prevEndKey = prevChildren[--prevEndIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevStartKey === nextEndKey) {
      reconcileNode(prevStartKey, dom);
      dom.insertBefore(
        getElementByKeyOrThrow(activeEditor, prevStartKey),
        getElementByKeyOrThrow(activeEditor, prevEndKey).nextSibling,
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevEndKey === nextStartKey) {
      reconcileNode(prevEndKey, dom);
      dom.insertBefore(
        getElementByKeyOrThrow(activeEditor, prevEndKey),
        getElementByKeyOrThrow(activeEditor, prevStartKey),
      );
      prevEndKey = prevChildren[--prevEndIndex];
      nextStartKey = nextChildren[++nextStartIndex];
    } else {
      // Lazily create Map
      if (prevKeyToIndexMap === null) {
        prevKeyToIndexMap = createKeyToIndexMap(
          prevChildren,
          prevStartIndex,
          prevEndIndex,
        );
      }
      const indexInPrevChildren =
        nextStartKey !== undefined
          ? prevKeyToIndexMap.get(nextStartKey)
          : findIndexInPrevChildren(
              nextStartKey,
              prevChildren,
              prevStartIndex,
              prevEndIndex,
            );
      if (indexInPrevChildren === undefined) {
        createNode(
          nextStartKey,
          dom,
          activeEditor.getElementByKey(prevStartKey),
        );
      } else {
        const keyToMove = prevChildren[indexInPrevChildren];
        if (keyToMove === nextStartKey) {
          reconcileNode(keyToMove, dom);
          if (!hasClonedPrevChildren) {
            hasClonedPrevChildren = true;
            prevChildren = Array.from(prevChildren);
          }
          // $FlowFixMe: figure a way of typing this better
          prevChildren[indexInPrevChildren] = ((undefined: any): NodeKey);
          dom.insertBefore(
            getElementByKeyOrThrow(activeEditor, keyToMove),
            getElementByKeyOrThrow(activeEditor, prevStartKey),
          );
        } else {
          invariant(
            false,
            'reconcileNodeChildren: keyToMove to was not nextStartKey',
          );
        }
      }
      nextStartKey = nextChildren[++nextStartIndex];
    }
  }
  if (prevStartIndex > prevEndIndex) {
    const previousNode = nextChildren[nextEndIndex + 1];
    const insertDOM =
      previousNode === undefined
        ? null
        : activeEditor.getElementByKey(previousNode);
    createChildren(nextChildren, nextStartIndex, nextEndIndex, dom, insertDOM);
  } else if (nextStartIndex > nextEndIndex) {
    destroyChildren(prevChildren, prevStartIndex, prevEndIndex, dom);
  }
}

function reconcileRoot(
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
  dirtySubTrees: Set<NodeKey>,
  dirtyNodes: Set<NodeKey>,
): void {
  subTreeTextContent = '';
  editorTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  activeEditor = editor;
  activeEditorThemeClasses = editor._editorThemeClasses;
  activeDirtySubTrees = dirtySubTrees;
  activeDirtyNodes = dirtyNodes;
  activePrevNodeMap = prevViewModel._nodeMap;
  activeNextNodeMap = nextViewModel._nodeMap;
  activeViewModelIsDirty = nextViewModel._isDirty;
  reconcileNode('root', null);
  editor._textContent = editorTextContent;
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // $FlowFixMe
  activeEditor = undefined;
  // $FlowFixMe
  activeDirtySubTrees = undefined;
  // $FlowFixMe
  activeDirtyNodes = undefined;
  // $FlowFixMe
  activePrevNodeMap = undefined;
  // $FlowFixMe
  activeNextNodeMap = undefined;
  // $FlowFixMe
  activeEditorThemeClasses = undefined;
}

export function reconcileViewModel(
  rootElement: HTMLElement,
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const dirtySubTrees = nextViewModel._dirtySubTrees;
  const dirtyNodes = nextViewModel._dirtyNodes;
  // When a view model is historic, we bail out of using dirty checks and
  // always do a full reconciliation to ensure consistency.
  const isDirty = nextViewModel._isDirty;
  const needsUpdate = isDirty || nextViewModel.hasDirtyNodes();
  const domSelection: null | Selection = window.getSelection();
  let mutationsCausedLostSelection = false;

  if (needsUpdate) {
    let anchorNodeBeforeMutation;
    let focusNodeBeforeMutation;
    let anchorOffsetBeforeMutation;
    let focusOffsetBeforeMutation;

    if (domSelection !== null) {
      anchorNodeBeforeMutation = domSelection.anchorNode;
      focusNodeBeforeMutation = domSelection.focusNode;
      anchorOffsetBeforeMutation = domSelection.anchorOffset;
      focusOffsetBeforeMutation = domSelection.focusOffset;
    }
    triggerListeners('mutation', editor, null);
    try {
      reconcileRoot(
        prevViewModel,
        nextViewModel,
        editor,
        dirtySubTrees,
        dirtyNodes,
      );
    } finally {
      triggerListeners('mutation', editor, rootElement);
    }
    // Compare the selection before mutation to the one after mutation.
    // If there are changes, we will need to update selection anyway.
    if (
      domSelection !== null &&
      (anchorNodeBeforeMutation !== domSelection.anchorNode ||
        focusNodeBeforeMutation !== domSelection.focusNode ||
        anchorOffsetBeforeMutation !== domSelection.anchorOffset ||
        focusOffsetBeforeMutation !== domSelection.focusOffset)
    ) {
      mutationsCausedLostSelection = true;
    }
  }
  const prevSelection = prevViewModel._selection;
  const nextSelection = nextViewModel._selection;

  if (
    domSelection !== null &&
    prevSelection !== nextSelection &&
    (!nextSelection ||
      nextSelection.isDirty ||
      isDirty ||
      mutationsCausedLostSelection)
  ) {
    reconcileSelection(prevSelection, nextSelection, editor, domSelection);
  }
}

function reconcileSelection(
  prevSelection: OutlineSelection | null,
  nextSelection: OutlineSelection | null,
  editor: OutlineEditor,
  domSelection: Selection,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;

  if (nextSelection === null) {
    if (isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)) {
      domSelection.removeAllRanges();
    }
    return;
  }
  const anchorKey = nextSelection.anchorKey;
  const focusKey = nextSelection.focusKey;
  const anchorNode = nextSelection.getAnchorNode();
  const focusNode = nextSelection.getFocusNode();
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);

  // Get the underlying DOM text nodes from the representative
  // Outline text nodes (we use elements for text nodes).
  const anchorDOMTarget = getDOMTextNode(anchorDOM);
  const focusDOMTarget = getDOMTextNode(focusDOM);
  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (focusDOMTarget === null || anchorDOMTarget === null) {
    return;
  }
  const nextSelectionAnchorOffset = nextSelection.anchorOffset;
  const nextSelectionFocusOffset = nextSelection.focusOffset;
  const nextAnchorOffset =
    isImmutableOrInertOrSegmented(anchorNode) ||
    anchorNode.getTextContent() !== ''
      ? nextSelectionAnchorOffset
      : nextSelectionAnchorOffset + 1;
  const nextFocusOffset =
    isImmutableOrInertOrSegmented(focusNode) ||
    focusNode.getTextContent() !== ''
      ? nextSelectionFocusOffset
      : nextSelectionFocusOffset + 1;

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === anchorDOMTarget &&
    focusDOMNode === focusDOMTarget
  ) {
    return;
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      anchorDOMTarget,
      nextAnchorOffset,
      focusDOMTarget,
      nextFocusOffset,
    );
  } catch {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
  }
}

export function storeDOMWithKey(
  key: NodeKey,
  dom: HTMLElement,
  editor: OutlineEditor,
): void {
  if (key === null) {
    invariant(false, 'storeDOMWithNodeKey: key was null');
  }
  const keyToDOMMap = editor._keyToDOMMap;
  // $FlowFixMe: internal field
  dom.__outlineInternalRef = key;
  keyToDOMMap.set(key, dom);
}

export function getNodeKeyFromDOM(
  // Note that node here refers to a DOM Node, not an Outline Node
  dom: Node,
): NodeKey | null {
  let node = dom;
  while (node != null) {
    // $FlowFixMe: internal field
    const key: NodeKey | undefined = node.__outlineInternalRef;
    if (key !== undefined) {
      return key;
    }
    node = node.parentNode;
  }
  return null;
}

export function getElementByKeyOrThrow(
  editor: OutlineEditor,
  key: NodeKey,
): HTMLElement {
  const element = editor._keyToDOMMap.get(key);
  if (element === undefined) {
    invariant(
      false,
      'Reconciliation: could not find DOM element for node key "${key}"',
    );
  }
  return element;
}
