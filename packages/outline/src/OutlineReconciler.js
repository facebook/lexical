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

import {getNodeByKey} from './OutlineNode';
import {BlockNode, TextNode} from '.';
import {invariant} from './OutlineUtils';
import {
  IS_IMMUTABLE,
  IS_SEGMENTED,
  RTL_REGEX,
  LTR_REGEX,
  IS_INERT,
} from './OutlineConstants';

let subTreeTextContent = '';
let editorTextContent = '';
let forceTextDirection = null;
let currentTextDirection = null;
let activeEditorThemeClasses: EditorThemeClasses;
let activeEditor: OutlineEditor;
let activeDirtySubTrees: Set<NodeKey>;
let activePrevNodeMap: NodeMapType;
let activeNextNodeMap: NodeMapType;
let activeViewModelIsDirty: boolean = false;

function getTextDirection(text: string): 'ltr' | 'rtl' | null {
  if (RTL_REGEX.test(text)) {
    return 'rtl';
  }
  if (LTR_REGEX.test(text)) {
    return 'ltr';
  }
  return null;
}

function handleElementTextDirection(element: HTMLElement): void {
  if (forceTextDirection === null) {
    // $FlowFixMe: internal field
    const prevSubTreeTextContent: string = element.__outlineTextContent;
    if (prevSubTreeTextContent !== subTreeTextContent) {
      const hasEmptyTextContent = subTreeTextContent === '';
      const direction = hasEmptyTextContent
        ? currentTextDirection
        : getTextDirection(subTreeTextContent);
      if (direction === null || (hasEmptyTextContent && direction === 'ltr')) {
        element.removeAttribute('dir');
      } else {
        element.dir = direction;
      }
      currentTextDirection = direction;
      // $FlowFixMe: internal field
      element.__outlineTextContent = subTreeTextContent;
    }
  }
}

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap[key];

  if (parentDOM !== null) {
    const dom = activeEditor.getElementByKey(key);
    parentDOM.removeChild(dom);
  }
  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding OutlineNodes are removed from the view model.
  if (activeNextNodeMap[key] === undefined) {
    activeEditor._keyToDOMMap.delete(key);
  }
  if (node instanceof BlockNode) {
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
    destroyNode(children[startIndex], dom);
  }
}

function createNode(
  key: NodeKey,
  parentDOM: null | HTMLElement,
  insertDOM: null | HTMLElement,
): HTMLElement {
  const node = activeNextNodeMap[key];
  const dom = node.createDOM(activeEditorThemeClasses);
  const flags = node.__flags;
  const isInert = flags & IS_INERT;
  storeDOMWithKey(key, dom, activeEditor);

  if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED || isInert) {
    dom.contentEditable = 'false';
  }
  if (isInert) {
    const domStyle = dom.style;
    domStyle.pointerEvents = 'none';
    domStyle.userSelect = 'none';
  }

  if (node instanceof TextNode) {
    if (!isInert) {
      const text = node.__text;
      subTreeTextContent += text;
      editorTextContent += text;
    }
  } else if (node instanceof BlockNode) {
    // Handle block children
    const children = node.__children;
    const endIndex = children.length - 1;
    if (node.childrenNeedDirection()) {
      createChildrenWithDirection(children, endIndex, dom);
    } else {
      createChildren(children, 0, endIndex, dom, null);
    }
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

function createChildrenWithDirection(
  children: Array<NodeKey>,
  endIndex: number,
  dom: HTMLElement,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  createChildren(children, 0, endIndex, dom, null);
  handleElementTextDirection(dom);
  subTreeTextContent = previousSubTreeTextContent;
}

function createChildren(
  children: Array<NodeKey>,
  _startIndex: number,
  endIndex: number,
  dom: null | HTMLElement,
  insertDOM: null | HTMLElement,
): void {
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    createNode(children[startIndex], dom, insertDOM);
  }
}

function reconcileChildrenWithDirection(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  dom: HTMLElement,
  isRoot: boolean,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  reconcileChildren(prevChildren, nextChildren, dom, isRoot);
  handleElementTextDirection(dom);
  subTreeTextContent = previousSubTreeTextContent;
}

function reconcileChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  dom: HTMLElement,
  isRoot: boolean,
): void {
  const prevChildrenLength = prevChildren.length;
  const nextChildrenLength = nextChildren.length;
  if (prevChildrenLength === 1 && nextChildrenLength === 1) {
    const prevChildKey = prevChildren[0];
    const nextChildKey = nextChildren[0];
    if (prevChildKey === nextChildKey) {
      reconcileNode(prevChildKey, dom);
    } else {
      const lastDOM = activeEditor.getElementByKey(prevChildKey);
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
}

function reconcileNode(key: NodeKey, parentDOM: HTMLElement | null): void {
  const prevNode = activePrevNodeMap[key];
  const nextNode = activeNextNodeMap[key];
  const hasDirtySubTree =
    activeViewModelIsDirty || activeDirtySubTrees.has(key);
  const dom = activeEditor.getElementByKey(key);

  if (prevNode === nextNode && !hasDirtySubTree) {
    if (prevNode instanceof TextNode) {
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
      throw new Error('Should never happen');
    }
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return;
  }
  // Handle text content, for LTR, LTR cases.
  if (nextNode instanceof TextNode) {
    const text = nextNode.__text;
    subTreeTextContent += text;
    editorTextContent += text;
    return;
  } else if (prevNode instanceof BlockNode && nextNode instanceof BlockNode) {
    // Reconcile block children
    const prevChildren = prevNode.__children;
    const nextChildren = nextNode.__children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || hasDirtySubTree) {
      const isRoot = key === 'root';
      if (nextNode.childrenNeedDirection()) {
        reconcileChildrenWithDirection(prevChildren, nextChildren, dom, isRoot);
      } else {
        reconcileChildren(prevChildren, nextChildren, dom, isRoot);
      }
    }
  }
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
  throw new Error('Should never happen');
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
        activeEditor.getElementByKey(prevStartKey),
        activeEditor.getElementByKey(prevEndKey).nextSibling,
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevEndKey === nextStartKey) {
      reconcileNode(prevEndKey, dom);
      dom.insertBefore(
        activeEditor.getElementByKey(prevEndKey),
        activeEditor.getElementByKey(prevStartKey),
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
            activeEditor.getElementByKey(keyToMove),
            activeEditor.getElementByKey(prevStartKey),
          );
        } else {
          throw new Error('TODO: Should this ever happen?');
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
    editor._isComposing ||
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
  // TODO: take this value from Editor props, default to null;
  // This will over-ride any sub-tree text direction properties.
  forceTextDirection = null;
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
  const nextSelection = nextViewModel._selection;
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
  if (
    nextSelection !== null &&
    (nextSelection.isDirty || isDirty || reconciliationCausedLostSelection)
  ) {
    reconcileSelection(nextSelection, editor);
  }
}

function reconcileSelection(selection: Selection, editor: OutlineEditor): void {
  const anchorKey = selection.anchorKey;
  const focusKey = selection.focusKey;
  if (anchorKey === null || focusKey === null) {
    throw new Error('reconcileSelection: anchorKey or focusKey cannot be null');
  }
  const domSelection = window.getSelection();
  const anchorNode = getNodeByKey(anchorKey);
  const focusNode = getNodeByKey(anchorKey);
  const anchorDOM = editor.getElementByKey(anchorKey);
  const focusDOM = editor.getElementByKey(focusKey);
  let anchorOffset = selection.anchorOffset;
  let focusOffset = selection.focusOffset;

  if (
    anchorNode !== null &&
    anchorNode === focusNode &&
    anchorNode.__text === ''
  ) {
    // Because we use empty text nodes to ensure Outline
    // selection and text entry works as expected, it also
    // means we need to adjust the offset to ensure native
    // selection works correctly and doesn't act buggy.
    anchorOffset = 1;
    focusOffset = 1;
  }
  domSelection.setBaseAndExtent(
    getDOMTextNodeFromElement(anchorDOM),
    anchorOffset,
    getDOMTextNodeFromElement(focusDOM),
    focusOffset,
  );
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
  invariant(false, 'Should never happen');
}

export function storeDOMWithKey(
  key: NodeKey,
  dom: HTMLElement,
  editor: OutlineEditor,
): void {
  if (key === null) {
    throw new Error('storeDOMWithNodeKey failed');
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
