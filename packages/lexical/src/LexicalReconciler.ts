/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
  MutatedNodes,
  MutationListeners,
  RegisteredNodes,
} from './LexicalEditor';
import type {NodeKey, NodeMap} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';

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
  IS_ALIGN_JUSTIFY,
  IS_ALIGN_LEFT,
  IS_ALIGN_RIGHT,
} from './LexicalConstants';
import {EditorState} from './LexicalEditorState';
import {
  $textContentRequiresDoubleLinebreakAtEnd,
  cloneDecorators,
  getElementByKeyOrThrow,
  getTextDirection,
  setMutatedNode,
} from './LexicalUtils';

let subTreeTextContent = '';
let subTreeDirectionedTextContent = '';
let editorTextContent = '';
let activeEditorConfig: EditorConfig;
let activeEditor: LexicalEditor;
let activeEditorNodes: RegisteredNodes;
let treatAllNodesAsDirty = false;
let activeEditorStateReadOnly = false;
let activeMutationListeners: MutationListeners;
let activeTextDirection: 'ltr' | 'rtl' | null = null;
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

function setElementIndent(dom: HTMLElement, indent: number): void {
  dom.style.setProperty(
    'padding-inline-start',
    indent === 0 ? '' : indent * 20 + 'px',
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
    } else if ($isTextNode(node)) {
      if (!node.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }
    }

    subTreeTextContent += text;
    editorTextContent += text;
  }

  if (parentDOM !== null) {
    if (insertDOM != null) {
      parentDOM.insertBefore(dom, insertDOM);
    } else {
      // @ts-expect-error: internal field
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

  setMutatedNode(
    mutatedNodes,
    activeEditorNodes,
    activeMutationListeners,
    node,
    'created',
  );
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

  // @ts-expect-error: internal field
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

// If we end an element with a LineBreakNode, then we need to add an additional <br>
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
      // @ts-expect-error: internal field
      const element = dom.__lexicalLineBreak;

      if (element != null) {
        dom.removeChild(element);
      }

      // @ts-expect-error: internal field
      dom.__lexicalLineBreak = null;
    }
  } else if (nextLineBreak) {
    const element = document.createElement('br');
    // @ts-expect-error: internal field
    dom.__lexicalLineBreak = element;
    dom.appendChild(element);
  }
}

function reconcileBlockDirection(element: ElementNode, dom: HTMLElement): void {
  const previousSubTreeDirectionTextContent: string =
    // @ts-expect-error: internal field
    dom.__lexicalDirTextContent;
  // @ts-expect-error: internal field
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
      let previousDirectionTheme =
        previousDirection !== null ? theme[previousDirection] : undefined;
      let nextDirectionTheme =
        direction !== null ? theme[direction] : undefined;

      // Remove the old theme classes if they exist
      if (previousDirectionTheme !== undefined) {
        if (typeof previousDirectionTheme === 'string') {
          const classNamesArr = previousDirectionTheme.split(' ');
          previousDirectionTheme = theme[previousDirection] = classNamesArr;
        }

        // @ts-ignore: intentional
        classList.remove(...previousDirectionTheme);
      }

      if (
        direction === null ||
        (hasEmptyDirectionedTextContent && direction === 'ltr')
      ) {
        // Remove direction
        dom.removeAttribute('dir');
      } else {
        // Apply the new theme classes if they exist
        if (nextDirectionTheme !== undefined) {
          if (typeof nextDirectionTheme === 'string') {
            const classNamesArr = nextDirectionTheme.split(' ');
            // @ts-expect-error: intentional
            nextDirectionTheme = theme[direction] = classNamesArr;
          }

          if (nextDirectionTheme !== undefined) {
            classList.add(...nextDirectionTheme);
          }
        }

        // Update direction
        dom.dir = direction;
      }

      if (!activeEditorStateReadOnly) {
        const writableNode = element.getWritable();
        writableNode.__dir = direction;
      }
    }

    activeTextDirection = direction;
    // @ts-expect-error: internal field
    dom.__lexicalDirTextContent = subTreeDirectionedTextContent;
    // @ts-expect-error: internal field
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
  reconcileChildren(element, prevChildren, nextChildren, dom);
  reconcileBlockDirection(element, dom);
  subTreeDirectionedTextContent = previousSubTreeDirectionTextContent;
}

function reconcileChildren(
  element: ElementNode,
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
      // @ts-expect-error: internal field
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
      element,
      dom,
    );
  }

  if ($textContentRequiresDoubleLinebreakAtEnd(element)) {
    subTreeTextContent += DOUBLE_LINE_BREAK;
  }

  // @ts-expect-error: internal field
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

  // If the node key points to the same instance in both states
  // and isn't dirty, we just update the text content cache
  // and return the existing DOM Node.
  if (prevNode === nextNode && !isDirty) {
    if ($isElementNode(prevNode)) {
      // @ts-expect-error: internal field
      const previousSubTreeTextContent = dom.__lexicalTextContent;

      if (previousSubTreeTextContent !== undefined) {
        subTreeTextContent += previousSubTreeTextContent;
        editorTextContent += previousSubTreeTextContent;
      }

      // @ts-expect-error: internal field
      const previousSubTreeDirectionTextContent = dom.__lexicalDirTextContent;

      if (previousSubTreeDirectionTextContent !== undefined) {
        subTreeDirectionedTextContent += previousSubTreeDirectionTextContent;
      }
    } else {
      const text = prevNode.getTextContent();

      if ($isTextNode(prevNode) && !prevNode.isDirectionless()) {
        subTreeDirectionedTextContent += text;
      }

      editorTextContent += text;
      subTreeTextContent += text;
    }

    return dom;
  }
  // If the node key doesn't point to the same instance in both maps,
  // it means it were cloned. If they're also dirty, we mark them as mutated.
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

    if ($textContentRequiresDoubleLinebreakAtEnd(nextNode)) {
      subTreeTextContent += DOUBLE_LINE_BREAK;
      editorTextContent += DOUBLE_LINE_BREAK;
    }
  } else {
    const text = nextNode.getTextContent();

    if ($isDecoratorNode(nextNode)) {
      const decorator = nextNode.decorate(activeEditor, activeEditorConfig);

      if (decorator !== null) {
        reconcileDecorator(key, decorator);
      }
    } else if ($isTextNode(nextNode) && !nextNode.isDirectionless()) {
      // Handle text content, for LTR, LTR cases.
      subTreeDirectionedTextContent += text;
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
    nextNode = nextNode.getWritable();
    nextNode.__cachedText = editorTextContent;
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

function getFirstChild(element: HTMLElement): Node | null {
  return element.firstChild;
}

function getNextSibling(element: HTMLElement): Node | null {
  return element.nextSibling;
}

function reconcileNodeChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  element: ElementNode,
  dom: HTMLElement,
): void {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevChildrenSet: Set<NodeKey> | undefined;
  let nextChildrenSet: Set<NodeKey> | undefined;
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

export function reconcileRoot(
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
  subTreeDirectionedTextContent = '';
  // Rather than pass around a load of arguments through the stack recursively
  // we instead set them as bindings within the scope of the module.
  treatAllNodesAsDirty = dirtyType === FULL_RECONCILE;
  activeTextDirection = null;
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
  reconcileNode('root', null);
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
  // @ts-ignore We intentionally add this to the Node.
  dom['__lexicalKey_' + editor._key] = key;
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
