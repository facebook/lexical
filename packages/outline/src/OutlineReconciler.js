/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMapType} from './OutlineNode';
import type {ViewModel} from './OutlineView';
import type {OutlineEditor, EditorThemeClasses} from './OutlineEditor';
import type {Selection} from './OutlineSelection';
import type {Node as ReactNode} from 'react';

import {isTextNode, isBlockNode} from '.';
import {
  invariant,
  getAdjustedSelectionOffset,
  isSelectionWithinEditor,
} from './OutlineUtils';
import {
  IS_IMMUTABLE,
  IS_SEGMENTED,
  IS_INERT,
  IS_RTL,
  IS_LTR,
} from './OutlineConstants';

let subTreeTextContent = '';
let editorTextContent = '';
let activeEditorThemeClasses: EditorThemeClasses;
let activeEditor: OutlineEditor;
let activeDirtySubTrees: Set<NodeKey>;
let activePrevNodeMap: NodeMapType;
let activeNextNodeMap: NodeMapType;
let activeViewModelIsDirty: boolean = false;

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap[key];

  if (parentDOM !== null) {
    const dom = getElementByKeyOrThrow(activeEditor, key);
    parentDOM.removeChild(dom);
  }
  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding OutlineNodes are removed from the view model.
  if (activeNextNodeMap[key] === undefined) {
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
  const node = activeNextNodeMap[key];
  const dom = node.createDOM(activeEditorThemeClasses);
  const decorator = node.decorate();
  const flags = node.__flags;
  const isInert = flags & IS_INERT;
  storeDOMWithKey(key, dom, activeEditor);

  if (decorator !== null) {
    reconcileDecorator(key, decorator);
  }

  if (
    node.__type !== 'linebreak' &&
    (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || isInert)
  ) {
    dom.contentEditable = 'false';
  }
  if (isInert) {
    const domStyle = dom.style;
    domStyle.pointerEvents = 'none';
    domStyle.userSelect = 'none';
    // To support Safari
    domStyle.setProperty('-webkit-user-select', 'none');
  }

  if (isTextNode(node)) {
    if (!isInert) {
      const text = node.__text;
      subTreeTextContent += text;
      editorTextContent += text;
    }
  } else if (isBlockNode(node)) {
    if (flags & IS_LTR) {
      dom.dir = 'ltr';
    } else if (flags & IS_RTL) {
      dom.dir = 'rtl';
    }
    // Handle block children
    const children = node.__children;
    const endIndex = children.length - 1;
    createChildren(children, 0, endIndex, dom, null);
  }
  if (parentDOM !== null) {
    if (insertDOM !== null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      const editorElement = activeEditor._editorElement;
      const placeholderElement = activeEditor._placeholderElement;
      // Ensure we insert the DOM element before the placeholder, if
      // one exists.
      if (parentDOM === editorElement && placeholderElement !== null) {
        parentDOM.insertBefore(dom, placeholderElement);
      } else {
        parentDOM.appendChild(dom);
      }
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
  subTreeTextContent = previousSubTreeTextContent;
}

function reconcileChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  dom: HTMLElement,
  isRoot: boolean,
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
      destroyChildren(
        prevChildren,
        0,
        prevChildrenLength - 1,
        isRoot ? dom : null,
      );
      if (!isRoot) {
        // Fast path for removing DOM nodes
        dom.textContent = '';
      }
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
  subTreeTextContent = previousSubTreeTextContent;
}

function reconcileNode(key: NodeKey, parentDOM: HTMLElement | null): void {
  const prevNode = activePrevNodeMap[key];
  const nextNode = activeNextNodeMap[key];
  const hasDirtySubTree =
    activeViewModelIsDirty || activeDirtySubTrees.has(key);
  const dom = getElementByKeyOrThrow(activeEditor, key);
  // If we're composing this node, skip over reconciling it
  const isComposingNode = key === activeEditor._compositionKey;

  if ((prevNode === nextNode && !hasDirtySubTree) || isComposingNode) {
    if (isTextNode(prevNode)) {
      const text = prevNode.__text;
      editorTextContent += text;
      subTreeTextContent += text;
    } else {
      // $FlowFixMe: internal field
      const prevSubTreeTextContent = dom.__outlineTextContent;
      if (prevSubTreeTextContent !== undefined) {
        subTreeTextContent += prevSubTreeTextContent;
        editorTextContent += prevSubTreeTextContent;
      }
    }
    return;
  }
  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorThemeClasses)) {
    const replacementDOM = createNode(key, null, null);
    if (parentDOM === null) {
      if (__DEV__) {
        invariant(false, 'should never happen');
      } else {
        invariant();
      }
    }
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return;
  }
  const decorator = nextNode.decorate();
  if (decorator !== null) {
    reconcileDecorator(key, decorator);
  }
  // Handle text content, for LTR, LTR cases.
  if (isTextNode(nextNode)) {
    const text = nextNode.__text;
    subTreeTextContent += text;
    editorTextContent += text;
    return;
  } else if (isBlockNode(prevNode) && isBlockNode(nextNode)) {
    const prevFlags = prevNode.__flags;
    const nextFlags = nextNode.__flags;
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

    if (childrenAreDifferent || hasDirtySubTree) {
      const isRoot = key === 'root';
      reconcileChildren(prevChildren, nextChildren, dom, isRoot);
    }
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
  if (__DEV__) {
    invariant(false, 'Should never happen');
  } else {
    invariant();
  }
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
          if (hasClonedPrevChildren) {
            hasClonedPrevChildren = true;
            prevChildren = [...prevChildren];
          }
          // $FlowFixMe: figure a way of typing this better
          prevChildren[indexInPrevChildren] = ((undefined: any): NodeKey);
          dom.insertBefore(
            getElementByKeyOrThrow(activeEditor, keyToMove),
            getElementByKeyOrThrow(activeEditor, prevStartKey),
          );
        } else {
          if (__DEV__) {
            invariant(false, 'Should never happen');
          } else {
            invariant();
          }
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

export function reconcilePlaceholder(
  editor: OutlineEditor,
  nextViewModel: ViewModel,
): void {
  const placeholderText = editor._placeholderText;
  const editorElement = editor._editorElement;
  if (editorElement === null) {
    return;
  }
  const noPlaceholder =
    placeholderText === '' ||
    editor._textContent !== '' ||
    editor.isComposing() ||
    !isEditorEmpty(editor, nextViewModel);

  let placeholderElement = editor._placeholderElement;
  if (placeholderElement === null) {
    if (noPlaceholder) {
      return;
    }
    placeholderElement = document.createElement('div');
    placeholderElement.contentEditable = 'false';
    const placeholderClassName = editor._editorThemeClasses.placeholder;
    if (placeholderClassName !== undefined) {
      placeholderElement.className = placeholderClassName;
    }
    placeholderElement.appendChild(document.createTextNode(placeholderText));
    editorElement.appendChild(placeholderElement);
    editor._placeholderElement = placeholderElement;
  } else if (noPlaceholder) {
    editorElement.removeChild(placeholderElement);
    editor._placeholderElement = null;
  }
}

function isEditorEmpty(
  editor: OutlineEditor,
  nextViewModel: ViewModel,
): boolean {
  if (editor._textContent !== '') {
    return false;
  }
  const nodeMap = nextViewModel._nodeMap;
  const topBlockIDs = nodeMap.root.__children;
  const topBlockIDsLength = topBlockIDs.length;
  if (topBlockIDsLength > 1) {
    return false;
  }
  for (let i = 0; i < topBlockIDsLength; i++) {
    const topBlock = nodeMap[topBlockIDs[i]];

    if (topBlock && topBlock.__type !== 'paragraph') {
      return false;
    }
  }
  return true;
}

function reconcileRoot(
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
  dirtySubTrees: Set<NodeKey>,
): void {
  subTreeTextContent = '';
  editorTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  activeEditor = editor;
  activeEditorThemeClasses = editor._editorThemeClasses;
  activeDirtySubTrees = dirtySubTrees;
  activePrevNodeMap = prevViewModel._nodeMap;
  activeNextNodeMap = nextViewModel._nodeMap;
  activeViewModelIsDirty = nextViewModel._isDirty;
  reconcileNode('root', null);
  editor._textContent = editorTextContent;
  reconcilePlaceholder(editor, nextViewModel);
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // $FlowFixMe
  activeEditor = undefined;
  // $FlowFixMe
  activeDirtySubTrees = undefined;
  // $FlowFixMe
  activePrevNodeMap = undefined;
  // $FlowFixMe
  activeNextNodeMap = undefined;
  // $FlowFixMe
  activeEditorThemeClasses = undefined;
}

export function reconcileViewModel(
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const dirtySubTrees = nextViewModel._dirtySubTrees;
  // When a view model is historic, we bail out of using dirty checks and
  // always do a full reconciliation to ensure consistency.
  const isDirty = nextViewModel._isDirty;
  const needsUpdate = isDirty || nextViewModel.hasDirtyNodes();
  let reconciliationCausedLostSelection = false;

  if (needsUpdate) {
    const {anchorOffset, focusOffset} = window.getSelection();
    reconcileRoot(prevViewModel, nextViewModel, editor, dirtySubTrees);
    const selectionAfter = window.getSelection();
    if (
      anchorOffset !== selectionAfter.anchorOffset ||
      focusOffset !== selectionAfter.focusOffset
    ) {
      reconciliationCausedLostSelection = true;
    }
  }
  const prevSelection = prevViewModel._selection;
  const nextSelection = nextViewModel._selection;

  if (
    !editor.isComposing() &&
    prevSelection !== nextSelection &&
    (!nextSelection ||
      nextSelection.isDirty ||
      isDirty ||
      reconciliationCausedLostSelection)
  ) {
    reconcileSelection(prevSelection, nextSelection, editor);
  }
}

function reconcileSelection(
  prevSelection: Selection | null,
  nextSelection: Selection | null,
  editor: OutlineEditor,
): void {
  const domSelection = window.getSelection();
  if (nextSelection === null) {
    if (
      isSelectionWithinEditor(
        editor,
        domSelection.anchorNode,
        domSelection.focusNode,
      )
    ) {
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
  const anchorTextIsEmpty = anchorNode.__text === '';
  const focusTextIsEmpty = focusNode.__text === '';
  let anchorOffset = nextSelection.anchorOffset;
  let focusOffset = nextSelection.focusOffset;

  // Because we use empty text nodes to ensure Outline
  // selection and text entry works as expected, it also
  // means we need to adjust the offset to ensure native
  // selection works correctly and doesn't act buggy.
  if (anchorTextIsEmpty) {
    anchorOffset = getAdjustedSelectionOffset(anchorDOM);
  }
  if (focusTextIsEmpty) {
    focusOffset = getAdjustedSelectionOffset(focusDOM);
  }
  // Get the underlying DOM text nodes from the representive
  // Outline text nodes (we use elements for text nodes).
  const anchorDOMTarget = getDOMTextNodeFromElement(anchorDOM);
  const focusDOMTarget = getDOMTextNodeFromElement(focusDOM);

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update.
  if (
    !anchorTextIsEmpty &&
    !focusTextIsEmpty &&
    domSelection.anchorOffset === anchorOffset &&
    domSelection.focusOffset === focusOffset &&
    domSelection.anchorNode === anchorDOMTarget &&
    domSelection.focusNode === focusDOMTarget
  ) {
    return;
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      anchorDOMTarget,
      anchorOffset,
      focusDOMTarget,
      focusOffset,
    );
  } catch {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
  }
}

function getDOMTextNodeFromElement(element: HTMLElement): Text {
  let node = element;
  while (node != null) {
    if (node.nodeType === 3) {
      // $FlowFixMe: nodeType === text node
      return node;
    }
    node = node.firstChild;
  }
  if (__DEV__) {
    invariant(false, 'Should never happen');
  } else {
    invariant();
  }
}

export function storeDOMWithKey(
  key: NodeKey,
  dom: HTMLElement,
  editor: OutlineEditor,
): void {
  if (key === null) {
    if (__DEV__) {
      invariant(false, 'storeDOMWithNodeKey failed');
    } else {
      invariant();
    }
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
    if (__DEV__) {
      invariant(
        false,
        `Reconcilation: could not find DOM element for node key "${key}"`,
      );
    } else {
      invariant();
    }
  }
  return element;
}
