/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMap} from './OutlineNode';
import type {OutlineEditor, EditorConfig} from './OutlineEditor';
import type {
  Selection as OutlineSelection,
  PointType,
} from './OutlineSelection';
import type {TextNode} from './OutlineTextNode';
import type {Node as ReactNode} from 'react';

import {ViewModel} from './OutlineViewModel';
import {
  isSelectionWithinEditor,
  getDOMTextNode,
  cloneDecorators,
  getCompositionKey,
  setCompositionKey,
} from './OutlineUtils';
import {IS_INERT, IS_RTL, IS_LTR, FULL_RECONCILE} from './OutlineConstants';
import invariant from 'shared/invariant';
import {isDecoratorNode} from './OutlineDecoratorNode';
import {BlockNode, isBlockNode} from './OutlineBlockNode';
import {isTextNode} from './OutlineTextNode';
import {isLineBreakNode} from './OutlineLineBreakNode';
import {isRootNode} from './OutlineRootNode';

let subTreeTextContent = '';
let editorTextContent = '';
let activeEditorConfig: EditorConfig<{...}>;
let activeEditor: OutlineEditor;
let treatAllNodesAsDirty: boolean = false;
let activeDirtySubTrees: Set<NodeKey>;
let activeDirtyNodes: Set<NodeKey>;
let activePrevNodeMap: NodeMap;
let activeNextNodeMap: NodeMap;
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
  let node = activeNextNodeMap.get(key);
  if (node === undefined) {
    invariant(false, 'createNode: node does not exist in nodeMap');
  }
  const dom = node.createDOM(activeEditorConfig);
  let flags = node.__flags;
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
    // Handle block children
    node = normalizeTextNodes(node);
    flags = node.__flags;
    if (flags & IS_LTR) {
      dom.dir = 'ltr';
    } else if (flags & IS_RTL) {
      dom.dir = 'rtl';
    }
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
      // $FlowFixMe: internal field
      const possibleLineBreak = parentDOM.__outlineLineBreak;
      if (possibleLineBreak != null) {
        parentDOM.insertBefore(dom, possibleLineBreak);
      } else {
        parentDOM.appendChild(dom);
      }
    }
  }
  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(node);
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

function isLastChildLineBreakOrDecorator(
  children: Array<NodeKey>,
  nodeMap: NodeMap,
): boolean {
  const childKey = children[children.length - 1];
  const node = nodeMap.get(childKey);
  return isLineBreakNode(node) || isDecoratorNode(node);
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
      isLastChildLineBreakOrDecorator(prevChildren, activePrevNodeMap));
  const nextLineBreak =
    nextChildren !== null &&
    (nextChildren.length === 0 ||
      isLastChildLineBreakOrDecorator(nextChildren, activeNextNodeMap));

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
      // $FlowFixMe: internal field
      const outlineLineBreak = dom.__outlineLineBreak;
      const canUseFastPath = outlineLineBreak == null;
      destroyChildren(
        prevChildren,
        0,
        prevChildrenLength - 1,
        canUseFastPath ? null : dom,
      );
      if (canUseFastPath) {
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
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

function reconcileNode(
  key: NodeKey,
  parentDOM: HTMLElement | null,
): HTMLElement {
  const prevNode = activePrevNodeMap.get(key);
  let nextNode = activeNextNodeMap.get(key);
  if (prevNode === undefined || nextNode === undefined) {
    invariant(
      false,
      'reconcileNode: prevNode or nextNode does not exist in nodeMap',
    );
  }
  const isDirty =
    treatAllNodesAsDirty ||
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
    nextNode = normalizeTextNodes(nextNode);
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
    const prevChildren = prevNode.__children;
    const nextChildren = nextNode.__children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || isDirty) {
      // We get the children again, in case they change.
      reconcileChildren(prevChildren, nextChildren, dom);
      if (!isRootNode(nextNode)) {
        reconcileBlockTerminatingLineBreak(prevChildren, nextChildren, dom);
      }
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
  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(nextNode);
  }
  return dom;
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
  dirtyType: 0 | 1 | 2,
  dirtySubTrees: Set<NodeKey>,
  dirtyNodes: Set<NodeKey>,
): void {
  subTreeTextContent = '';
  editorTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
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

export function updateViewModel(
  rootElement: HTMLElement,
  currentViewModel: ViewModel,
  pendingViewModel: ViewModel,
  currentSelection: OutlineSelection | null,
  pendingSelection: OutlineSelection | null,
  needsUpdate: boolean,
  editor: OutlineEditor,
): void {
  const observer = editor._observer;

  if (needsUpdate && observer !== null) {
    const dirtyType = editor._dirtyType;
    const dirtySubTrees = editor._dirtySubTrees;
    const dirtyNodes = editor._dirtyNodes;

    observer.disconnect();
    try {
      reconcileRoot(
        currentViewModel,
        pendingViewModel,
        editor,
        pendingSelection,
        dirtyType,
        dirtySubTrees,
        dirtyNodes,
      );
    } finally {
      observer.observe(rootElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }

  const domSelection: null | Selection = window.getSelection();
  if (
    domSelection !== null &&
    (needsUpdate || pendingSelection === null || pendingSelection.dirty)
  ) {
    reconcileSelection(pendingSelection, editor, domSelection);
  }
}

function scrollIntoViewIfNeeded(node: Node): void {
  // $FlowFixMe: this is valid, as we are checking the nodeType
  const element: Element = node.nodeType === 3 ? node.parentNode : node;
  if (element !== null) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom > window.innerHeight) {
      element.scrollIntoView(false);
    } else if (rect.top < 0) {
      element.scrollIntoView();
    }
  }
}

function reconcileSelection(
  selection: OutlineSelection | null,
  editor: OutlineEditor,
  domSelection: Selection,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;

  if (selection === null) {
    if (isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)) {
      domSelection.removeAllRanges();
    }
    return;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  if (__DEV__) {
    // Freeze the selection in DEV to prevent accidental mutations
    Object.freeze(anchor);
    Object.freeze(focus);
    Object.freeze(selection);
  }
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  const nextAnchorOffset = anchor.offset;
  const nextFocusOffset = focus.offset;
  let nextAnchorNode = anchorDOM;
  let nextFocusNode = focusDOM;

  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM);
  }
  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM);
  }
  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }

  const activeElement = document.activeElement;
  const rootElement = editor._rootElement;
  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode
  ) {
    // If the root element does not have focus, ensure it has focus
    if (
      rootElement !== null &&
      (activeElement === null || !rootElement.contains(activeElement))
    ) {
      rootElement.focus({preventScroll: true});
    }
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
    if (selection.isCollapsed() && rootElement === activeElement) {
      scrollIntoViewIfNeeded(nextAnchorNode);
    }
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

function adjustPointForMerge(
  point: PointType,
  currentKey: NodeKey,
  startingKey: NodeKey,
  blockKey: null | NodeKey,
  textLength: number,
  index: number,
): boolean {
  const anchorKey = point.key;
  const anchorOffset = point.offset;
  if (currentKey === anchorKey) {
    point.offset = textLength + anchorOffset;
    point.key = startingKey;
    return true;
  }
  return false;
}

function mergeAdjacentTextNodes(
  placements: Array<[TextNode, number]>,
  anchor: null | PointType,
  focus: null | PointType,
): void {
  // Merge all text nodes into the first node
  let writableMergeToNode: TextNode = placements[0][0].getWritable();
  const key = writableMergeToNode.__key;
  const compositionKey = getCompositionKey();
  const blockKey = writableMergeToNode.__parent;
  let textLength = writableMergeToNode.getTextContentSize();
  let selectionIsDirty = false;

  for (let i = 1; i < placements.length; i++) {
    const placement = placements[i];
    const textNode = placement[0];
    // Adjust the index by the current index of the placement + 1.
    // This is because we mutate the point offsets for block offsets
    // as we go, so we need to account for this.
    const index = placement[1] - i + 1;
    const siblingText = textNode.getTextContent();
    const textNodeKey = textNode.__key;
    if (compositionKey === textNodeKey) {
      setCompositionKey(key);
    }
    if (anchor !== null) {
      if (
        adjustPointForMerge(
          anchor,
          textNodeKey,
          key,
          blockKey,
          textLength,
          index,
        )
      ) {
        selectionIsDirty = true;
      }
    }
    if (focus !== null) {
      if (
        adjustPointForMerge(
          focus,
          textNodeKey,
          key,
          blockKey,
          textLength,
          index,
        )
      ) {
        selectionIsDirty = true;
      }
    }
    writableMergeToNode = writableMergeToNode.spliceText(
      textLength,
      0,
      siblingText,
    );
    textLength += siblingText.length;
    textNode.remove();
  }
  if (selectionIsDirty && activeSelection !== null) {
    activeSelection.dirty = true;
  }
}

function adjustPointForDeletion(
  point: PointType,
  key: NodeKey,
  blockKey: NodeKey,
  index: number,
): boolean {
  const anchorKey = point.key;
  if (key === anchorKey) {
    point.offset = index;
    point.key = blockKey;
    // $FlowFixMe: internal
    point.type = 'block';
    return true;
  }
  return false;
}

function removeStrandedEmptyTextNode(
  placements: Array<[TextNode, number]>,
  anchor: null | PointType,
  focus: null | PointType,
): void {
  const placement = placements[0];
  const node: TextNode = placement[0];
  const index = placement[1];
  const key = node.__key;
  const blockKey = node.__parent;
  let selectionIsDirty = false;

  // We should never try and remove a node during composition.
  // Composed nodes are also technically not really empty, they
  // have a no break space at the end.
  if (getCompositionKey() === key) {
    return;
  }

  if (anchor !== null && blockKey !== null) {
    if (adjustPointForDeletion(anchor, key, blockKey, index)) {
      selectionIsDirty = true;
    }
  }
  if (focus !== null && blockKey !== null) {
    if (adjustPointForDeletion(focus, key, blockKey, index)) {
      selectionIsDirty = true;
    }
  }
  if (selectionIsDirty && activeSelection !== null) {
    activeSelection.dirty = true;
  }
  node.remove();
}

function normalizeTextNodes(block: BlockNode): BlockNode {
  const children = block.getChildren();
  let placements: Array<[TextNode, number]> = [];
  let lastTextNodeFlags: number | null = null;
  let lastTextNodeFormat: number | null = null;
  let lastTextNodeStyle: string | null = null;
  let anchor = null;
  let focus = null;
  let lastTextNodeWasEmpty = false;

  if (activeSelection !== null) {
    anchor = activeSelection.anchor;
    focus = activeSelection.focus;
  }

  let removedNodes = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const index = i - removedNodes;

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
        placements.push([child, index]);
      } else {
        if (placements.length > 1) {
          mergeAdjacentTextNodes(placements, anchor, focus);
        } else if (lastTextNodeWasEmpty) {
          removeStrandedEmptyTextNode(placements, anchor, focus);
          removedNodes++;
        }
        placements = [[child, index]];
      }
      lastTextNodeWasEmpty = child.__text === '';
      lastTextNodeFlags = flags;
      lastTextNodeFormat = format;
      lastTextNodeStyle = style;
    } else {
      if (placements.length > 1) {
        mergeAdjacentTextNodes(placements, anchor, focus);
      } else if (lastTextNodeWasEmpty) {
        removeStrandedEmptyTextNode(placements, anchor, focus);
        removedNodes++;
      }
      lastTextNodeWasEmpty = false;
      placements = [];
      lastTextNodeFlags = null;
      lastTextNodeFormat = null;
      lastTextNodeStyle = null;
    }
  }
  if (placements.length > 1) {
    mergeAdjacentTextNodes(placements, anchor, focus);
  } else if (lastTextNodeWasEmpty) {
    removeStrandedEmptyTextNode(placements, anchor, focus);
  }
  return block.getLatest();
}
