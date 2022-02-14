/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
} from './LexicalEditor';
import type {NodeKey, NodeMap} from './LexicalNode';
import type {RangeSelection} from './LexicalSelection';
import type {ElementNode} from './nodes/base/LexicalElementNode';
import type {Node as ReactNode} from 'react';

import invariant from 'shared/invariant';

import {
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
} from '.';
import {
  DOM_TEXT_TYPE,
  FULL_RECONCILE,
  IS_ALIGN_CENTER,
  IS_ALIGN_JUSTIFY,
  IS_ALIGN_LEFT,
  IS_ALIGN_RIGHT,
} from './LexicalConstants';
import {EditorState} from './LexicalEditorState';
import {
  cloneDecorators,
  getDOMTextNode,
  getTextDirection,
  isSelectionWithinEditor,
} from './LexicalUtils';

let subTreeTextContent = '';
let subTreeDirectionedTextContent = '';
let editorTextContent = '';
let activeEditorConfig: EditorConfig<{...}>;
let activeEditor: LexicalEditor;
let treatAllNodesAsDirty: boolean = false;
let activeEditorStateReadOnly: boolean = false;
let activeTextDirection = null;
let activeDirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
let activeDirtyLeaves: Set<NodeKey>;
let activePrevNodeMap: NodeMap;
let activeNextNodeMap: NodeMap;
let activePrevKeyToDOMMap: Map<NodeKey, HTMLElement>;

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap.get(key);

  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key);
    parentDOM.removeChild(dom);
  }
  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding LexicalNodes are removed from the editor state.
  if (!activeNextNodeMap.has(key)) {
    activeEditor._keyToDOMMap.delete(key);
  }
  if ($isElementNode(node)) {
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

function setTextAlign(domStyle: CSSStyleDeclaration, value: string): void {
  domStyle.setProperty('text-align', value);
}

function setElementIndent(dom: HTMLElement, indent: number): void {
  dom.style.setProperty(
    'padding-inline-start',
    indent === 0 ? '' : indent * 40 + 'px',
  );
}

function setElementFormat(dom: HTMLElement, format: number): void {
  const domStyle = dom.style;
  if (format === 0) {
    setTextAlign(domStyle, '');
  } else if (format === IS_ALIGN_LEFT) {
    setTextAlign(domStyle, 'left');
  } else if (format === IS_ALIGN_CENTER) {
    setTextAlign(domStyle, 'center');
  } else if (format === IS_ALIGN_RIGHT) {
    setTextAlign(domStyle, 'right');
  } else if (format === IS_ALIGN_JUSTIFY) {
    setTextAlign(domStyle, 'justify');
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
  const dom = node.createDOM(activeEditorConfig, activeEditor);
  storeDOMWithKey(key, dom, activeEditor);

  // This helps preserve the text, and stops spell check tools from
  // merging or break the spans (which happens if they are missing
  // this attribute).
  if ($isTextNode(node)) {
    dom.setAttribute('data-lexical-text', 'true');
  } else if ($isDecoratorNode(node)) {
    dom.setAttribute('data-lexical-decorator', 'true');
  }

  if ($isElementNode(node)) {
    const indent = node.__indent;
    if (indent !== 0) {
      setElementIndent(dom, indent);
    }
    const children = node.__children;
    const childrenLength = children.length;
    if (childrenLength !== 0) {
      const endIndex = childrenLength - 1;
      createChildrenWithDirection(children, endIndex, node, dom);
    }
    const format = node.__format;
    if (format !== 0) {
      setElementFormat(dom, format);
    }
    reconcileElementTerminatingLineBreak(null, children, dom);
  } else {
    if ($isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor);
      const text = node.getTextContent();
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // Decorators are always non editable
      dom.contentEditable = 'false';
      subTreeTextContent += text;
      editorTextContent += text;
    } else {
      const text = node.getTextContent();
      if ($isTextNode(node)) {
        if (!node.isDirectionless()) {
          subTreeDirectionedTextContent += text;
        }
        if (node.isInert()) {
          const domStyle = dom.style;
          domStyle.pointerEvents = 'none';
          domStyle.userSelect = 'none';
          dom.contentEditable = 'false';
          // To support Safari
          domStyle.setProperty('-webkit-user-select', 'none');
        }
      }
      subTreeTextContent += text;
      editorTextContent += text;
    }
  }
  if (parentDOM !== null) {
    if (insertDOM != null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      // $FlowFixMe: internal field
      const possibleLineBreak = parentDOM.__lexicalLineBreak;
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

function createChildrenWithDirection(
  children: Array<NodeKey>,
  endIndex: number,
  element: ElementNode,
  dom: HTMLElement,
): void {
  const previousSubTreeDirectionedTextContent = subTreeDirectionedTextContent;
  subTreeDirectionedTextContent = '';
  createChildren(children, 0, endIndex, dom, null);
  reconcileBlockDirection(element, dom);
  subTreeDirectionedTextContent = previousSubTreeDirectionedTextContent;
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
  dom.__lexicalTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

function isLastChildLineBreakOrDecorator(
  children: Array<NodeKey>,
  nodeMap: NodeMap,
): boolean {
  const childKey = children[children.length - 1];
  const node = nodeMap.get(childKey);
  return $isLineBreakNode(node) || $isDecoratorNode(node);
}

// If we end an element with a LinkBreakNode, then we need to add an additonal <br>
function reconcileElementTerminatingLineBreak(
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
      const element = dom.__lexicalLineBreak;
      if (element != null) {
        dom.removeChild(element);
      }
      // $FlowFixMe: internal field
      dom.__lexicalLineBreak = null;
    }
  } else if (nextLineBreak) {
    const element = document.createElement('br');
    // $FlowFixMe: internal field
    dom.__lexicalLineBreak = element;
    dom.appendChild(element);
  }
}

function reconcileBlockDirection(element: ElementNode, dom: HTMLElement): void {
  const previousSubTreeDirectionTextContent: string =
    // $FlowFixMe: internal field
    dom.__lexicalDirTextContent;
  // $FlowFixMe: internal field
  const previousDirection: string = dom.__lexicalDir;

  if (
    previousSubTreeDirectionTextContent !== subTreeDirectionedTextContent ||
    previousDirection !== activeTextDirection
  ) {
    const hasEmptyDirectionedTextContent = subTreeDirectionedTextContent === '';
    const direction = hasEmptyDirectionedTextContent
      ? activeTextDirection
      : getTextDirection(subTreeDirectionedTextContent);

    if (direction !== previousDirection) {
      const classList = dom.classList;
      const theme = activeEditorConfig.theme;

      if (
        direction === null ||
        (hasEmptyDirectionedTextContent && direction === 'ltr')
      ) {
        dom.removeAttribute('dir');
        let previousDirectionTheme = theme[previousDirection];
        if (previousDirectionTheme !== undefined) {
          if (typeof previousDirectionTheme === 'string') {
            const classNamesArr = previousDirectionTheme.split(' ');
            // $FlowFixMe: intentional
            previousDirectionTheme = theme[previousDirection] = classNamesArr;
          }
          // $FlowFixMe: intentional
          classList.remove(...previousDirectionTheme);
        }
      } else if (direction !== null) {
        let directionTheme = theme[direction];
        if (directionTheme !== undefined) {
          if (typeof directionTheme === 'string') {
            const classNamesArr = directionTheme.split(' ');
            // $FlowFixMe: intentional
            directionTheme = theme[previousDirection] = classNamesArr;
          }
          classList.add(...directionTheme);
        }
        dom.dir = direction;
      }
      if (!activeEditorStateReadOnly) {
        const writableNode = element.getWritable();
        writableNode.__dir = direction;
      }
    }
    activeTextDirection = direction;
    // $FlowFixMe: internal field
    dom.__lexicalDirTextContent = subTreeDirectionedTextContent;
    // $FlowFixMe: internal field
    dom.__lexicalDir = direction;
  }
}

function reconcileChildrenWithDirection(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  element: ElementNode,
  dom: HTMLElement,
): void {
  const previousSubTreeDirectionTextContent = subTreeDirectionedTextContent;
  subTreeDirectionedTextContent = '';
  reconcileChildren(prevChildren, nextChildren, dom);
  reconcileBlockDirection(element, dom);
  subTreeDirectionedTextContent = previousSubTreeDirectionTextContent;
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
      const lastDOM = getPrevElementByKeyOrThrow(prevChildKey);
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
      const lexicalLineBreak = dom.__lexicalLineBreak;
      const canUseFastPath = lexicalLineBreak == null;
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
  dom.__lexicalTextContent = subTreeTextContent;
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
    activeDirtyLeaves.has(key) ||
    activeDirtyElements.has(key);
  const dom = getElementByKeyOrThrow(activeEditor, key);

  if (prevNode === nextNode && !isDirty) {
    if ($isElementNode(prevNode)) {
      // $FlowFixMe: internal field
      const previousSubTreeTextContent = dom.__lexicalTextContent;
      if (previousSubTreeTextContent !== undefined) {
        subTreeTextContent += previousSubTreeTextContent;
        editorTextContent += previousSubTreeTextContent;
      }
      // $FlowFixMe: internal field
      const previousSubTreeDirectionTextContent = dom.__lexicalDirTextContent;
      if (previousSubTreeDirectionTextContent !== undefined) {
        subTreeDirectionedTextContent += previousSubTreeDirectionTextContent;
      }
    } else if (!$isDecoratorNode(prevNode)) {
      const text = prevNode.getTextContent();
      if ($isTextNode(prevNode) && !prevNode.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }
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

  if ($isElementNode(prevNode) && $isElementNode(nextNode)) {
    // Reconcile element children
    const nextIndent = nextNode.__indent;
    if (nextIndent !== prevNode.__indent) {
      setElementIndent(dom, nextIndent);
    }
    const nextFormat = nextNode.__format;
    if (nextFormat !== prevNode.__format) {
      setElementFormat(dom, nextFormat);
    }
    const prevChildren = prevNode.__children;
    const nextChildren = nextNode.__children;
    const childrenAreDifferent = prevChildren !== nextChildren;

    if (childrenAreDifferent || isDirty) {
      reconcileChildrenWithDirection(prevChildren, nextChildren, nextNode, dom);
      if (!$isRootNode(nextNode)) {
        reconcileElementTerminatingLineBreak(prevChildren, nextChildren, dom);
      }
    }
  } else {
    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor);
      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    } else {
      // Handle text content, for LTR, LTR cases.
      const text = nextNode.getTextContent();
      if ($isTextNode(nextNode) && !nextNode.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }
      subTreeTextContent += text;
      editorTextContent += text;
    }
  }
  if (
    !activeEditorStateReadOnly &&
    $isRootNode(nextNode) &&
    nextNode.__cachedText !== editorTextContent
  ) {
    // Cache the latest text content.
    nextNode = nextNode.getWritable();
    nextNode.__cachedText = editorTextContent;
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
        siblingDOM = getNextSibling(getPrevElementByKeyOrThrow(prevKey));
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
  prevEditorState: EditorState,
  nextEditorState: EditorState,
  editor: LexicalEditor,
  selection: null | RangeSelection,
  dirtyType: 0 | 1 | 2,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
): void {
  subTreeTextContent = '';
  editorTextContent = '';
  subTreeDirectionedTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
  activeTextDirection = null;
  activeEditor = editor;
  activeEditorConfig = editor._config;
  activeDirtyElements = dirtyElements;
  activeDirtyLeaves = dirtyLeaves;
  activePrevNodeMap = prevEditorState._nodeMap;
  activeNextNodeMap = nextEditorState._nodeMap;
  activeEditorStateReadOnly = nextEditorState._readOnly;
  activePrevKeyToDOMMap = new Map(editor._keyToDOMMap);
  reconcileNode('root', null);

  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // $FlowFixMe
  activeEditor = undefined;
  // $FlowFixMe
  activeDirtyElements = undefined;
  // $FlowFixMe
  activeDirtyLeaves = undefined;
  // $FlowFixMe
  activePrevNodeMap = undefined;
  // $FlowFixMe
  activeNextNodeMap = undefined;
  // $FlowFixMe
  activeEditorConfig = undefined;
  // $FlowFixMe
  activePrevKeyToDOMMap = undefined;
}

export function updateEditorState(
  rootElement: HTMLElement,
  currentEditorState: EditorState,
  pendingEditorState: EditorState,
  currentSelection: RangeSelection | null,
  pendingSelection: RangeSelection | null,
  needsUpdate: boolean,
  editor: LexicalEditor,
): void {
  const observer = editor._observer;

  if (needsUpdate && observer !== null) {
    const dirtyType = editor._dirtyType;
    const dirtyElements = editor._dirtyElements;
    const dirtyLeaves = editor._dirtyLeaves;

    observer.disconnect();
    try {
      reconcileRoot(
        currentEditorState,
        pendingEditorState,
        editor,
        pendingSelection,
        dirtyType,
        dirtyElements,
        dirtyLeaves,
      );
    } finally {
      observer.observe(rootElement, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
  }

  const domSelection: null | Selection = window.getSelection();
  if (
    domSelection !== null &&
    (needsUpdate || pendingSelection === null || pendingSelection.dirty)
  ) {
    reconcileSelection(
      currentSelection,
      pendingSelection,
      editor,
      domSelection,
    );
  }
}

function scrollIntoViewIfNeeded(node: Node, rootElement: ?HTMLElement): void {
  const element: Element =
    // $FlowFixMe: this is valid, as we are checking the nodeType
    node.nodeType === DOM_TEXT_TYPE ? node.parentNode : node;
  if (element !== null) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom > window.innerHeight) {
      element.scrollIntoView(false);
    } else if (rect.top < 0) {
      element.scrollIntoView();
    } else if (rootElement) {
      const rootRect = rootElement.getBoundingClientRect();
      if (rect.bottom > rootRect.bottom) {
        element.scrollIntoView(false);
      } else if (rect.top < rootRect.top) {
        element.scrollIntoView();
      }
    }
  }
}

function reconcileSelection(
  prevSelection: RangeSelection | null,
  nextSelection: RangeSelection | null,
  editor: LexicalEditor,
  domSelection: Selection,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;
  const activeElement = document.activeElement;
  const rootElement = editor._rootElement;
  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (
    editor._updateTags.has('collaboration') &&
    activeElement !== rootElement
  ) {
    return;
  }

  if (nextSelection === null) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (
      prevSelection !== null &&
      isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)
    ) {
      domSelection.removeAllRanges();
    }
    return;
  }
  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  if (__DEV__) {
    // Freeze the selection in DEV to prevent accidental mutations
    Object.freeze(anchor);
    Object.freeze(focus);
    Object.freeze(nextSelection);
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
    if (nextSelection.isCollapsed() && rootElement === activeElement) {
      scrollIntoViewIfNeeded(nextAnchorNode, rootElement);
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
  editor: LexicalEditor,
): void {
  const keyToDOMMap = editor._keyToDOMMap;
  // $FlowFixMe: internal field
  dom['__lexicalKey_' + editor._key] = key;
  keyToDOMMap.set(key, dom);
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
  editor: LexicalEditor,
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
