/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalEditor,
  MutatedNodes,
  MutationListeners,
  RegisteredNodes,
} from './LexicalEditor';
import type {LexicalPrivateDOM, NodeKey, NodeMap} from './LexicalNode';
import type {ElementDOMSlot, ElementNode} from './nodes/LexicalElementNode';

import invariant from 'shared/invariant';

import {
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
} from '.';
import {
  DOUBLE_LINE_BREAK,
  FULL_RECONCILE,
  IS_ALIGN_CENTER,
  IS_ALIGN_END,
  IS_ALIGN_JUSTIFY,
  IS_ALIGN_LEFT,
  IS_ALIGN_RIGHT,
  IS_ALIGN_START,
} from './LexicalConstants';
import {EditorState} from './LexicalEditorState';
import {
  $textContentRequiresDoubleLinebreakAtEnd,
  cloneDecorators,
  getElementByKeyOrThrow,
  setMutatedNode,
  setNodeKeyOnDOMNode,
} from './LexicalUtils';

type IntentionallyMarkedAsDirtyElement = boolean;

let subTreeTextContent = '';
let subTreeTextFormat: number | null = null;
let subTreeTextStyle: string = '';
let editorTextContent = '';
let activeEditorConfig: EditorConfig;
let activeEditor: LexicalEditor;
let activeEditorNodes: RegisteredNodes;
let treatAllNodesAsDirty = false;
let activeEditorStateReadOnly = false;
let activeMutationListeners: MutationListeners;
let activeDirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
let activeDirtyLeaves: Set<NodeKey>;
let activePrevNodeMap: NodeMap;
let activeNextNodeMap: NodeMap;
let activePrevKeyToDOMMap: Map<NodeKey, HTMLElement>;
let mutatedNodes: MutatedNodes;

function destroyNode(key: NodeKey, parentDOM: null | HTMLElement): void {
  const node = activePrevNodeMap.get(key);

  if (parentDOM !== null) {
    const dom = getPrevElementByKeyOrThrow(key);
    if (dom.parentNode === parentDOM) {
      parentDOM.removeChild(dom);
    }
  }

  // This logic is really important, otherwise we will leak DOM nodes
  // when their corresponding LexicalNodes are removed from the editor state.
  if (!activeNextNodeMap.has(key)) {
    activeEditor._keyToDOMMap.delete(key);
  }

  if ($isElementNode(node)) {
    const children = createChildrenArray(node, activePrevNodeMap);
    destroyChildren(children, 0, children.length - 1, null);
  }

  if (node !== undefined) {
    setMutatedNode(
      mutatedNodes,
      activeEditorNodes,
      activeMutationListeners,
      node,
      'destroyed',
    );
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

const DEFAULT_INDENT_VALUE = '40px';

function setElementIndent(dom: HTMLElement, indent: number): void {
  const indentClassName = activeEditorConfig.theme.indent;

  if (typeof indentClassName === 'string') {
    const elementHasClassName = dom.classList.contains(indentClassName);

    if (indent > 0 && !elementHasClassName) {
      dom.classList.add(indentClassName);
    } else if (indent < 1 && elementHasClassName) {
      dom.classList.remove(indentClassName);
    }
  }

  const indentationBaseValue =
    getComputedStyle(dom).getPropertyValue('--lexical-indent-base-value') ||
    DEFAULT_INDENT_VALUE;

  dom.style.setProperty(
    'padding-inline-start',
    indent === 0 ? '' : `calc(${indent} * ${indentationBaseValue})`,
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
  } else if (format === IS_ALIGN_START) {
    setTextAlign(domStyle, 'start');
  } else if (format === IS_ALIGN_END) {
    setTextAlign(domStyle, 'end');
  }
}

export function $getReconciledDirection(
  node: ElementNode,
): 'ltr' | 'rtl' | 'auto' | null {
  const direction = node.__dir;
  if (direction !== null) {
    return direction;
  }
  if ($isRootNode(node)) {
    return null;
  }
  const parent = node.getParentOrThrow();
  if (!$isRootNode(parent) || parent.__dir !== null) {
    return null;
  }
  return 'auto';
}

function $setElementDirection(dom: HTMLElement, node: ElementNode): void {
  const direction = $getReconciledDirection(node);
  if (direction !== null) {
    dom.dir = direction;
  } else {
    dom.removeAttribute('dir');
  }
}

function $createNode(key: NodeKey, slot: ElementDOMSlot | null): HTMLElement {
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
    const childrenSize = node.__size;
    $setElementDirection(dom, node);
    if (indent !== 0) {
      setElementIndent(dom, indent);
    }
    if (childrenSize !== 0) {
      const endIndex = childrenSize - 1;
      const children = createChildrenArray(node, activeNextNodeMap);
      $createChildren(children, node, 0, endIndex, node.getDOMSlot(dom));
    }
    const format = node.__format;

    if (format !== 0) {
      setElementFormat(dom, format);
    }
    if (!node.isInline()) {
      reconcileElementTerminatingLineBreak(null, node, dom);
    }
    if ($textContentRequiresDoubleLinebreakAtEnd(node)) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
      editorTextContent += DOUBLE_LINE_BREAK;
    }
  } else {
    const text = node.getTextContent();

    if ($isDecoratorNode(node)) {
      const decorator = node.decorate(activeEditor, activeEditorConfig);

      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
      // Decorators are always non editable
      dom.contentEditable = 'false';
    }
    subTreeTextContent += text;
    editorTextContent += text;
  }

  if (slot !== null) {
    slot.insertChild(dom);
  }

  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(node);
  }

  setMutatedNode(
    mutatedNodes,
    activeEditorNodes,
    activeMutationListeners,
    node,
    'created',
  );
  return dom;
}

function $createChildren(
  children: Array<NodeKey>,
  element: ElementNode & LexicalPrivateDOM,
  _startIndex: number,
  endIndex: number,
  slot: ElementDOMSlot,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  subTreeTextContent = '';
  let startIndex = _startIndex;

  for (; startIndex <= endIndex; ++startIndex) {
    $createNode(children[startIndex], slot);
    const node = activeNextNodeMap.get(children[startIndex]);
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat();
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = node.getStyle();
      }
    }
  }
  if ($textContentRequiresDoubleLinebreakAtEnd(element)) {
    subTreeTextContent += DOUBLE_LINE_BREAK;
  }
  const dom: HTMLElement & LexicalPrivateDOM = slot.element;
  dom.__lexicalTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

type LastChildState = 'line-break' | 'decorator' | 'empty';
function isLastChildLineBreakOrDecorator(
  element: null | ElementNode,
  nodeMap: NodeMap,
): null | LastChildState {
  if (element) {
    const lastKey = element.__last;
    if (lastKey) {
      const node = nodeMap.get(lastKey);
      if (node) {
        return $isLineBreakNode(node)
          ? 'line-break'
          : $isDecoratorNode(node) && node.isInline()
            ? 'decorator'
            : null;
      }
    }
    return 'empty';
  }
  return null;
}

// If we end an element with a LineBreakNode, then we need to add an additional <br>
function reconcileElementTerminatingLineBreak(
  prevElement: null | ElementNode,
  nextElement: ElementNode,
  dom: HTMLElement & LexicalPrivateDOM,
): void {
  const prevLineBreak = isLastChildLineBreakOrDecorator(
    prevElement,
    activePrevNodeMap,
  );
  const nextLineBreak = isLastChildLineBreakOrDecorator(
    nextElement,
    activeNextNodeMap,
  );
  if (prevLineBreak !== nextLineBreak) {
    nextElement.getDOMSlot(dom).setManagedLineBreak(nextLineBreak);
  }
}

function reconcileTextFormat(element: ElementNode): void {
  if (
    subTreeTextFormat != null &&
    subTreeTextFormat !== element.__textFormat &&
    !activeEditorStateReadOnly
  ) {
    element.setTextFormat(subTreeTextFormat);
  }
}

function reconcileTextStyle(element: ElementNode): void {
  if (
    subTreeTextStyle !== '' &&
    subTreeTextStyle !== element.__textStyle &&
    !activeEditorStateReadOnly
  ) {
    element.setTextStyle(subTreeTextStyle);
  }
}

function $reconcileChildrenWithDirection(
  prevElement: ElementNode,
  nextElement: ElementNode,
  dom: HTMLElement,
): void {
  subTreeTextFormat = null;
  subTreeTextStyle = '';
  $reconcileChildren(prevElement, nextElement, nextElement.getDOMSlot(dom));
  reconcileTextFormat(nextElement);
  reconcileTextStyle(nextElement);
}

function createChildrenArray(
  element: ElementNode,
  nodeMap: NodeMap,
): Array<NodeKey> {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node = nodeMap.get(nodeKey);
    if (node === undefined) {
      invariant(false, 'createChildrenArray: node does not exist in nodeMap');
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}

function $reconcileChildren(
  prevElement: ElementNode,
  nextElement: ElementNode,
  slot: ElementDOMSlot,
): void {
  const previousSubTreeTextContent = subTreeTextContent;
  const prevChildrenSize = prevElement.__size;
  const nextChildrenSize = nextElement.__size;
  subTreeTextContent = '';
  const dom: HTMLElement & LexicalPrivateDOM = slot.element;

  if (prevChildrenSize === 1 && nextChildrenSize === 1) {
    const prevFirstChildKey: NodeKey = prevElement.__first!;
    const nextFirstChildKey: NodeKey = nextElement.__first!;
    if (prevFirstChildKey === nextFirstChildKey) {
      $reconcileNode(prevFirstChildKey, dom);
    } else {
      const lastDOM = getPrevElementByKeyOrThrow(prevFirstChildKey);
      const replacementDOM = $createNode(nextFirstChildKey, null);
      try {
        dom.replaceChild(replacementDOM, lastDOM);
      } catch (error) {
        if (typeof error === 'object' && error != null) {
          const msg = `${error.toString()} Parent: ${
            dom.tagName
          }, new child: {tag: ${
            replacementDOM.tagName
          } key: ${nextFirstChildKey}}, old child: {tag: ${
            lastDOM.tagName
          }, key: ${prevFirstChildKey}}.`;
          throw new Error(msg);
        } else {
          throw error;
        }
      }
      destroyNode(prevFirstChildKey, null);
    }
    const nextChildNode = activeNextNodeMap.get(nextFirstChildKey);
    if ($isTextNode(nextChildNode)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = nextChildNode.getFormat();
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = nextChildNode.getStyle();
      }
    }
  } else {
    const prevChildren = createChildrenArray(prevElement, activePrevNodeMap);
    const nextChildren = createChildrenArray(nextElement, activeNextNodeMap);
    invariant(
      prevChildren.length === prevChildrenSize,
      '$reconcileChildren: prevChildren.length !== prevChildrenSize',
    );
    invariant(
      nextChildren.length === nextChildrenSize,
      '$reconcileChildren: nextChildren.length !== nextChildrenSize',
    );

    if (prevChildrenSize === 0) {
      if (nextChildrenSize !== 0) {
        $createChildren(
          nextChildren,
          nextElement,
          0,
          nextChildrenSize - 1,
          slot,
        );
      }
    } else if (nextChildrenSize === 0) {
      if (prevChildrenSize !== 0) {
        const canUseFastPath =
          slot.after == null &&
          slot.before == null &&
          (slot.element as HTMLElement & LexicalPrivateDOM)
            .__lexicalLineBreak == null;
        destroyChildren(
          prevChildren,
          0,
          prevChildrenSize - 1,
          canUseFastPath ? null : dom,
        );

        if (canUseFastPath) {
          // Fast path for removing DOM nodes
          dom.textContent = '';
        }
      }
    } else {
      $reconcileNodeChildren(
        nextElement,
        prevChildren,
        nextChildren,
        prevChildrenSize,
        nextChildrenSize,
        slot,
      );
    }
  }

  if ($textContentRequiresDoubleLinebreakAtEnd(nextElement)) {
    subTreeTextContent += DOUBLE_LINE_BREAK;
  }

  dom.__lexicalTextContent = subTreeTextContent;
  subTreeTextContent = previousSubTreeTextContent + subTreeTextContent;
}

function $reconcileNode(
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
  const dom: HTMLElement & LexicalPrivateDOM = getElementByKeyOrThrow(
    activeEditor,
    key,
  );

  // If the node key points to the same instance in both states
  // and isn't dirty, we just update the text content cache
  // and return the existing DOM Node.
  if (prevNode === nextNode && !isDirty) {
    if ($isElementNode(prevNode)) {
      const previousSubTreeTextContent = dom.__lexicalTextContent;

      if (previousSubTreeTextContent !== undefined) {
        subTreeTextContent += previousSubTreeTextContent;
        editorTextContent += previousSubTreeTextContent;
      }
    } else {
      const text = prevNode.getTextContent();
      editorTextContent += text;
      subTreeTextContent += text;
    }

    return dom;
  }
  // If the node key doesn't point to the same instance in both maps,
  // it was cloned. If it's also dirty, we mark it as mutated.
  if (prevNode !== nextNode && isDirty) {
    setMutatedNode(
      mutatedNodes,
      activeEditorNodes,
      activeMutationListeners,
      nextNode,
      'updated',
    );
  }

  // Update node. If it returns true, we need to unmount and re-create the node
  if (nextNode.updateDOM(prevNode, dom, activeEditorConfig)) {
    const replacementDOM = $createNode(key, null);

    if (parentDOM === null) {
      invariant(false, 'reconcileNode: parentDOM is null');
    }

    parentDOM.replaceChild(replacementDOM, dom);
    destroyNode(key, null);
    return replacementDOM;
  }

  if ($isElementNode(prevNode) && $isElementNode(nextNode)) {
    const nextIndent = nextNode.__indent;

    if (treatAllNodesAsDirty || nextIndent !== prevNode.__indent) {
      setElementIndent(dom, nextIndent);
    }

    const nextFormat = nextNode.__format;

    if (treatAllNodesAsDirty || nextFormat !== prevNode.__format) {
      setElementFormat(dom, nextFormat);
    }
    if (isDirty) {
      $reconcileChildrenWithDirection(prevNode, nextNode, dom);
      if (!$isRootNode(nextNode) && !nextNode.isInline()) {
        reconcileElementTerminatingLineBreak(prevNode, nextNode, dom);
      }
    }

    if ($textContentRequiresDoubleLinebreakAtEnd(nextNode)) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
      editorTextContent += DOUBLE_LINE_BREAK;
    }

    if (treatAllNodesAsDirty || nextNode.__dir !== prevNode.__dir) {
      $setElementDirection(dom, nextNode);
      if (
        // Root node direction changing from set to unset (or vice versa)
        // changes how children's direction is calculated.
        $isRootNode(nextNode) &&
        // Can skip if all children already reconciled.
        !treatAllNodesAsDirty
      ) {
        for (const child of nextNode.getChildren()) {
          if ($isElementNode(child)) {
            const childDom = getElementByKeyOrThrow(
              activeEditor,
              child.getKey(),
            );
            $setElementDirection(childDom, child);
          }
        }
      }
    }
  } else {
    const text = nextNode.getTextContent();

    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor, activeEditorConfig);

      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    }

    subTreeTextContent += text;
    editorTextContent += text;
  }

  if (
    !activeEditorStateReadOnly &&
    $isRootNode(nextNode) &&
    nextNode.__cachedText !== editorTextContent
  ) {
    // Cache the latest text content.
    const nextRootNode = nextNode.getWritable();
    nextRootNode.__cachedText = editorTextContent;
    nextNode = nextRootNode;
  }

  if (__DEV__) {
    // Freeze the node in DEV to prevent accidental mutations
    Object.freeze(nextNode);
  }

  return dom;
}

function reconcileDecorator(key: NodeKey, decorator: unknown): void {
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

function getNextSibling(element: HTMLElement): Node | null {
  let nextSibling = element.nextSibling;
  if (
    nextSibling !== null &&
    nextSibling === activeEditor._blockCursorElement
  ) {
    nextSibling = nextSibling.nextSibling;
  }
  return nextSibling;
}

function $reconcileNodeChildren(
  nextElement: ElementNode,
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  slot: ElementDOMSlot,
): void {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevChildrenSet: Set<NodeKey> | undefined;
  let nextChildrenSet: Set<NodeKey> | undefined;
  let siblingDOM: null | Node = slot.getFirstChild();
  let prevIndex = 0;
  let nextIndex = 0;

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex];
    const nextKey = nextChildren[nextIndex];

    if (prevKey === nextKey) {
      siblingDOM = getNextSibling($reconcileNode(nextKey, slot.element));
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
        destroyNode(prevKey, slot.element);
        prevIndex++;
      } else if (!prevHasNextKey) {
        // Create next
        $createNode(nextKey, slot.withBefore(siblingDOM));
        nextIndex++;
      } else {
        // Move next
        const childDOM = getElementByKeyOrThrow(activeEditor, nextKey);

        if (childDOM === siblingDOM) {
          siblingDOM = getNextSibling($reconcileNode(nextKey, slot.element));
        } else {
          slot.withBefore(siblingDOM).insertChild(childDOM);
          $reconcileNode(nextKey, slot.element);
        }

        prevIndex++;
        nextIndex++;
      }
    }

    const node = activeNextNodeMap.get(nextKey);
    if (node !== null && $isTextNode(node)) {
      if (subTreeTextFormat === null) {
        subTreeTextFormat = node.getFormat();
      }
      if (subTreeTextStyle === '') {
        subTreeTextStyle = node.getStyle();
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
    $createChildren(
      nextChildren,
      nextElement,
      nextIndex,
      nextEndIndex,
      slot.withBefore(insertDOM),
    );
  } else if (removeOldChildren && !appendNewChildren) {
    destroyChildren(prevChildren, prevIndex, prevEndIndex, slot.element);
  }
}

export function $reconcileRoot(
  prevEditorState: EditorState,
  nextEditorState: EditorState,
  editor: LexicalEditor,
  dirtyType: 0 | 1 | 2,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
): MutatedNodes {
  // We cache text content to make retrieval more efficient.
  // The cache must be rebuilt during reconciliation to account for any changes.
  subTreeTextContent = '';
  editorTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
  activeEditor = editor;
  activeEditorConfig = editor._config;
  activeEditorNodes = editor._nodes;
  activeMutationListeners = activeEditor._listeners.mutation;
  activeDirtyElements = dirtyElements;
  activeDirtyLeaves = dirtyLeaves;
  activePrevNodeMap = prevEditorState._nodeMap;
  activeNextNodeMap = nextEditorState._nodeMap;
  activeEditorStateReadOnly = nextEditorState._readOnly;
  activePrevKeyToDOMMap = new Map(editor._keyToDOMMap);
  // We keep track of mutated nodes so we can trigger mutation
  // listeners later in the update cycle.
  const currentMutatedNodes = new Map();
  mutatedNodes = currentMutatedNodes;
  $reconcileNode('root', null);
  // We don't want a bunch of void checks throughout the scope
  // so instead we make it seem that these values are always set.
  // We also want to make sure we clear them down, otherwise we
  // can leak memory.
  // @ts-ignore
  activeEditor = undefined;
  // @ts-ignore
  activeEditorNodes = undefined;
  // @ts-ignore
  activeDirtyElements = undefined;
  // @ts-ignore
  activeDirtyLeaves = undefined;
  // @ts-ignore
  activePrevNodeMap = undefined;
  // @ts-ignore
  activeNextNodeMap = undefined;
  // @ts-ignore
  activeEditorConfig = undefined;
  // @ts-ignore
  activePrevKeyToDOMMap = undefined;
  // @ts-ignore
  mutatedNodes = undefined;

  return currentMutatedNodes;
}

export function storeDOMWithKey(
  key: NodeKey,
  dom: HTMLElement,
  editor: LexicalEditor,
): void {
  const keyToDOMMap = editor._keyToDOMMap;
  setNodeKeyOnDOMNode(dom, editor, key);
  keyToDOMMap.set(key, dom);
}

function getPrevElementByKeyOrThrow(key: NodeKey): HTMLElement {
  const element = activePrevKeyToDOMMap.get(key);

  if (element === undefined) {
    invariant(
      false,
      'Reconciliation: could not find DOM element for node key %s',
      key,
    );
  }

  return element;
}
