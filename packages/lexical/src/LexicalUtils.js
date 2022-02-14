/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
  RegisteredNode,
} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
import type {RangeSelection} from './LexicalSelection';
import type {RootNode} from './nodes/base/LexicalRootNode';
import type {TextFormatType, TextNode} from './nodes/base/LexicalTextNode';
import type {Node as ReactNode} from 'react';

import {IS_APPLE} from 'shared/environment';
import invariant from 'shared/invariant';

import {
  $createTextNode,
  $getPreviousSelection,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isHorizontalRuleNode,
  $isLineBreakNode,
  $isTextNode,
} from '.';
import {
  DOM_TEXT_TYPE,
  HAS_DIRTY_NODES,
  LTR_REGEX,
  NO_BREAK_SPACE_CHAR,
  RTL_REGEX,
  TEXT_TYPE_TO_FORMAT,
} from './LexicalConstants';
import {flushRootMutations} from './LexicalMutations';
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  updateEditor,
} from './LexicalUpdates';

export const emptyFunction = () => {};

let keyCounter = 0;

export function resetRandomKey(): void {
  keyCounter = 0;
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

const NativePromise = window.Promise;

export const scheduleMicroTask: (fn: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn) => NativePromise.resolve().then(fn);

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
      // If selection is inside a decorator, then we treat it as
      // if the focus is not in Lexical.
      anchorDOM != null &&
      !$isDecoratorNode($getNearestNodeFromDOMNode(anchorDOM))
    );
  } catch (error) {
    return false;
  }
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

export function $isTokenOrInertOrSegmented(node: TextNode): boolean {
  return $isTokenOrInert(node) || node.isSegmented();
}

export function $isTokenOrInert(node: TextNode): boolean {
  return node.isToken() || node.isInert();
}

export function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node != null) {
    if (node.nodeType === DOM_TEXT_TYPE) {
      // $FlowFixMe: this is a Text
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

export function $isLeafNode(node: ?LexicalNode): boolean %checks {
  return (
    $isTextNode(node) ||
    $isLineBreakNode(node) ||
    $isDecoratorNode(node) ||
    $isHorizontalRuleNode(node)
  );
}

export function $generateKey(node: LexicalNode): NodeKey {
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
  return key;
}

function $internallyMarkParentElementsAsDirty(
  parentKey: NodeKey,
  nodeMap: NodeMap,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  let nextParentKey = parentKey;
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

// Never use this function directly! It will break
// the cloning heuristic. Instead use node.getWritable().
export function $internallyMarkNodeAsDirty(node: LexicalNode): void {
  errorOnInfiniteTransforms();
  const latest = node.getLatest();
  const parent = latest.__parent;
  const editorState = getActiveEditorState();
  const editor = getActiveEditor();
  const nodeMap = editorState._nodeMap;
  const dirtyElements = editor._dirtyElements;
  if (parent !== null) {
    $internallyMarkParentElementsAsDirty(parent, nodeMap, dirtyElements);
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

export function $internallyMarkSiblingsAsDirty(node: LexicalNode) {
  const previousNode = node.getPreviousSibling();
  const nextNode = node.getNextSibling();
  if (previousNode !== null) {
    $internallyMarkNodeAsDirty(previousNode);
  }
  if (nextNode !== null) {
    $internallyMarkNodeAsDirty(nextNode);
  }
}

export function $setCompositionKey(compositionKey: null | NodeKey): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  const previousCompositionKey = editor._compositionKey;
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

export function $getCompositionKey(): null | NodeKey {
  const editor = getActiveEditor();
  return editor._compositionKey;
}

export function $getNodeByKey<N: LexicalNode>(
  key: NodeKey,
  _editorState?: EditorState,
): N | null {
  const editorState = _editorState || getActiveEditorState();
  const node = editorState._nodeMap.get(key);
  if (node === undefined) {
    return null;
  }
  return (node: $FlowFixMe);
}

export function getNodeFromDOMNode(
  dom: Node,
  editorState?: EditorState,
): LexicalNode | null {
  const editor = getActiveEditor();
  // $FlowFixMe: internal field
  const key: NodeKey | undefined = dom['__lexicalKey_' + editor._key];
  if (key !== undefined) {
    return $getNodeByKey(key, editorState);
  }
  return null;
}

export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
  editorState?: EditorState,
): LexicalNode | null {
  let dom = startingDOM;
  while (dom != null) {
    const node = getNodeFromDOMNode(dom, editorState);
    if (node !== null) {
      return node;
    }
    dom = dom.parentNode;
  }
  return null;
}

export function cloneDecorators(editor: LexicalEditor): {[NodeKey]: ReactNode} {
  const currentDecorators = editor._decorators;
  const pendingDecorators = Object.assign({}, currentDecorators);
  editor._pendingDecorators = pendingDecorators;
  return pendingDecorators;
}

export function $pushLogEntry(entry: string): void {
  const editor = getActiveEditor();
  editor._log.push(entry);
}

export function getEditorStateTextContent(editorState: EditorState): string {
  return editorState.read((view) => $getRoot().getTextContent());
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
      const nodeMapEntries = Array.from(nodeMap);
      // For...of would be faster here, but this will get
      // compiled away to a slow-path with Babel.
      for (let i = 0; i < nodeMapEntries.length; i++) {
        const node = nodeMapEntries[i][1];
        node.markDirty();
      }
    },
    true,
    editor._pendingEditorState === null
      ? {
          tag: 'without-history',
        }
      : undefined,
  );
}

export function $getRoot(editorState?: EditorState): RootNode {
  return (((editorState || getActiveEditorState())._nodeMap.get(
    'root',
    // $FlowFixMe: root is always in our Map
  ): any): RootNode);
}

export function $setSelection(selection: null | RangeSelection): void {
  const editorState = getActiveEditorState();
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
  let node = dom;
  while (node != null) {
    const key: NodeKey | void =
      // $FlowFixMe: internal field
      node['__lexicalKey_' + editor._key];
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
  let currentEditor = editor;
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
  editor: LexicalEditor,
  compositionEnd: boolean,
): void {
  // Update the text content with the latest composition text
  const domSelection = window.getSelection();
  if (domSelection === null) {
    return;
  }
  const {anchorNode, anchorOffset, focusOffset} = domSelection;
  if (anchorNode !== null && anchorNode.nodeType === DOM_TEXT_TYPE) {
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if ($isTextNode(node)) {
      $updateTextNodeFromDOMContent(
        node,
        anchorNode.nodeValue,
        anchorOffset,
        focusOffset,
        compositionEnd,
      );
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
      textContent[textContent.length - 1] === NO_BREAK_SPACE_CHAR
    ) {
      normalizedTextContent = textContent.slice(0, -1);
    }
    const prevTextContent = node.getTextContent();

    if (compositionEnd || normalizedTextContent !== prevTextContent) {
      if (normalizedTextContent === '') {
        if (isComposing) {
          $setCompositionKey(null);
        }
        node.remove();
        return;
      }
      const parent = node.getParent();
      const prevSelection = $getPreviousSelection();

      if (
        $isTokenOrInert(node) ||
        ($getCompositionKey() !== null && !isComposing) ||
        // Check if character was added at the start, and we need
        // to clear this input from occuring as that action wasn't
        // permitted.
        (parent !== null &&
          prevSelection !== null &&
          !parent.canInsertTextBefore() &&
          prevSelection.anchor.offset === 0)
      ) {
        node.markDirty();
        return;
      }
      const selection = $getSelection();

      if (selection === null || anchorOffset === null || focusOffset === null) {
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
      node = node.setTextContent(normalizedTextContent);
    }
  }
}

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
  const shouldInsertTextBefore =
    offset === 0 &&
    (!node.canInsertTextBefore() || !parent.canInsertTextBefore() || isToken);
  const shouldInsertTextAfter =
    node.getTextContentSize() === offset &&
    (!node.canInsertTextBefore() || !parent.canInsertTextBefore() || isToken);
  return shouldInsertTextBefore || shouldInsertTextAfter;
}

export function $shouldPreventDefaultAndInsertText(
  selection: RangeSelection,
  text: string,
  isBeforeInput: boolean,
): boolean {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();

  return (
    anchor.key !== focus.key ||
    // If we're working with a range that is not during composition.
    (anchor.offset !== focus.offset && !anchorNode.isComposing()) ||
    // If the text length is more than a single character and we're either
    // dealing with this in "beforeinput" or where the node has already recently
    // been changed (thus is dirty).
    ((isBeforeInput || anchorNode.isDirty()) && text.length > 1) ||
    // If we're working with a non-text node.
    !$isTextNode(anchorNode) ||
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
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 66 && controlOrMeta(metaKey, ctrlKey);
}

export function isItalic(
  keyCode: number,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 73 && controlOrMeta(metaKey, ctrlKey);
}

export function isUnderline(
  keyCode: number,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return keyCode === 85 && controlOrMeta(metaKey, ctrlKey);
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
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(keyCode) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveForward(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(keyCode) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveUp(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowUp(keyCode) && !ctrlKey && !metaKey;
}

export function isMoveDown(
  keyCode: number,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowDown(keyCode) && !ctrlKey && !metaKey;
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

export function getCachedClassNameArray<Theme: {...}>(
  classNamesTheme: Theme,
  classNameThemeType: string,
): Array<string> | void {
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
