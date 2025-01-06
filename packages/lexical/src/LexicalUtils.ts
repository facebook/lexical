/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  CommandPayloadType,
  EditorConfig,
  EditorThemeClasses,
  Klass,
  LexicalCommand,
  MutatedNodes,
  MutationListeners,
  NodeMutation,
  RegisteredNode,
  RegisteredNodes,
  Spread,
} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {
  LexicalNode,
  LexicalPrivateDOM,
  NodeKey,
  NodeMap,
} from './LexicalNode';
import type {
  BaseSelection,
  PointType,
  RangeSelection,
} from './LexicalSelection';
import type {RootNode} from './nodes/LexicalRootNode';
import type {TextFormatType, TextNode} from './nodes/LexicalTextNode';

import {CAN_USE_DOM} from 'shared/canUseDOM';
import {IS_APPLE, IS_APPLE_WEBKIT, IS_IOS, IS_SAFARI} from 'shared/environment';
import invariant from 'shared/invariant';
import normalizeClassNames from 'shared/normalizeClassNames';

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
  DOM_DOCUMENT_FRAGMENT_TYPE,
  DOM_DOCUMENT_TYPE,
  DOM_ELEMENT_TYPE,
  DOM_TEXT_TYPE,
  HAS_DIRTY_NODES,
  LTR_REGEX,
  RTL_REGEX,
  TEXT_TYPE_TO_FORMAT,
} from './LexicalConstants';
import {LexicalEditor} from './LexicalEditor';
import {$flushRootMutations} from './LexicalMutations';
import {$normalizeSelection} from './LexicalNormalization';
import {
  errorOnInfiniteTransforms,
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  internalGetActiveEditorState,
  isCurrentlyReadOnlyMode,
  triggerCommandListeners,
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

export function isSelectionCapturedInDecoratorInput(anchorDOM: Node): boolean {
  const activeElement = document.activeElement;

  if (!isHTMLElement(activeElement)) {
    return false;
  }
  const nodeName = activeElement.nodeName;

  return (
    $isDecoratorNode($getNearestNodeFromDOMNode(anchorDOM)) &&
    (nodeName === 'INPUT' ||
      nodeName === 'TEXTAREA' ||
      (activeElement.contentEditable === 'true' &&
        getEditorPropertyFromDOMNode(activeElement) == null))
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
      !isSelectionCapturedInDecoratorInput(anchorDOM) &&
      getNearestEditorFromDOMNode(anchorDOM) === editor
    );
  } catch (error) {
    return false;
  }
}

/**
 * @returns true if the given argument is a LexicalEditor instance from this build of Lexical
 */
export function isLexicalEditor(editor: unknown): editor is LexicalEditor {
  // Check instanceof to prevent issues with multiple embedded Lexical installations
  return editor instanceof LexicalEditor;
}

export function getNearestEditorFromDOMNode(
  node: Node | null,
): LexicalEditor | null {
  let currentNode = node;
  while (currentNode != null) {
    const editor = getEditorPropertyFromDOMNode(currentNode);
    if (isLexicalEditor(editor)) {
      return editor;
    }
    currentNode = getParentElement(currentNode);
  }
  return null;
}

/** @internal */
export function getEditorPropertyFromDOMNode(node: Node | null): unknown {
  // @ts-expect-error: internal field
  return node ? node.__lexicalEditor : null;
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

/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Text node, false otherwise.
 */
export function isDOMTextNode(node: unknown): node is Text {
  return isDOMNode(node) && node.nodeType === DOM_TEXT_TYPE;
}

/**
 * @param node - The element being tested
 * @returns Returns true if node is an DOM Document node, false otherwise.
 */
export function isDOMDocumentNode(node: unknown): node is Document {
  return isDOMNode(node) && node.nodeType === DOM_DOCUMENT_TYPE;
}

export function getDOMTextNode(element: Node | null): Text | null {
  let node = element;
  while (node != null) {
    if (isDOMTextNode(node)) {
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
  if (
    alignWithFormat !== null &&
    (format & activeFormat) === (alignWithFormat & activeFormat)
  ) {
    return format;
  }
  let newFormat = format ^ activeFormat;
  if (type === 'subscript') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.superscript;
  } else if (type === 'superscript') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.subscript;
  } else if (type === 'lowercase') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.uppercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.capitalize;
  } else if (type === 'uppercase') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.lowercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.capitalize;
  } else if (type === 'capitalize') {
    newFormat &= ~TEXT_TYPE_TO_FORMAT.lowercase;
    newFormat &= ~TEXT_TYPE_TO_FORMAT.uppercase;
  }
  return newFormat;
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
    if (__DEV__) {
      errorOnNodeKeyConstructorMismatch(node, existingKey);
    }
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

function errorOnNodeKeyConstructorMismatch(
  node: LexicalNode,
  existingKey: NodeKey,
) {
  const editorState = internalGetActiveEditorState();
  if (!editorState) {
    // tests expect to be able to do this kind of clone without an active editor state
    return;
  }
  const existingNode = editorState._nodeMap.get(existingKey);
  if (existingNode && existingNode.constructor !== node.constructor) {
    // Lifted condition to if statement because the inverted logic is a bit confusing
    if (node.constructor.name !== existingNode.constructor.name) {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with constructor %s. Keys must not be re-used when the type is changed.',
        node.constructor.name,
        existingNode.constructor.name,
      );
    } else {
      invariant(
        false,
        'Lexical node with constructor %s attempted to re-use key from node in active editor state with different constructor with the same name (possibly due to invalid Hot Module Replacement). Keys must not be re-used when the type is changed.',
        node.constructor.name,
      );
    }
  }
}

type IntentionallyMarkedAsDirtyElement = boolean;

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

// TODO #6031 this function or their callers have to adjust selection (i.e. insertBefore)
export function removeFromParent(node: LexicalNode): void {
  const oldParent = node.getParent();
  if (oldParent !== null) {
    const writableNode = node.getWritable();
    const writableParent = oldParent.getWritable();
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();
    // TODO: this function duplicates a bunch of operations, can be simplified.
    if (prevSibling === null) {
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableParent.__first = nextSibling.__key;
        writableNextSibling.__prev = null;
      } else {
        writableParent.__first = null;
      }
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableNextSibling.__prev = writablePrevSibling.__key;
        writablePrevSibling.__next = writableNextSibling.__key;
      } else {
        writablePrevSibling.__next = null;
      }
      writableNode.__prev = null;
    }
    if (nextSibling === null) {
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writableParent.__last = prevSibling.__key;
        writablePrevSibling.__next = null;
      } else {
        writableParent.__last = null;
      }
    } else {
      const writableNextSibling = nextSibling.getWritable();
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writablePrevSibling.__next = writableNextSibling.__key;
        writableNextSibling.__prev = writablePrevSibling.__key;
      } else {
        writableNextSibling.__prev = null;
      }
      writableNode.__next = null;
    }
    writableParent.__size--;
    writableNode.__parent = null;
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

export function $getNodeFromDOMNode(
  dom: Node,
  editorState?: EditorState,
): LexicalNode | null {
  const editor = getActiveEditor();
  const key = getNodeKeyFromDOMNode(dom, editor);
  if (key !== undefined) {
    return $getNodeByKey(key, editorState);
  }
  return null;
}

export function setNodeKeyOnDOMNode(
  dom: Node,
  editor: LexicalEditor,
  key: NodeKey,
) {
  const prop = `__lexicalKey_${editor._key}`;
  (dom as Node & Record<typeof prop, NodeKey | undefined>)[prop] = key;
}

export function getNodeKeyFromDOMNode(
  dom: Node,
  editor: LexicalEditor,
): NodeKey | undefined {
  const prop = `__lexicalKey_${editor._key}`;
  return (dom as Node & Record<typeof prop, NodeKey | undefined>)[prop];
}

export function $getNearestNodeFromDOMNode(
  startingDOM: Node,
  editorState?: EditorState,
): LexicalNode | null {
  let dom: Node | null = startingDOM;
  while (dom != null) {
    const node = $getNodeFromDOMNode(dom, editorState);
    if (node !== null) {
      return node;
    }
    dom = getParentElement(dom);
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

export function markNodesWithTypesAsDirty(
  editor: LexicalEditor,
  types: string[],
): void {
  // We only need to mark nodes dirty if they were in the previous state.
  // If they aren't, then they are by definition dirty already.
  const cachedMap = getCachedTypeToNodeMap(editor.getEditorState());
  const dirtyNodeMaps: NodeMap[] = [];
  for (const type of types) {
    const nodeMap = cachedMap.get(type);
    if (nodeMap) {
      // By construction these are non-empty
      dirtyNodeMaps.push(nodeMap);
    }
  }
  // Nothing to mark dirty, no update necessary
  if (dirtyNodeMaps.length === 0) {
    return;
  }
  editor.update(
    () => {
      for (const nodeMap of dirtyNodeMaps) {
        for (const nodeKey of nodeMap.keys()) {
          // We are only concerned with nodes that are still in the latest NodeMap,
          // if they no longer exist then markDirty would raise an exception
          const latest = $getNodeByKey(nodeKey);
          if (latest) {
            latest.markDirty();
          }
        }
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

export function $setSelection(selection: null | BaseSelection): void {
  errorOnReadOnly();
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
    selection.setCachedNodes(null);
  }
  editorState._selection = selection;
}

export function $flushMutations(): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  $flushRootMutations(editor);
}

export function $getNodeFromDOM(dom: Node): null | LexicalNode {
  const editor = getActiveEditor();
  const nodeKey = getNodeKeyFromDOMTree(dom, editor);
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

function getNodeKeyFromDOMTree(
  // Note that node here refers to a DOM Node, not an Lexical Node
  dom: Node,
  editor: LexicalEditor,
): NodeKey | null {
  let node: Node | null = dom;
  while (node != null) {
    const key = getNodeKeyFromDOMNode(node, editor);
    if (key !== undefined) {
      return key;
    }
    node = getParentElement(node);
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

export function getAnchorTextFromDOM(anchorNode: Node): null | string {
  return isDOMTextNode(anchorNode) ? anchorNode.nodeValue : null;
}

export function $updateSelectedTextFromDOM(
  isCompositionEnd: boolean,
  editor: LexicalEditor,
  data?: string,
): void {
  // Update the text content with the latest composition text
  const domSelection = getDOMSelection(editor._window);
  if (domSelection === null) {
    return;
  }
  const anchorNode = domSelection.anchorNode;
  let {anchorOffset, focusOffset} = domSelection;
  if (anchorNode !== null) {
    let textContent = getAnchorTextFromDOM(anchorNode);
    const node = $getNearestNodeFromDOMNode(anchorNode);
    if (textContent !== null && $isTextNode(node)) {
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
        if (!IS_SAFARI && !IS_IOS && !IS_APPLE_WEBKIT) {
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
      const prevTextContentSize = node.getTextContentSize();
      const compositionKey = $getCompositionKey();
      const nodeKey = node.getKey();

      if (
        node.isToken() ||
        (compositionKey !== null &&
          nodeKey === compositionKey &&
          !isComposing) ||
        // Check if character was added at the start or boundaries when not insertable, and we need
        // to clear this input from occurring as that action wasn't permitted.
        ($isRangeSelection(prevSelection) &&
          ((parent !== null &&
            !parent.canInsertTextBefore() &&
            prevSelection.anchor.offset === 0) ||
            (prevSelection.anchor.key === textNode.__key &&
              prevSelection.anchor.offset === 0 &&
              !node.canInsertTextBefore() &&
              !isComposing) ||
            (prevSelection.focus.key === textNode.__key &&
              prevSelection.focus.offset === prevTextContentSize &&
              !node.canInsertTextAfter() &&
              !isComposing)))
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
export function $shouldInsertTextAfterOrBeforeTextNode(
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
      (!parent.canInsertTextBefore() && !node.isComposing()) ||
      isToken ||
      $previousSiblingDoesNotAcceptText(node)
    );
  } else if (offset === node.getTextContentSize()) {
    return (
      !node.canInsertTextAfter() ||
      (!parent.canInsertTextAfter() && !node.isComposing()) ||
      isToken
    );
  } else {
    return false;
  }
}

export function isTab(
  key: string,
  altKey: boolean,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return key === 'Tab' && !altKey && !ctrlKey && !metaKey;
}

export function isBold(
  key: string,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'b' && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isItalic(
  key: string,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'i' && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isUnderline(
  key: string,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'u' && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isParagraph(key: string, shiftKey: boolean): boolean {
  return isReturn(key) && !shiftKey;
}

export function isLineBreak(key: string, shiftKey: boolean): boolean {
  return isReturn(key) && shiftKey;
}

// Inserts a new line after the selection

export function isOpenLineBreak(key: string, ctrlKey: boolean): boolean {
  // 79 = KeyO
  return IS_APPLE && ctrlKey && key.toLowerCase() === 'o';
}

export function isDeleteWordBackward(
  key: string,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isBackspace(key) && (IS_APPLE ? altKey : ctrlKey);
}

export function isDeleteWordForward(
  key: string,
  altKey: boolean,
  ctrlKey: boolean,
): boolean {
  return isDelete(key) && (IS_APPLE ? altKey : ctrlKey);
}

export function isDeleteLineBackward(key: string, metaKey: boolean): boolean {
  return IS_APPLE && metaKey && isBackspace(key);
}

export function isDeleteLineForward(key: string, metaKey: boolean): boolean {
  return IS_APPLE && metaKey && isDelete(key);
}

export function isDeleteBackward(
  key: string,
  altKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(key) || (key.toLowerCase() === 'h' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(key);
}

export function isDeleteForward(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(key) || (key.toLowerCase() === 'd' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(key);
}

export function isUndo(
  key: string,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'z' && !shiftKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isRedo(
  key: string,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (IS_APPLE) {
    return key.toLowerCase() === 'z' && metaKey && shiftKey;
  }
  return (
    (key.toLowerCase() === 'y' && ctrlKey) ||
    (key.toLowerCase() === 'z' && ctrlKey && shiftKey)
  );
}

export function isCopy(
  key: string,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (shiftKey) {
    return false;
  }
  if (key.toLowerCase() === 'c') {
    return IS_APPLE ? metaKey : ctrlKey;
  }

  return false;
}

export function isCut(
  key: string,
  shiftKey: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  if (shiftKey) {
    return false;
  }
  if (key.toLowerCase() === 'x') {
    return IS_APPLE ? metaKey : ctrlKey;
  }

  return false;
}

function isArrowLeft(key: string): boolean {
  return key === 'ArrowLeft';
}

function isArrowRight(key: string): boolean {
  return key === 'ArrowRight';
}

function isArrowUp(key: string): boolean {
  return key === 'ArrowUp';
}

function isArrowDown(key: string): boolean {
  return key === 'ArrowDown';
}

export function isMoveBackward(
  key: string,
  ctrlKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(key) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveToStart(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowLeft(key) && !altKey && !shiftKey && (ctrlKey || metaKey);
}

export function isMoveForward(
  key: string,
  ctrlKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(key) && !ctrlKey && !metaKey && !altKey;
}

export function isMoveToEnd(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowRight(key) && !altKey && !shiftKey && (ctrlKey || metaKey);
}

export function isMoveUp(
  key: string,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowUp(key) && !ctrlKey && !metaKey;
}

export function isMoveDown(
  key: string,
  ctrlKey: boolean,
  metaKey: boolean,
): boolean {
  return isArrowDown(key) && !ctrlKey && !metaKey;
}

export function isModifier(
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return ctrlKey || shiftKey || altKey || metaKey;
}

export function isSpace(key: string): boolean {
  return key === ' ';
}

export function controlOrMeta(metaKey: boolean, ctrlKey: boolean): boolean {
  if (IS_APPLE) {
    return metaKey;
  }
  return ctrlKey;
}

export function isReturn(key: string): boolean {
  return key === 'Enter';
}

export function isBackspace(key: string): boolean {
  return key === 'Backspace';
}

export function isEscape(key: string): boolean {
  return key === 'Escape';
}

export function isDelete(key: string): boolean {
  return key === 'Delete';
}

export function isSelectAll(
  key: string,
  metaKey: boolean,
  ctrlKey: boolean,
): boolean {
  return key.toLowerCase() === 'a' && controlOrMeta(metaKey, ctrlKey);
}

export function $selectAll(selection?: RangeSelection | null): RangeSelection {
  const root = $getRoot();

  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const topParent = anchorNode.getTopLevelElementOrThrow();
    const rootNode = topParent.getParentOrThrow();
    anchor.set(rootNode.getKey(), 0, 'element');
    focus.set(rootNode.getKey(), rootNode.getChildrenSize(), 'element');
    $normalizeSelection(selection);
    return selection;
  } else {
    // Create a new RangeSelection
    const newSelection = root.select(0, root.getChildrenSize());
    $setSelection($normalizeSelection(newSelection));
    return newSelection;
  }
}

export function getCachedClassNameArray(
  classNamesTheme: EditorThemeClasses,
  classNameThemeType: string,
): Array<string> {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {};
  }
  const classNamesCache = classNamesTheme.__lexicalClassNameCache;
  const cachedClassNames = classNamesCache[classNameThemeType];
  if (cachedClassNames !== undefined) {
    return cachedClassNames;
  }
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames);
    classNamesCache[classNameThemeType] = classNamesArr;
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
  const prevMutation = mutatedNodesByType.get(nodeKey);
  // If the node has already been "destroyed", yet we are
  // re-making it, then this means a move likely happened.
  // We should change the mutation to be that of "updated"
  // instead.
  const isMove = prevMutation === 'destroyed' && mutation === 'created';
  if (prevMutation === undefined || isMove) {
    mutatedNodesByType.set(nodeKey, isMove ? 'updated' : mutation);
  }
}
/**
 * @deprecated Use {@link LexicalEditor.registerMutationListener} with `skipInitialization: false` instead.
 */
export function $nodesOfType<T extends LexicalNode>(klass: Klass<T>): Array<T> {
  const klassType = klass.getType();
  const editorState = getActiveEditorState();
  if (editorState._readOnly) {
    const nodes = getCachedTypeToNodeMap(editorState).get(klassType) as
      | undefined
      | Map<string, T>;
    return nodes ? Array.from(nodes.values()) : [];
  }
  const nodes = editorState._nodeMap;
  const nodesOfType: Array<T> = [];
  for (const [, node] of nodes) {
    if (
      node instanceof klass &&
      node.__type === klassType &&
      node.isAttached()
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

export function $getAdjacentNode(
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

export function getParentElement(node: Node): HTMLElement | null {
  const parentElement =
    (node as HTMLSlotElement).assignedSlot || node.parentElement;
  return isDocumentFragment(parentElement)
    ? ((parentElement as unknown as ShadowRoot).host as HTMLElement)
    : parentElement;
}

export function getDOMOwnerDocument(
  target: EventTarget | null,
): Document | null {
  return isDOMDocumentNode(target)
    ? target
    : isHTMLElement(target)
    ? target.ownerDocument
    : null;
}

export function scrollIntoViewIfNeeded(
  editor: LexicalEditor,
  selectionRect: DOMRect,
  rootElement: HTMLElement,
): void {
  const doc = getDOMOwnerDocument(rootElement);
  const defaultView = getDefaultView(doc);

  if (doc === null || defaultView === null) {
    return;
  }
  let {top: currentTop, bottom: currentBottom} = selectionRect;
  let targetTop = 0;
  let targetBottom = 0;
  let element: HTMLElement | null = rootElement;

  while (element !== null) {
    const isBodyElement = element === doc.body;
    if (isBodyElement) {
      targetTop = 0;
      targetBottom = getWindow(editor).innerHeight;
    } else {
      const targetRect = element.getBoundingClientRect();
      targetTop = targetRect.top;
      targetBottom = targetRect.bottom;
    }
    let diff = 0;

    if (currentTop < targetTop) {
      diff = -(targetTop - currentTop);
    } else if (currentBottom > targetBottom) {
      diff = currentBottom - targetBottom;
    }

    if (diff !== 0) {
      if (isBodyElement) {
        // Only handles scrolling of Y axis
        defaultView.scrollBy(0, diff);
      } else {
        const scrollTop = element.scrollTop;
        element.scrollTop += diff;
        const yOffset = element.scrollTop - scrollTop;
        currentTop -= yOffset;
        currentBottom -= yOffset;
      }
    }
    if (isBodyElement) {
      break;
    }
    element = getParentElement(element);
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

/**
 * Add a function to run after the current update. This will run after any
 * `onUpdate` function already supplied to `editor.update()`, as well as any
 * functions added with previous calls to `$onUpdate`.
 *
 * @param updateFn The function to run after the current update.
 */
export function $onUpdate(updateFn: () => void): void {
  errorOnReadOnly();
  const editor = getActiveEditor();
  editor._deferred.push(updateFn);
}

export function $maybeMoveChildrenSelectionToParent(
  parentNode: LexicalNode,
): BaseSelection | null {
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

export function getDefaultView(domElem: EventTarget | null): Window | null {
  const ownerDoc = getDOMOwnerDocument(domElem);
  return ownerDoc ? ownerDoc.defaultView : null;
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

const ShadowRootNodeBrand: unique symbol = Symbol.for(
  '@lexical/ShadowRootNodeBrand',
);
type ShadowRootNode = Spread<
  {isShadowRoot(): true; [ShadowRootNodeBrand]: never},
  ElementNode
>;
export function $isRootOrShadowRoot(
  node: null | LexicalNode,
): node is RootNode | ShadowRootNode {
  return $isRootNode(node) || ($isElementNode(node) && node.isShadowRoot());
}

/**
 * Returns a shallow clone of node with a new key
 *
 * @param node - The node to be copied.
 * @returns The copy of the node.
 */
export function $copyNode<T extends LexicalNode>(node: T): T {
  const copy = node.constructor.clone(node) as T;
  $setNodeKey(copy, null);
  return copy;
}

export function $applyNodeReplacement<N extends LexicalNode>(node: N): N {
  const editor = getActiveEditor();
  const nodeType = node.constructor.getType();
  const registeredNode = editor._nodes.get(nodeType);
  invariant(
    registeredNode !== undefined,
    '$applyNodeReplacement node %s with type %s must be registered to the editor. You can do this by passing the node class via the "nodes" array in the editor config.',
    node.constructor.name,
    nodeType,
  );
  const {replace, replaceWithKlass} = registeredNode;
  if (replace !== null) {
    const replacementNode = replace(node);
    const replacementNodeKlass = replacementNode.constructor;
    if (replaceWithKlass !== null) {
      invariant(
        replacementNode instanceof replaceWithKlass,
        '$applyNodeReplacement failed. Expected replacement node to be an instance of %s with type %s but returned %s with type %s from original node %s with type %s',
        replaceWithKlass.name,
        replaceWithKlass.getType(),
        replacementNodeKlass.name,
        replacementNodeKlass.getType(),
        node.constructor.name,
        nodeType,
      );
    } else {
      invariant(
        replacementNode instanceof node.constructor &&
          replacementNodeKlass !== node.constructor,
        '$applyNodeReplacement failed. Ensure replacement node %s with type %s is a subclass of the original node %s with type %s.',
        replacementNodeKlass.name,
        replacementNodeKlass.getType(),
        node.constructor.name,
        nodeType,
      );
    }
    invariant(
      replacementNode.__key !== node.__key,
      '$applyNodeReplacement failed. Ensure that the key argument is *not* used in your replace function (from node %s with type %s to node %s with type %s), Node keys must never be re-used except by the static clone method.',
      node.constructor.name,
      nodeType,
      replacementNodeKlass.name,
      replacementNodeKlass.getType(),
    );
    return replacementNode as N;
  }
  return node;
}

export function errorOnInsertTextNodeOnRoot(
  node: LexicalNode,
  insertNode: LexicalNode,
): void {
  const parentNode = node.getParent();
  if (
    $isRootNode(parentNode) &&
    !$isElementNode(insertNode) &&
    !$isDecoratorNode(insertNode)
  ) {
    invariant(
      false,
      'Only element or decorator nodes can be inserted in to the root node',
    );
  }
}

export function $getNodeByKeyOrThrow<N extends LexicalNode>(key: NodeKey): N {
  const node = $getNodeByKey<N>(key);
  if (node === null) {
    invariant(
      false,
      "Expected node with key %s to exist but it's not in the nodeMap.",
      key,
    );
  }
  return node;
}

function createBlockCursorElement(editorConfig: EditorConfig): HTMLDivElement {
  const theme = editorConfig.theme;
  const element = document.createElement('div');
  element.contentEditable = 'false';
  element.setAttribute('data-lexical-cursor', 'true');
  let blockCursorTheme = theme.blockCursor;
  if (blockCursorTheme !== undefined) {
    if (typeof blockCursorTheme === 'string') {
      const classNamesArr = normalizeClassNames(blockCursorTheme);
      // @ts-expect-error: intentional
      blockCursorTheme = theme.blockCursor = classNamesArr;
    }
    if (blockCursorTheme !== undefined) {
      element.classList.add(...blockCursorTheme);
    }
  }
  return element;
}

function needsBlockCursor(node: null | LexicalNode): boolean {
  return (
    ($isDecoratorNode(node) || ($isElementNode(node) && !node.canBeEmpty())) &&
    !node.isInline()
  );
}

export function removeDOMBlockCursorElement(
  blockCursorElement: HTMLElement,
  editor: LexicalEditor,
  rootElement: HTMLElement,
) {
  rootElement.style.removeProperty('caret-color');
  editor._blockCursorElement = null;
  const parentElement = blockCursorElement.parentElement;
  if (parentElement !== null) {
    parentElement.removeChild(blockCursorElement);
  }
}

export function updateDOMBlockCursorElement(
  editor: LexicalEditor,
  rootElement: HTMLElement,
  nextSelection: null | BaseSelection,
): void {
  let blockCursorElement = editor._blockCursorElement;

  if (
    $isRangeSelection(nextSelection) &&
    nextSelection.isCollapsed() &&
    nextSelection.anchor.type === 'element' &&
    rootElement.contains(document.activeElement)
  ) {
    const anchor = nextSelection.anchor;
    const elementNode = anchor.getNode();
    const offset = anchor.offset;
    const elementNodeSize = elementNode.getChildrenSize();
    let isBlockCursor = false;
    let insertBeforeElement: null | HTMLElement = null;

    if (offset === elementNodeSize) {
      const child = elementNode.getChildAtIndex(offset - 1);
      if (needsBlockCursor(child)) {
        isBlockCursor = true;
      }
    } else {
      const child = elementNode.getChildAtIndex(offset);
      if (child !== null && needsBlockCursor(child)) {
        const sibling = child.getPreviousSibling();
        if (sibling === null || needsBlockCursor(sibling)) {
          isBlockCursor = true;
          insertBeforeElement = editor.getElementByKey(child.__key);
        }
      }
    }
    if (isBlockCursor) {
      const elementDOM = editor.getElementByKey(
        elementNode.__key,
      ) as HTMLElement;
      if (blockCursorElement === null) {
        editor._blockCursorElement = blockCursorElement =
          createBlockCursorElement(editor._config);
      }
      rootElement.style.caretColor = 'transparent';
      if (insertBeforeElement === null) {
        elementDOM.appendChild(blockCursorElement);
      } else {
        elementDOM.insertBefore(blockCursorElement, insertBeforeElement);
      }
      return;
    }
  }
  // Remove cursor
  if (blockCursorElement !== null) {
    removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
  }
}

/**
 * Returns the selection for the given window, or the global window if null.
 * Will return null if {@link CAN_USE_DOM} is false.
 *
 * @param targetWindow The window to get the selection from
 * @returns a Selection or null
 */
export function getDOMSelection(targetWindow: null | Window): null | Selection {
  return !CAN_USE_DOM ? null : (targetWindow || window).getSelection();
}

/**
 * Returns the selection for the defaultView of the ownerDocument of given EventTarget.
 *
 * @param eventTarget The node to get the selection from
 * @returns a Selection or null
 */
export function getDOMSelectionFromTarget(
  eventTarget: null | EventTarget,
): null | Selection {
  const defaultView = getDefaultView(eventTarget);
  return defaultView ? defaultView.getSelection() : null;
}

export function $splitNode(
  node: ElementNode,
  offset: number,
): [ElementNode | null, ElementNode] {
  let startNode = node.getChildAtIndex(offset);
  if (startNode == null) {
    startNode = node;
  }

  invariant(
    !$isRootOrShadowRoot(node),
    'Can not call $splitNode() on root element',
  );

  const recurse = <T extends LexicalNode>(
    currentNode: T,
  ): [ElementNode, ElementNode, T] => {
    const parent = currentNode.getParentOrThrow();
    const isParentRoot = $isRootOrShadowRoot(parent);
    // The node we start split from (leaf) is moved, but its recursive
    // parents are copied to create separate tree
    const nodeToMove =
      currentNode === startNode && !isParentRoot
        ? currentNode
        : $copyNode(currentNode);

    if (isParentRoot) {
      invariant(
        $isElementNode(currentNode) && $isElementNode(nodeToMove),
        'Children of a root must be ElementNode',
      );

      currentNode.insertAfter(nodeToMove);
      return [currentNode, nodeToMove, nodeToMove];
    } else {
      const [leftTree, rightTree, newParent] = recurse(parent);
      const nextSiblings = currentNode.getNextSiblings();

      newParent.append(nodeToMove, ...nextSiblings);
      return [leftTree, rightTree, nodeToMove];
    }
  };

  const [leftTree, rightTree] = recurse(startNode);

  return [leftTree, rightTree];
}

export function $findMatchingParent(
  startingNode: LexicalNode,
  findFn: (node: LexicalNode) => boolean,
): LexicalNode | null {
  let curr: ElementNode | LexicalNode | null = startingNode;

  while (curr !== $getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }

    curr = curr.getParent();
  }

  return null;
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML anchor tag, false otherwise
 */
export function isHTMLAnchorElement(x: unknown): x is HTMLAnchorElement {
  return isHTMLElement(x) && x.tagName === 'A';
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is an HTML element, false otherwise.
 */
export function isHTMLElement(x: unknown): x is HTMLElement {
  return isDOMNode(x) && x.nodeType === DOM_ELEMENT_TYPE;
}

/**
 * @param x - The element being tested
 * @returns Returns true if x is a DOM Node, false otherwise.
 */
export function isDOMNode(x: unknown): x is Node {
  return (
    typeof x === 'object' &&
    x !== null &&
    'nodeType' in x &&
    typeof x.nodeType === 'number'
  );
}

/**
 * @param x - The element being testing
 * @returns Returns true if x is a document fragment, false otherwise.
 */
export function isDocumentFragment(x: unknown): x is DocumentFragment {
  return isDOMNode(x) && x.nodeType === DOM_DOCUMENT_FRAGMENT_TYPE;
}

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is an inline node
 */
export function isInlineDomNode(node: Node) {
  const inlineNodes = new RegExp(
    /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var|#text)$/,
    'i',
  );
  return node.nodeName.match(inlineNodes) !== null;
}

/**
 *
 * @param node - the Dom Node to check
 * @returns if the Dom Node is a block node
 */
export function isBlockDomNode(node: Node) {
  const blockNodes = new RegExp(
    /^(address|article|aside|blockquote|canvas|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|noscript|ol|p|pre|section|table|td|tfoot|ul|video)$/,
    'i',
  );
  return node.nodeName.match(blockNodes) !== null;
}

/**
 * This function is for internal use of the library.
 * Please do not use it as it may change in the future.
 */
export function INTERNAL_$isBlock(
  node: LexicalNode,
): node is ElementNode | DecoratorNode<unknown> {
  if ($isDecoratorNode(node) && !node.isInline()) {
    return true;
  }
  if (!$isElementNode(node) || $isRootOrShadowRoot(node)) {
    return false;
  }

  const firstChild = node.getFirstChild();
  const isLeafElement =
    firstChild === null ||
    $isLineBreakNode(firstChild) ||
    $isTextNode(firstChild) ||
    firstChild.isInline();

  return !node.isInline() && node.canBeEmpty() !== false && isLeafElement;
}

export function $getAncestor<NodeType extends LexicalNode = LexicalNode>(
  node: LexicalNode,
  predicate: (ancestor: LexicalNode) => ancestor is NodeType,
): NodeType | null {
  let parent = node;
  while (parent !== null && parent.getParent() !== null && !predicate(parent)) {
    parent = parent.getParentOrThrow();
  }
  return predicate(parent) ? parent : null;
}

/**
 * Utility function for accessing current active editor instance.
 * @returns Current active editor
 */
export function $getEditor(): LexicalEditor {
  return getActiveEditor();
}

/** @internal */
export type TypeToNodeMap = Map<string, NodeMap>;
/**
 * @internal
 * Compute a cached Map of node type to nodes for a frozen EditorState
 */
const cachedNodeMaps = new WeakMap<EditorState, TypeToNodeMap>();
const EMPTY_TYPE_TO_NODE_MAP: TypeToNodeMap = new Map();
export function getCachedTypeToNodeMap(
  editorState: EditorState,
): TypeToNodeMap {
  // If this is a new Editor it may have a writable this._editorState
  // with only a 'root' entry.
  if (!editorState._readOnly && editorState.isEmpty()) {
    return EMPTY_TYPE_TO_NODE_MAP;
  }
  invariant(
    editorState._readOnly,
    'getCachedTypeToNodeMap called with a writable EditorState',
  );
  let typeToNodeMap = cachedNodeMaps.get(editorState);
  if (!typeToNodeMap) {
    typeToNodeMap = computeTypeToNodeMap(editorState);
    cachedNodeMaps.set(editorState, typeToNodeMap);
  }
  return typeToNodeMap;
}

/**
 * @internal
 * Compute a Map of node type to nodes for an EditorState
 */
function computeTypeToNodeMap(editorState: EditorState): TypeToNodeMap {
  const typeToNodeMap = new Map();
  for (const [nodeKey, node] of editorState._nodeMap) {
    const nodeType = node.__type;
    let nodeMap = typeToNodeMap.get(nodeType);
    if (!nodeMap) {
      nodeMap = new Map();
      typeToNodeMap.set(nodeType, nodeMap);
    }
    nodeMap.set(nodeKey, node);
  }
  return typeToNodeMap;
}

/**
 * Returns a clone of a node using `node.constructor.clone()` followed by
 * `clone.afterCloneFrom(node)`. The resulting clone must have the same key,
 * parent/next/prev pointers, and other properties that are not set by
 * `node.constructor.clone` (format, style, etc.). This is primarily used by
 * {@link LexicalNode.getWritable} to create a writable version of an
 * existing node. The clone is the same logical node as the original node,
 * do not try and use this function to duplicate or copy an existing node.
 *
 * Does not mutate the EditorState.
 * @param node - The node to be cloned.
 * @returns The clone of the node.
 */
export function $cloneWithProperties<T extends LexicalNode>(latestNode: T): T {
  const constructor = latestNode.constructor;
  const mutableNode = constructor.clone(latestNode) as T;
  mutableNode.afterCloneFrom(latestNode);
  if (__DEV__) {
    invariant(
      mutableNode.__key === latestNode.__key,
      "$cloneWithProperties: %s.clone(node) (with type '%s') did not return a node with the same key, make sure to specify node.__key as the last argument to the constructor",
      constructor.name,
      constructor.getType(),
    );
    invariant(
      mutableNode.__parent === latestNode.__parent &&
        mutableNode.__next === latestNode.__next &&
        mutableNode.__prev === latestNode.__prev,
      "$cloneWithProperties: %s.clone(node) (with type '%s') overrided afterCloneFrom but did not call super.afterCloneFrom(prevNode)",
      constructor.name,
      constructor.getType(),
    );
  }
  return mutableNode;
}

export function setNodeIndentFromDOM(
  elementDom: HTMLElement,
  elementNode: ElementNode,
) {
  const indentSize = parseInt(elementDom.style.paddingInlineStart, 10) || 0;
  const indent = indentSize / 40;
  elementNode.setIndent(indent);
}

/**
 * @internal
 *
 * Mark this node as unmanaged by lexical's mutation observer like
 * decorator nodes
 */
export function setDOMUnmanaged(elementDom: HTMLElement): void {
  const el: HTMLElement & LexicalPrivateDOM = elementDom;
  el.__lexicalUnmanaged = true;
}

/**
 * @internal
 *
 * True if this DOM node was marked with {@link setDOMUnmanaged}
 */
export function isDOMUnmanaged(elementDom: Node): boolean {
  const el: Node & LexicalPrivateDOM = elementDom;
  return el.__lexicalUnmanaged === true;
}
