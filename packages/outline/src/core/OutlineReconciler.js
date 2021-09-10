/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMapType} from './OutlineNode';
import type {OutlineEditor, EditorConfig} from './OutlineEditor';
import type {
  Selection as OutlineSelection,
  PointType,
} from './OutlineSelection';
import type {TextNode} from './OutlineTextNode';
import type {Node as ReactNode} from 'react';

import {triggerListeners, ViewModel} from './OutlineView';
import {
  isSelectionWithinEditor,
  isImmutableOrInertOrSegmented,
  getDOMTextNode,
} from './OutlineUtils';
import {IS_INERT, IS_RTL, IS_LTR} from './OutlineConstants';
import invariant from 'shared/invariant';
import {isDecoratorNode} from './OutlineDecoratorNode';
import {getCompositionKey, setCompositionKey} from './OutlineNode';
import {BlockNode, isBlockNode} from './OutlineBlockNode';
import {isTextNode} from './OutlineTextNode';
import {isLineBreakNode} from './OutlineLineBreakNode';

let subTreeTextContent = '';
let editorTextContent = '';
let activeEditorConfig: EditorConfig<{...}>;
let activeEditor: OutlineEditor;
let activeDirtySubTrees: null | Set<NodeKey>;
let activeDirtyNodes: null | Set<NodeKey>;
let activePrevNodeMap: NodeMapType;
let activeNextNodeMap: NodeMapType;
let activeSelection: null | OutlineSelection;
let activePrevKeyToDOMMap: Map<NodeKey, HTMLElement>;

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap.get(key);

  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key);
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
  insertDOM: null | Node,
): HTMLElement {
  const node = activeNextNodeMap.get(key);
  if (node === undefined) {
    invariant(false, 'createNode: node does not exist in nodeMap');
  }
  const dom = node.createDOM(activeEditorConfig);
  const flags = node.__flags;
  const isInert = flags & IS_INERT;
  storeDOMWithKey(key, dom, activeEditor);

  // This helps preserve the text, and stops spell check tools from
  // merging or break the spans (which happens if they are missing
  // this attribute).
  if (isTextNode(node)) {
    dom.setAttribute('data-outline-text', 'true');
  } else if (isDecoratorNode(node)) {
    dom.setAttribute('data-outline-decorator', 'true');
  }

  if (isInert) {
    const domStyle = dom.style;
    domStyle.pointerEvents = 'none';
    domStyle.userSelect = 'none';
    dom.contentEditable = 'false';
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
    normalizeTextNodes(node);
    const children = node.__children;
    const childrenLength = children.length;
    if (childrenLength !== 0) {
      const endIndex = childrenLength - 1;
      createChildren(children, 0, endIndex, dom, null);
    }
    reconcileBlockTerminatingLineBreak(null, children, dom);
  } else {
    if (isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // Decorators are always non editable
      dom.contentEditable = 'false';
    }
    const text = node.getTextContent();
    subTreeTextContent += text;
    editorTextContent += text;
  }
  if (parentDOM !== null) {
    if (insertDOM != null) {
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

function isLastChildLineBreak(
  children: Array<NodeKey>,
  nodeMap: NodeMapType,
): boolean {
  const childKey = children[children.length - 1];
  const node = nodeMap.get(childKey);
  return isLineBreakNode(node);
}

// If we end a block with a LinkBreakNode, then we need to add an additonal <br>
function reconcileBlockTerminatingLineBreak(
  prevChildren: null | Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  dom: HTMLElement,
): void {
  const prevLineBreak =
    prevChildren !== null &&
    (prevChildren.length === 0 ||
      isLastChildLineBreak(prevChildren, activePrevNodeMap));
  const nextLineBreak =
    nextChildren !== null &&
    (nextChildren.length === 0 ||
      isLastChildLineBreak(nextChildren, activeNextNodeMap));

  if (prevLineBreak) {
    if (!nextLineBreak) {
      // $FlowFixMe: internal field
      const element = dom.__outlineLineBreak;
      if (element != null) {
        dom.removeChild(element);
      }
      // $FlowFixMe: internal field
      dom.__outlineLineBreak = null;
    }
  } else if (nextLineBreak) {
    const element = document.createElement('br');
    // $FlowFixMe: internal field
    dom.__outlineLineBreak = element;
    dom.appendChild(element);
  }
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

function reconcileNode(
  key: NodeKey,
  parentDOM: HTMLElement | null,
): HTMLElement {
  const prevNode = activePrevNodeMap.get(key);
  const nextNode = activeNextNodeMap.get(key);
  if (prevNode === undefined || nextNode === undefined) {
    invariant(
      false,
      'reconcileNode: prevNode or nextNode does not exist in nodeMap',
    );
  }
  const isDirty =
    activeDirtyNodes === null ||
    activeDirtySubTrees === null ||
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
    return dom;
  }
  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorConfig)) {
    const replacementDOM = createNode(key, null, null);
    if (parentDOM === null) {
      invariant(false, 'reconcileNode: parentDOM is null');
    }
    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return replacementDOM;
  }

  if (isBlockNode(prevNode) && isBlockNode(nextNode)) {
    // Reconcile block children
    normalizeTextNodes(nextNode);
    const prevFlags = prevNode.__flags;
    const nextFlags = nextNode.getLatest().__flags;
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
    const prevChildren = prevNode.__children;
    const nextChildren = nextNode.getLatest().__children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || isDirty) {
      // We get the children again, in case they change.
      reconcileChildren(prevChildren, nextChildren, dom);
      reconcileBlockTerminatingLineBreak(prevChildren, nextChildren, dom);
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
  return dom;
}

export function cloneDecorators(editor: OutlineEditor): {[NodeKey]: ReactNode} {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
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

function getFirstChild(element: HTMLElement): Node | null {
  // $FlowFixMe: firstChild is always null or a Node
  return element.firstChild;
}

function getNextSibling(element: HTMLElement): Node | null {
  // $FlowFixMe: nextSibling is always null or a Node
  return element.nextSibling;
}

function reconcileNodeChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  dom: HTMLElement,
): void {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevChildrenSet: void | Set<NodeKey>;
  let nextChildrenSet: void | Set<NodeKey>;
  let siblingDOM: null | Node = getFirstChild(dom);
  let prevIndex = 0;
  let nextIndex = 0;

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex];
    const nextKey = nextChildren[nextIndex];

    if (prevKey === nextKey) {
      // Nove move, create or remove
      siblingDOM = getNextSibling(reconcileNode(nextKey, dom));
      prevIndex++;
      nextIndex++;
    } else {
      if (prevChildrenSet === undefined) {
        prevChildrenSet = new Set(prevChildren);
      }
      if (nextChildrenSet === undefined) {
        nextChildrenSet = new Set(nextChildren);
      }
      const nextHasPrevKey = nextChildrenSet.has(prevKey);
      const prevHasNextKey = prevChildrenSet.has(nextKey);

      if (!nextHasPrevKey) {
        // Remove prev
        siblingDOM = getNextSibling(
          getElementByKeyOrThrow(activeEditor, prevKey),
        );
        destroyNode(prevKey, dom);
        prevIndex++;
      } else if (!prevHasNextKey) {
        // Create next
        createNode(nextKey, dom, siblingDOM);
        nextIndex++;
      } else {
        // Move next
        const childDOM = getElementByKeyOrThrow(activeEditor, nextKey);
        if (childDOM === siblingDOM) {
          siblingDOM = getNextSibling(reconcileNode(nextKey, dom));
        } else {
          if (siblingDOM != null) {
            dom.insertBefore(childDOM, siblingDOM);
          } else {
            dom.appendChild(childDOM);
          }
          reconcileNode(nextKey, dom);
        }
        prevIndex++;
        nextIndex++;
      }
    }
  }
  const appendNewChildren = prevIndex > prevEndIndex;
  const removeOldChildren = nextIndex > nextEndIndex;

  if (appendNewChildren && !removeOldChildren) {
    const previousNode = nextChildren[nextEndIndex + 1];
    const insertDOM =
      previousNode === undefined
        ? null
        : activeEditor.getElementByKey(previousNode);
    createChildren(nextChildren, nextIndex, nextEndIndex, dom, insertDOM);
  } else if (removeOldChildren && !appendNewChildren) {
    destroyChildren(prevChildren, prevIndex, prevEndIndex, dom);
  }
}

function reconcileRoot(
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
  selection: null | OutlineSelection,
  dirtySubTrees: null | Set<NodeKey>,
  dirtyNodes: null | Set<NodeKey>,
): void {
  subTreeTextContent = '';
  editorTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  activeEditor = editor;
  activeEditorConfig = editor._config;
  activeDirtySubTrees = dirtySubTrees;
  activeDirtyNodes = dirtyNodes;
  activePrevNodeMap = prevViewModel._nodeMap;
  activeNextNodeMap = nextViewModel._nodeMap;
  activeSelection = selection;
  activePrevKeyToDOMMap = new Map(editor._keyToDOMMap);
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
  activeSelection = undefined;
  // $FlowFixMe
  activeEditorConfig = undefined;
  // $FlowFixMe
  activePrevKeyToDOMMap = undefined;
}

export function reconcileViewModel(
  rootElement: HTMLElement,
  prevViewModel: ViewModel,
  nextViewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const dirtySubTrees = editor._dirtySubTrees;
  const dirtyNodes = editor._dirtyNodes;
  // When a view model is historic, we bail out of using dirty checks and
  // always do a full reconciliation to ensure consistency.
  const needsUpdate = dirtyNodes === null || dirtyNodes.size > 0;
  const prevSelection = prevViewModel._selection;
  const nextSelection = nextViewModel._selection;

  if (needsUpdate) {
    triggerListeners('mutation', editor, null);
    try {
      reconcileRoot(
        prevViewModel,
        nextViewModel,
        editor,
        nextSelection,
        dirtySubTrees,
        dirtyNodes,
      );
    } finally {
      triggerListeners('mutation', editor, rootElement);
    }
  }

  const domSelection: null | Selection = window.getSelection();
  if (domSelection !== null) {
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
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  let nextAnchorNode;
  let nextFocusNode;
  let nextAnchorOffset;
  let nextFocusOffset;

  if (anchor.type === 'text') {
    const nextSelectionAnchorOffset = anchor.offset;
    nextAnchorNode = getDOMTextNode(anchorDOM);
    nextAnchorOffset =
      isImmutableOrInertOrSegmented(anchorNode) ||
      anchorNode.getTextContent() !== ''
        ? nextSelectionAnchorOffset
        : nextSelectionAnchorOffset + 1;
  } else {
    nextAnchorNode = anchorDOM;
    nextAnchorOffset = anchor.offset;
  }
  if (focus.type === 'text') {
    const nextSelectionFocusOffset = focus.offset;
    nextFocusNode = getDOMTextNode(focusDOM);
    nextFocusOffset =
      isImmutableOrInertOrSegmented(focusNode) ||
      focusNode.getTextContent() !== ''
        ? nextSelectionFocusOffset
        : nextSelectionFocusOffset + 1;
  } else {
    nextFocusNode = focusDOM;
    nextFocusOffset = focus.offset;
  }
  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode
  ) {
    return;
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      nextAnchorNode,
      nextAnchorOffset,
      nextFocusNode,
      nextFocusOffset,
    );
  } catch (error) {
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

function getPrevElementByKeyOrThrow(key: NodeKey): HTMLElement {
  const element = activePrevKeyToDOMMap.get(key);
  if (element === undefined) {
    invariant(
      false,
      'Reconciliation: could not find DOM element for node key "${key}"',
    );
  }
  return element;
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

function mergeAdjacentTextNodes(
  textNodes: Array<TextNode>,
  anchor: null | PointType,
  focus: null | PointType,
): void {
  // Merge all text nodes into the first node
  const writableMergeToNode = textNodes[0].getWritable();
  const key = writableMergeToNode.__key;
  const compositionKey = getCompositionKey();
  let textLength = writableMergeToNode.getTextContentSize();
  let selectionIsDirty = false;

  for (let i = 1; i < textNodes.length; i++) {
    const textNode = textNodes[i];
    const siblingText = textNode.getTextContent();
    const textNodeKey = textNode.__key;
    if (compositionKey === textNodeKey) {
      setCompositionKey(key);
    }
    if (anchor !== null && textNodeKey === anchor.key) {
      anchor.offset = textLength + anchor.offset;
      anchor.key = key;
      selectionIsDirty = true;
    }
    if (focus !== null && textNodeKey === focus.key) {
      focus.offset = textLength + focus.offset;
      focus.key = key;
      selectionIsDirty = true;
    }
    writableMergeToNode.spliceText(textLength, 0, siblingText);
    textLength += siblingText.length;
    textNode.remove();
  }
  if (selectionIsDirty && activeSelection !== null) {
    activeSelection.isDirty = true;
  }
}

function normalizeTextNodes(block: BlockNode): void {
  const children = block.getChildren();
  let toNormalize = [];
  let lastTextNodeFlags: number | null = null;
  let lastTextNodeFormat: number | null = null;
  let lastTextNodeStyle: string | null = null;
  let anchor = null;
  let focus = null;

  if (activeSelection !== null) {
    anchor = activeSelection.anchor;
    focus = activeSelection.focus;
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (
      isTextNode(child) &&
      child.__type === 'text' &&
      !child.isImmutable() &&
      !child.isSegmented() &&
      !child.isUnmergeable()
    ) {
      const flags = child.__flags;
      const format = child.__format;
      const style = child.__style;
      if (
        (lastTextNodeFlags === null || flags === lastTextNodeFlags) &&
        (lastTextNodeFormat === null || format === lastTextNodeFormat) &&
        (lastTextNodeStyle === null || style === lastTextNodeStyle)
      ) {
        toNormalize.push(child);
      } else {
        if (toNormalize.length > 1) {
          mergeAdjacentTextNodes(toNormalize, anchor, focus);
        }
        toNormalize = [child];
      }
      lastTextNodeFlags = flags;
      lastTextNodeFormat = format;
      lastTextNodeStyle = style;
    } else {
      if (toNormalize.length > 1) {
        mergeAdjacentTextNodes(toNormalize, anchor, focus);
      }
      toNormalize = [];
      lastTextNodeFlags = null;
      lastTextNodeFormat = null;
      lastTextNodeStyle = null;
    }
  }
  if (toNormalize.length > 1) {
    mergeAdjacentTextNodes(toNormalize, anchor, focus);
  }
}
