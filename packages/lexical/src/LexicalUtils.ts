/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CommandPayloadType,
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
  Klass,
  LexicalCommand,
  MutatedNodes,
  MutationListeners,
  NodeMutation,
  RegisteredNode,
  RegisteredNodes,
} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
import type {
  GridSelection,
  NodeSelection,
  PointType,
  RangeSelection,
} from './LexicalSelection';
import type {RootNode} from './nodes/LexicalRootNode';
import type {TextFormatType, TextNode} from './nodes/LexicalTextNode';

import {IS_APPLE, IS_IOS, IS_SAFARI} from 'shared/environment';
import getDOMSelection from 'shared/getDOMSelection';
import invariant from 'shared/invariant';

import {
  $createTextNode,
  $getPreviousSelection,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  DecoratorNode,
  ElementNode,
  LineBreakNode,
} from '.';
import {
  COMPOSITION_SUFFIX,
  DOM_TEXT_TYPE,
  HAS_DIRTY_NODES,
  LTR_REGEX,
  RTL_REGEX,
  TEXT_TYPE_TO_FORMAT,
} from './LexicalConstants';
import {LexicalEditor} from './LexicalEditor';
import {flushRootMutations} from './LexicalMutations';
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
  triggerCommandListeners,
  updateEditor,
} from './LexicalUpdates';

export const emptyFunction = () => {
  return;
};

let keyCounter = 1;

export function resetRandomKey(): void {
  keyCounter = 1;
}

export function generateRandomKey(): string {
  return '' + keyCounter++;
}

export function getRegisteredNodeOrThrow(
  editor: LexicalEditor,
  nodeType: string,
): RegisteredNode {
  const registeredNode = editor._nodes.get(nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'registeredNode: Type %s not found', nodeType);
  }
  return registeredNode;
}

export const isArray = Array.isArray;

export const scheduleMicroTask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => {
        // No window prefix intended (#1400)
        Promise.resolve().then(fn);
      };

export function $isSelectionCapturedInDecorator(node: Node): boolean {
  return $isDecoratorNode($getNearestNodeFromDOMNode(node));
}

// TODO change to $ function
export function isSelectionCapturedInDecoratorInput(anchorDOM: Node): boolean {
  const activeElement = document.activeElement;
  const nodeName = activeElement !== null ? activeElement.nodeName : null;
  return (
    !$isDecoratorNode($getNearestNodeFromDOMNode(anchorDOM)) ||
    (nodeName !== 'INPUT' && nodeName !== 'TEXTAREA')
  );
}

export function isSelectionWithinEditor(
  editor: LexicalEditor,
  anchorDOM: null | Node,
  focusDOM: null | Node,
): boolean {
  const rootElement = editor.getRootElement();
  try {
    return (
      rootElement !== null &&
      rootElement.contains(anchorDOM) &&
      rootElement.contains(focusDOM) &&
      // Ignore if selection is within nested editor
      anchorDOM !== null &&
      isSelectionCapturedInDecoratorInput(anchorDOM as Node) &&
      getNearestEditorFromDOMNode(anchorDOM) === editor
    );
  } catch (error) {
    return false;
  }
}

export function getNearestEditorFromDOMNode(
  node: Node | null,
): LexicalEditor | null {
  let currentNode = node;
  while (currentNode != null) {
    // @ts-expect-error: internal field
    const editor: LexicalEditor = currentNode.__lexicalEditor;
    if (editor != null) {
      return editor;
    }
    currentNode = currentNode.parentNode;
  }
  return null;
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

export function $isTokenOrSegmented(node: TextNode): boolean {
  return node.isToken() || node.isSegmented();
}

function isDOMNodeLexicalTextNode(node: Node): node is Text {
  return node.nodeType === DOM_TEXT_TYPE;
}

export function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node != null) {
    if (isDOMNodeLexicalTextNode(node)) {
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

export function $isLeafNode(
  node: LexicalNode | null | undefined,
): node is TextNode | LineBreakNode | DecoratorNode<unknown> {
  return $isTextNode(node) || $isLineBreakNode(node) || $isDecoratorNode(node);
}

export function $setNodeKey(
  node: LexicalNode,
  existingKey: NodeKey | null | undefined,
): void {
  if (existingKey != null) {
    node.__key = existingKey;
    return;
  }
  errorOnReadOnly();
  errorOnInfiniteTransforms();
  const editor = getActiveEditor();
  const editorState = getActiveEditorState();
  const key = generateRandomKey();
  editorState._nodeMap.set(key, node);
  // TODO Split this function into leaf/element
  if ($isElementNode(node)) {
    editor._dirtyElements.set(key, true);
  } else {
    editor._dirtyLeaves.add(key);
  }
  editor._cloneNotNeeded.add(key);
  editor._dirtyType = HAS_DIRTY_NODES;
  node.__key = key;
}

function internalMarkParentElementsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let nextParentKey: string | null = parentKey;
  while (nextParentKey !== null) {
    if (dirtyElements.has(nextParentKey)) {
      return;
    }
    const node = nodeMap.get(nextParentKey);
    if (node === undefined) {
      break;
    }
    dirtyElements.set(nextParentKey, false);
    nextParentKey = node.__parent;
  }
}

export function removeFromParent(writableNode: LexicalNode): void {
  const oldParent = writableNode.getParent();
  if (oldParent !== null) {
    const writableParent = oldParent.getWritable();
    const children = writableParent.__children;
    const index = children.indexOf(writableNode.__key);
    if (index === -1) {
      invariant(false, 'Node is not a child of its parent');
    }
    internalMarkSiblingsAsDirty(writableNode);
    children.splice(index, 1);
  }
}

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function internalMarkNodeAsDirty(node: LexicalNode): void {
  errorOnInfiniteTransforms();
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    internalMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
  }
  const key = latest.__key;
  editor._dirtyType = HAS_DIRTY_NODES;
  if ($isElementNode(node)) {
    dirtyElements.set(key, true);
  } else {
    // TODO split internally MarkNodeAsDirty into two dedicated Element/leave functions
    editor._dirtyLeaves.add(key);
  }
}

export function internalMarkSiblingsAsDirty(node: LexicalNode) {
  const previousNode = node.getPreviousSibling();
  const nextNode = node.getNextSibling();
  if (previousNode !== null) {
    internalMarkNodeAsDirty(previousNode);
  }
  if (nextNode !== null) {
    internalMarkNodeAsDirty(nextNode);
  }
}

export function $setCompositionKey(compositionKey: null | NodeKey): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
  if (compositionKey !== previousCompositionKey) {
    editor._compositionKey = compositionKey;
    if (previousCompositionKey !== null) {
      const node = $getNodeByKey(previousCompositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
    if (compositionKey !== null) {
      const node = $getNodeByKey(compositionKey);
      if (node !== null) {
        node.getWritable();
      }
    }
  }
}

export function $getCompositionKey(): null | NodeKey {
  if (isCurrentlyReadOnlyMode()) {
    return null;
  }
  const editor = getActiveEditor();
  return editor._compositionKey;
}

export function $getNodeByKey<T extends LexicalNode>(
  key: NodeKey,
  _editorState?: EditorState,
): T | null {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key) as T;
  if (node === undefined) {
    return null;
  }
  return node;
}

export function getNodeFromDOMNode(
  dom: Node,
  editorState?: EditorState,
): LexicalNode | null {
  const editor = getActiveEditor();
  // @ts-ignore We intentionally add this to the Node.
  const key = dom[`__lexicalKey_${editor._key}`];
  if (key !== undefined) {
    return $getNodeByKey(key, editorState);
  }
  return null;
}

export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
  editorState?: EditorState,
): LexicalNode | null {
  let dom: Node | null = startingDOM;
  while (dom != null) {
    const node = getNodeFromDOMNode(dom, editorState);
    if (node !== null) {
      return node;
    }
    dom = dom.parentNode;
  }
  return null;
}

export function cloneDecorators(
  editor: LexicalEditor,
): Record<NodeKey, unknown> {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}

export function getEditorStateTextContent(editorState: EditorState): string {
  return editorState.read(() => $getRoot().getTextContent());
}

export function markAllNodesAsDirty(editor: LexicalEditor, type: string): void {
  // Mark all existing text nodes as dirty
  updateEditor(
    editor,
    () => {
      const editorState = getActiveEditorState();
      if (editorState.isEmpty()) {
        return;
      }
      if (type === 'root') {
        $getRoot().markDirty();
        return;
      }
      const nodeMap = editorState._nodeMap;
      for (const [, node] of nodeMap) {
        node.markDirty();
      }
    },
    editor._pendingEditorState === null
      ? {
          tag: 'history-merge',
        }
      : undefined,
  );
}

export function $getRoot(): RootNode {
  return internalGetRoot(getActiveEditorState());
}

export function internalGetRoot(editorState: EditorState): RootNode {
  return editorState._nodeMap.get('root') as RootNode;
}

export function $setSelection(
  selection: null | RangeSelection | NodeSelection | GridSelection,
): void {
  const editorState = getActiveEditorState();
  if (selection !== null) {
    if (__DEV__) {
      if (Object.isFrozen(selection)) {
        invariant(
          false,
          '$setSelection called on frozen selection object. Ensure selection is cloned before passing in.',
        );
      }
    }
    selection.dirty = true;
    selection._cachedNodes = null;
  }
  editorState._selection = selection;
}

export function $flushMutations(): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  flushRootMutations(editor);
}

export function getNodeFromDOM(dom: Node): null | LexicalNode {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOM(dom, editor);
  if (nodeKey === null) {
    const rootElement = editor.getRootElement();
    if (dom === rootElement) {
      return $getNodeByKey('root');
    }
    return null;
  }
  return $getNodeByKey(nodeKey);
}

export function getTextNodeOffset(
  node: TextNode,
  moveSelectionToEnd: boolean,
): number {
  return moveSelectionToEnd ? node.getTextContentSize() : 0;
}

function getNodeKeyFromDOM(
  // Note that node here refers to a DOM Node, not an Lexical Node
  dom: Node,
  editor: LexicalEditor,
): NodeKey | null {
  let node: Node | null = dom;
  while (node != null) {
    // @ts-ignore We intentionally add this to the Node.
    const key: NodeKey = node[`__lexicalKey_${editor._key}`];
    if (key !== undefined) {
      return key;
    }
    node = node.parentNode;
  }
  return null;
}

export function doesContainGrapheme(str: string): boolean {
  return /[\uD800-\uDBFF][\uDC00-\uDFFF]/g.test(str);
}

export function getEditorsToPropagate(
  editor: LexicalEditor,
): Array<LexicalEditor> {
  const editorsToPropagate = [];
  let currentEditor: LexicalEditor | null = editor;
  while (currentEditor !== null) {
    editorsToPropagate.push(currentEditor);
    currentEditor = currentEditor._parentEditor;
  }
  return editorsToPropagate;
}

export function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

export function $updateSelectedTextFromDOM(
  isCompositionEnd: boolean,
  data?: string,
): void {
  // Update the text content with the latest composition text
  const domSelection = getDOMSelection();
  if (domSelection === null) {
    return;
  }
  const anchorNode = domSelection.anchorNode;
  let {anchorOffset, focusOffset} = domSelection;
  if (anchorNode !== null && anchorNode.nodeType === DOM_TEXT_TYPE) {
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if ($isTextNode(node)) {
      let textContent = anchorNode.nodeValue;

      // Data is intentionally truthy, as we check for boolean, null and empty string.
      if (textContent === COMPOSITION_SUFFIX && data) {
        const offset = data.length;
        textContent = data;
        anchorOffset = offset;
        focusOffset = offset;
      }

      if (textContent !== null) {
        $updateTextNodeFromDOMContent(
          node,
          textContent,
          anchorOffset,
          focusOffset,
          isCompositionEnd,
        );
      }
    }
  }
}

export function $updateTextNodeFromDOMContent(
  textNode: TextNode,
  textContent: string,
  anchorOffset: null | number,
  focusOffset: null | number,
  compositionEnd: boolean,
): void {
  let node = textNode;

  if (node.isAttached() && (compositionEnd || !node.isDirty())) {
    const isComposing = node.isComposing();
    let normalizedTextContent = textContent;

    if (
      (isComposing || compositionEnd) &&
      textContent[textContent.length - 1] === COMPOSITION_SUFFIX
    ) {
      normalizedTextContent = textContent.slice(0, -1);
    }
    const prevTextContent = node.getTextContent();

    if (compositionEnd || normalizedTextContent !== prevTextContent) {
      if (normalizedTextContent === '') {
        $setCompositionKey(null);
        if (!IS_SAFARI && !IS_IOS) {
          // For composition (mainly Android), we have to remove the node on a later update
          const editor = getActiveEditor();
          setTimeout(() => {
            editor.update(() => {
              if (node.isAttached()) {
                node.remove();
              }
            });
          }, 20);
        } else {
          node.remove();
        }
        return;
      }
      const parent = node.getParent();
      const prevSelection = $getPreviousSelection();

      if (
        node.isToken() ||
        ($getCompositionKey() !== null && !isComposing) ||
        // Check if character was added at the start, and we need
        // to clear this input from occurring as that action wasn't
        // permitted.
        (parent !== null &&
          $isRangeSelection(prevSelection) &&
          !parent.canInsertTextBefore() &&
          prevSelection.anchor.offset === 0)
      ) {
        node.markDirty();
        return;
      }
      const selection = $getSelection();

      if (
        !$isRangeSelection(selection) ||
        anchorOffset === null ||
        focusOffset === null
      ) {
        node.setTextContent(normalizedTextContent);
        return;
      }
      selection.setTextNodeRange(node, anchorOffset, node, focusOffset);

      if (node.isSegmented()) {
        const originalTextContent = node.getTextContent();
        const replacement = $createTextNode(originalTextContent);
        node.replace(replacement);
        node = replacement;
      }
      node.setTextContent(normalizedTextContent);
    }
  }
}

function $previousSiblingDoesNotAcceptText(node: TextNode): boolean {
  const previousSibling = node.getPreviousSibling();

  return (
    ($isTextNode(previousSibling) ||
      ($isElementNode(previousSibling) && previousSibling.isInline())) &&
    !previousSibling.canInsertTextAfter()
  );
}

// This function is connected to $shouldPreventDefaultAndInsertText and determines whether the
// TextNode boundaries are writable or we should use the previous/next sibling instead. For example,
// in the case of a LinkNode, boundaries are not writable.
function $shouldInsertTextAfterOrBeforeTextNode(
  selection: RangeSelection,
  node: TextNode,
): boolean {
  if (node.isSegmented()) {
    return true;
  }
  if (!selection.isCollapsed()) {
    return false;
  }
  const offset = selection.anchor.offset;
  const parent = node.getParentOrThrow();
  const isToken = node.isToken();
  if (offset === 0) {
    return (
      !node.canInsertTextBefore() ||
      !parent.canInsertTextBefore() ||
      isToken ||
      $previousSiblingDoesNotAcceptText(node)
    );
  } else if (offset === node.getTextContentSize()) {
    return (
      !node.canInsertTextAfter() || !parent.canInsertTextAfter() || isToken
    );
  } else {
    return false;
  }
}

// This function is used to determine if Lexical should attempt to override
// the default browser behavior for insertion of text and use its own internal
// heuristics. This is an extremely important function, and makes much of Lexical
// work as intended between different browsers and across word, line and character
// boundary/formats. It also is important for text replacement, node schemas and
// composition mechanics.
export function $shouldPreventDefaultAndInsertText(
  selection: RangeSelection,
  text: string,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const domSelection = getDOMSelection();
  const domAnchorNode = domSelection !== null ? domSelection.anchorNode : null;
  const anchorKey = anchor.key;
  const backingAnchorElement = getActiveEditor().getElementByKey(anchorKey);
  const textLength = text.length;

  return (
    anchorKey !== focus.key ||
    // If we're working with a non-text node.
    !$isTextNode(anchorNode) ||
    // If we are replacing a range with a single character or grapheme, and not composing.
    ((textLength < 2 || doesContainGrapheme(text)) &&
      anchor.offset !== focus.offset &&
      !anchorNode.isComposing()) ||
    // Any non standard text node.
    $isTokenOrSegmented(anchorNode) ||
    // If the text length is more than a single character and we're either
    // dealing with this in "beforeinput" or where the node has already recently
    // been changed (thus is dirty).
    (anchorNode.isDirty() && textLength > 1) ||
    // If the DOM selection element is not the same as the backing node
    (backingAnchorElement !== null &&
      !anchorNode.isComposing() &&
      domAnchorNode !== getDOMTextNode(backingAnchorElement)) ||
    // Check if we're changing from bold to italics, or some other format.
    anchorNode.getFormat() !== selection.format ||
    // One last set of heuristics to check against.
    $shouldInsertTextAfterOrBeforeTextNode(selection, anchorNode)
  );
}

export function isTab(
  keyCode: number,
  altKey: boolean,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return keyCode === 9 && !altKey && !ctrlKey && !metaKey;
}

export function isBold(
  keyCode: number,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 66 && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isItalic(
  keyCode: number,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 73 && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isUnderline(
  keyCode: number,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 85 && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isParagraph(keyCode: number, shiftKey: boolean): boolean {
  return isReturn(keyCode) && !shiftKey;
}

export function isLineBreak(keyCode: number, shiftKey: boolean): boolean {
  return isReturn(keyCode) && shiftKey;
}

// Inserts a new line after the selection

export function isOpenLineBreak(keyCode: number, ctrlKey: boolean): boolean {
  // 79 = KeyO
  return IS_APPLE && ctrlKey && keyCode === 79;
}

export function isDeleteWordBackward(
  keyCode: number,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isBackspace(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}

export function isDeleteWordForward(
  keyCode: number,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isDelete(keyCode) && (IS_APPLE ? altKey : ctrlKey);
}

export function isDeleteLineBackward(
  keyCode: number,
  metaKey: boolean,
): boolean {
  return IS_APPLE && metaKey && isBackspace(keyCode);
}

export function isDeleteLineForward(
  keyCode: number,
  metaKey: boolean,
): boolean {
  return IS_APPLE && metaKey && isDelete(keyCode);
}

export function isDeleteBackward(
  keyCode: number,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(keyCode) || (keyCode === 72 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(keyCode);
}

export function isDeleteForward(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(keyCode) || (keyCode === 68 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(keyCode);
}

export function isUndo(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 90 && !shiftKey && controlOrMeta(metaKey, ctrlKey);
}

export function isRedo(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    return keyCode === 90 && metaKey && shiftKey;
  }
  return (keyCode === 89 && ctrlKey) || (keyCode === 90 && ctrlKey && shiftKey);
}

export function isCopy(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (shiftKey) {
    return false;
  }
  if (keyCode === 67) {
    return IS_APPLE ? metaKey : ctrlKey;
  }

  return false;
}

export function isCut(
  keyCode: number,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (shiftKey) {
    return false;
  }
  if (keyCode === 88) {
    return IS_APPLE ? metaKey : ctrlKey;
  }

  return false;
}

function isArrowLeft(keyCode: number): boolean {
  return keyCode === 37;
}

function isArrowRight(keyCode: number): boolean {
  return keyCode === 39;
}

function isArrowUp(keyCode: number): boolean {
  return keyCode === 38;
}

function isArrowDown(keyCode: number): boolean {
  return keyCode === 40;
}

export function isMoveBackward(
  keyCode: number,
  ctrlKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(keyCode) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveToStart(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(keyCode) && !altKey && !shiftKey && (ctrlKey || metaKey);
}

export function isMoveForward(
  keyCode: number,
  ctrlKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(keyCode) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveToEnd(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(keyCode) && !altKey && !shiftKey && (ctrlKey || metaKey);
}

export function isMoveUp(
  keyCode: number,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowUp(keyCode) && !ctrlKey && !metaKey;
}

export function isMoveDown(
  keyCode: number,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowDown(keyCode) && !ctrlKey && !metaKey;
}

export function isModifier(
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return ctrlKey || shiftKey || altKey || metaKey;
}

export function isSpace(keyCode: number): boolean {
  return keyCode === 32;
}

export function controlOrMeta(metaKey: boolean, ctrlKey: boolean): boolean {
  if (IS_APPLE) {
    return metaKey;
  }
  return ctrlKey;
}

export function isReturn(keyCode: number): boolean {
  return keyCode === 13;
}

export function isBackspace(keyCode: number): boolean {
  return keyCode === 8;
}

export function isEscape(keyCode: number): boolean {
  return keyCode === 27;
}

export function isDelete(keyCode: number): boolean {
  return keyCode === 46;
}

export function getCachedClassNameArray(
  classNamesTheme: EditorThemeClasses,
  classNameThemeType: string,
): Array<string> {
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = classNames.split(' ');
    classNamesTheme[classNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}

export function setMutatedNode(
  mutatedNodes: MutatedNodes,
  registeredNodes: RegisteredNodes,
  mutationListeners: MutationListeners,
  node: LexicalNode,
  mutation: NodeMutation,
) {
  if (mutationListeners.size === 0) {
    return;
  }
  const nodeType = node.__type;
  const nodeKey = node.__key;
  const registeredNode = registeredNodes.get(nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'Type %s not in registeredNodes', nodeType);
  }
  const klass = registeredNode.klass;
  let mutatedNodesByType = mutatedNodes.get(klass);
  if (mutatedNodesByType === undefined) {
    mutatedNodesByType = new Map();
    mutatedNodes.set(klass, mutatedNodesByType);
  }
  if (!mutatedNodesByType.has(nodeKey)) {
    mutatedNodesByType.set(nodeKey, mutation);
  }
}

export function $nodesOfType<T extends LexicalNode>(klass: Klass<T>): Array<T> {
  const editorState = getActiveEditorState();
  const readOnly = editorState._readOnly;
  const klassType = klass.getType();
  const nodes = editorState._nodeMap;
  const nodesOfType: Array<T> = [];
  for (const [, node] of nodes) {
    if (
      node instanceof klass &&
      node.__type === klassType &&
      (readOnly || node.isAttached())
    ) {
      nodesOfType.push(node as T);
    }
  }
  return nodesOfType;
}

function resolveElement(
  element: ElementNode,
  isBackward: boolean,
  focusOffset: number,
): LexicalNode | null {
  const parent = element.getParent();
  let offset = focusOffset;
  let block = element;
  if (parent !== null) {
    if (isBackward && focusOffset === 0) {
      offset = block.getIndexWithinParent();
      block = parent;
    } else if (!isBackward && focusOffset === block.getChildrenSize()) {
      offset = block.getIndexWithinParent() + 1;
      block = parent;
    }
  }
  return block.getChildAtIndex(isBackward ? offset - 1 : offset);
}

export function $getDecoratorNode(
  focus: PointType,
  isBackward: boolean,
): null | LexicalNode {
  const focusOffset = focus.offset;
  if (focus.type === 'element') {
    const block = focus.getNode();
    return resolveElement(block, isBackward, focusOffset);
  } else {
    const focusNode = focus.getNode();
    if (
      (isBackward && focusOffset === 0) ||
      (!isBackward && focusOffset === focusNode.getTextContentSize())
    ) {
      const possibleNode = isBackward
        ? focusNode.getPreviousSibling()
        : focusNode.getNextSibling();
      if (possibleNode === null) {
        return resolveElement(
          focusNode.getParentOrThrow(),
          isBackward,
          focusNode.getIndexWithinParent() + (isBackward ? 0 : 1),
        );
      }
      return possibleNode;
    }
  }
  return null;
}

export function isFirefoxClipboardEvents(editor: LexicalEditor): boolean {
  const event = getWindow(editor).event;
  const inputType = event && (event as InputEvent).inputType;
  return (
    inputType === 'insertFromPaste' ||
    inputType === 'insertFromPasteAsQuotation'
  );
}

export function dispatchCommand<TCommand extends LexicalCommand<unknown>>(
  editor: LexicalEditor,
  command: TCommand,
  payload: CommandPayloadType<TCommand>,
): boolean {
  return triggerCommandListeners(editor, command, payload);
}

export function $textContentRequiresDoubleLinebreakAtEnd(
  node: ElementNode,
): boolean {
  return !$isRootNode(node) && !node.isLastChild() && !node.isInline();
}

export function getElementByKeyOrThrow(
  editor: LexicalEditor,
  key: NodeKey,
): HTMLElement {
  const element = editor._keyToDOMMap.get(key);

  if (element === undefined) {
    invariant(
      false,
      'Reconciliation: could not find DOM element for node key %s',
      key,
    );
  }

  return element;
}

export function scrollIntoViewIfNeeded(
  editor: LexicalEditor,
  anchor: PointType,
  rootElement: HTMLElement,
  tags: Set<string>,
): void {
  let anchorNode: LexicalNode = anchor.getNode();
  if ($isElementNode(anchorNode)) {
    const descendantNode = anchorNode.getDescendantByIndex(anchor.offset);
    if (descendantNode !== null) {
      anchorNode = descendantNode;
    }
  }
  const element = editor.getElementByKey(anchorNode.__key) as Element;

  if (element !== null) {
    const rect = element.getBoundingClientRect();

    if (rect.bottom > getWindow(editor).innerHeight) {
      element.scrollIntoView(false);
    } else if (rect.top < 0) {
      element.scrollIntoView();
    } else {
      const rootRect = rootElement.getBoundingClientRect();

      // Rects can returning decimal numbers that differ due to rounding
      // differences. So let's normalize the values.
      if (Math.floor(rect.bottom) > Math.floor(rootRect.bottom)) {
        element.scrollIntoView(false);
      } else if (Math.floor(rect.top) < Math.floor(rootRect.top)) {
        element.scrollIntoView();
      }
    }

    tags.add('scroll-into-view');
  }
}

export function $hasUpdateTag(tag: string): boolean {
  const editor = getActiveEditor();
  return editor._updateTags.has(tag);
}

export function $addUpdateTag(tag: string): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  editor._updateTags.add(tag);
}

export function $maybeMoveChildrenSelectionToParent(
  parentNode: LexicalNode,
  offset = 0,
): RangeSelection | NodeSelection | GridSelection | null {
  if (offset !== 0) {
    invariant(false, 'TODO');
  }
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !$isElementNode(parentNode)) {
    return selection;
  }
  const {anchor, focus} = selection;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if ($hasAncestor(anchorNode, parentNode)) {
    anchor.set(parentNode.__key, 0, 'element');
  }
  if ($hasAncestor(focusNode, parentNode)) {
    focus.set(parentNode.__key, 0, 'element');
  }
  return selection;
}

export function $hasAncestor(
  child: LexicalNode,
  targetNode: LexicalNode,
): boolean {
  let parent = child.getParent();
  while (parent !== null) {
    if (parent.is(targetNode)) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}

export function getDefaultView(domElem: HTMLElement): Window | null {
  const ownerDoc = domElem.ownerDocument;
  return (ownerDoc && ownerDoc.defaultView) || null;
}

export function getWindow(editor: LexicalEditor): Window {
  const windowObj = editor._window;
  if (windowObj === null) {
    invariant(false, 'window object not found');
  }
  return windowObj;
}

export function $isInlineElementOrDecoratorNode(node: LexicalNode): boolean {
  return (
    ($isElementNode(node) && node.isInline()) ||
    ($isDecoratorNode(node) && node.isInline())
  );
}

export function $getNearestRootOrShadowRoot(
  node: LexicalNode,
): RootNode | ElementNode {
  let parent = node.getParentOrThrow();
  while (parent !== null) {
    if ($isRootOrShadowRoot(parent)) {
      return parent;
    }
    parent = parent.getParentOrThrow();
  }
  return parent;
}

export function $isRootOrShadowRoot(node: null | LexicalNode): boolean {
  return $isRootNode(node) || ($isElementNode(node) && node.isShadowRoot());
}
