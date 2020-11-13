// @flow strict-local

import type {NodeKey} from './OutlineNode';
import type {NodeMapType, ViewModel} from './OutlineView';
import type {OutlineEditor} from './OutlineEditor';
import type {Selection} from './OutlineSelection';

import {BlockNode, TextNode} from '.';

let subTreeTextContent = '';
let forceTextDirection = null;
let currentEditor: OutlineEditor;
let currentDirtySubTrees: null | Set<NodeKey>;
let currentPrevNodeMap: NodeMapType;
let currentNextNodeMap: NodeMapType;

const RTL = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF';

const rtl = new RegExp('^[^' + LTR + ']*[' + RTL + ']');
const ltr = new RegExp('^[^' + RTL + ']*[' + LTR + ']');

function getTextDirection(text: string): 'ltr' | 'rtl' | null {
  if (rtl.test(text)) {
    return 'rtl';
  }
  if (ltr.test(text)) {
    return 'ltr';
  }
  return null;
}

function handleBlockTextDirection(dom: HTMLElement): void {
  if (forceTextDirection === null) {
    // $FlowFixMe: internal field
    const prevSubTreeTextContent: string = dom.__outlineTextContent;
    if (prevSubTreeTextContent !== subTreeTextContent) {
      const direction = getTextDirection(subTreeTextContent);
      if (direction === null) {
        dom.removeAttribute('dir');
      } else {
        dom.dir = direction;
      }
      // $FlowFixMe: internal field
      dom.__outlineTextContent = subTreeTextContent;
    }
  }
}

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = currentPrevNodeMap[key];

  if (parentDOM !== null) {
    const dom = currentEditor.getElementByKey(key);
    parentDOM.removeChild(dom);
  }
  if (currentNextNodeMap[key] === undefined) {
    currentEditor._keyToDOMMap.delete(key);
  }
  if (node instanceof BlockNode) {
    const children = node._children;
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
  const node = currentNextNodeMap[key];
  const dom = node._create();
  storeDOMWithKey(key, dom, currentEditor);

  if (node instanceof TextNode) {
    subTreeTextContent += node._text;
  } else if (node instanceof BlockNode) {
    // Handle block children
    const children = node._children;
    const previousSubTreeTextContent = subTreeTextContent;
    subTreeTextContent = '';
    const childrenLength = children.length;
    createChildren(children, 0, childrenLength - 1, dom, null);
    handleBlockTextDirection(dom);
    subTreeTextContent = previousSubTreeTextContent;
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
  let startIndex = _startIndex;
  for (; startIndex <= endIndex; ++startIndex) {
    createNode(children[startIndex], dom, insertDOM);
  }
}

function reconcileNode(key: NodeKey, parentDOM: HTMLElement | null): void {
  const prevNode = currentPrevNodeMap[key];
  const nextNode = currentNextNodeMap[key];
  const hasDirtySubTree =
    currentDirtySubTrees !== null ? currentDirtySubTrees.has(key) : true;
  const dom = currentEditor.getElementByKey(key);

  if (prevNode === nextNode && !hasDirtySubTree) {
    if (prevNode instanceof TextNode) {
      subTreeTextContent += prevNode._text;
    } else {
      // $FlowFixMe: internal field
      const prevSubTreeTextContent = dom.__outlineTextContent;
      if (prevSubTreeTextContent !== undefined) {
        subTreeTextContent += prevSubTreeTextContent;
      }
    }
    return;
  }
  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode._update(prevNode, dom)) {
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
    subTreeTextContent += nextNode._text;
    return;
  } else if (prevNode instanceof BlockNode && nextNode instanceof BlockNode) {
    // Reconcile block children
    const prevChildren = prevNode._children;
    const nextChildren = nextNode._children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || hasDirtySubTree) {
      const prevChildrenLength = prevChildren.length;
      const nextChildrenLength = nextChildren.length;
      const previousSubTreeTextContent = subTreeTextContent;
      subTreeTextContent = '';

      if (prevChildrenLength === 1 && nextChildrenLength === 1) {
        const prevChildKey = prevChildren[0];
        const nextChildKey = nextChildren[0];
        if (prevChildKey === nextChildKey) {
          reconcileNode(prevChildKey, dom);
        } else {
          const lastDOM = currentEditor.getElementByKey(prevChildKey);
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
      handleBlockTextDirection(dom);
      subTreeTextContent = previousSubTreeTextContent;
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
  // $FlowFixMe: this is never undefined
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
        currentEditor.getElementByKey(prevStartKey),
        currentEditor.getElementByKey(prevEndKey).nextSibling,
      );
      prevStartKey = prevChildren[++prevStartIndex];
      nextEndKey = nextChildren[--nextEndIndex];
    } else if (prevEndKey === nextStartKey) {
      reconcileNode(prevEndKey, dom);
      dom.insertBefore(
        currentEditor.getElementByKey(prevEndKey),
        currentEditor.getElementByKey(prevStartKey),
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
          currentEditor.getElementByKey(prevStartKey),
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
            currentEditor.getElementByKey(keyToMove),
            currentEditor.getElementByKey(prevStartKey),
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
        : currentEditor.getElementByKey(previousNode);
    createChildren(nextChildren, nextStartIndex, nextEndIndex, dom, insertDOM);
  } else if (nextStartIndex > nextEndIndex) {
    destroyChildren(prevChildren, prevStartIndex, prevEndIndex, dom);
  }
}

function reconcileRoot(
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
  dirtySubTrees: null | Set<NodeKey>,
): void {
  // TODO: take this value from Editor props, default to null;
  // This will over-ride any sub-tree text direction properties.
  forceTextDirection = null;
  subTreeTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  currentEditor = editor;
  currentDirtySubTrees = dirtySubTrees;
  currentPrevNodeMap = prevViewModel.nodeMap;
  currentNextNodeMap = nextViewModel.nodeMap;
  reconcileNode('root', null);
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // $FlowFixMe
  currentEditor = undefined;
  // $FlowFixMe
  currentDirtySubTrees = undefined;
  // $FlowFixMe
  currentPrevNodeMap = undefined;
  // $FlowFixMe
  currentNextNodeMap = undefined;
}

export function reconcileViewModel(
  nextViewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const prevViewModel = editor.getCurrentViewModel();
  const dirtySubTrees = nextViewModel._dirtySubTrees;
  const needsUpdate = dirtySubTrees === null || nextViewModel.hasDirtyNodes();
  const nextSelection = nextViewModel.selection;

  if (needsUpdate) {
    reconcileRoot(prevViewModel, nextViewModel, editor, dirtySubTrees);
  }
  if (nextSelection !== null && nextSelection._isDirty) {
    reconcileSelection(nextSelection, editor);
  }
}

function reconcileSelection(selection: Selection, editor: OutlineEditor): void {
  const startOffset = selection.anchorOffset;
  const endOffset = selection.focusOffset;
  const anchorKey = selection.anchorKey;
  const focusKey = selection.focusKey;
  if (anchorKey === null || focusKey === null) {
    throw new Error('reconcileSelection: anchorKey or focusKey cannot be null');
  }
  const domSelection = window.getSelection();
  const range = document.createRange();
  const startElement = getSelectionElement(anchorKey, editor);
  const endElement = getSelectionElement(focusKey, editor);
  range.collapse(selection.isCollapsed);
  range.setStart(startElement, startOffset);
  range.setEnd(endElement, endOffset);
  domSelection.removeAllRanges();
  domSelection.addRange(range);
}

function getSelectionElement(key: NodeKey, editor: OutlineEditor): Node {
  const element = editor.getElementByKey(key);
  const possibleTextNode = element.firstChild;
  return possibleTextNode != null && possibleTextNode.nodeType === 3
    ? possibleTextNode
    : element;
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
  nodeMap: NodeMapType,
): string | null {
  // Adjust target if dom is a text node
  const target = dom.nodeType === 3 ? dom.parentNode : dom;
  // $FlowFixMe: internal field
  const key: string | null = target.__outlineInternalRef || null;
  return key;
}
