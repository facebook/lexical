/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {NodeKey} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextFormatType} from './nodes/LexicalTextNode';

import invariant from 'shared/invariant';

import {
  $caretFromPoint,
  $caretRangeFromSelection,
  $comparePointCaretNext,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $extendCaretToRange,
  $getAdjacentChildCaret,
  $getCaretRange,
  $getCaretRangeInDirection,
  $getChildCaret,
  $getSiblingCaret,
  $getTextNodeOffset,
  $isChildCaret,
  $isDecoratorNode,
  $isElementNode,
  $isExtendableTextPointCaret,
  $isLineBreakNode,
  $isParagraphNode,
  $isRootNode,
  $isSiblingCaret,
  $isTextNode,
  $isTextPointCaret,
  $normalizeCaret,
  $removeTextFromCaretRange,
  $rewindSiblingCaret,
  $setPointFromCaret,
  $setSelection,
  $setSelectionFromCaretRange,
  $updateRangeSelectionFromCaretRange,
  CaretRange,
  ChildCaret,
  COLLABORATION_TAG,
  NodeCaret,
  PointCaret,
  SKIP_SCROLL_INTO_VIEW_TAG,
  TextNode,
} from '.';
import {TEXT_TYPE_TO_FORMAT} from './LexicalConstants';
import {
  markCollapsedSelectionFormat,
  markSelectionChangeFromDOMUpdate,
} from './LexicalEvents';
import {getIsProcessingMutations} from './LexicalMutations';
import {insertRangeAfter, LexicalNode} from './LexicalNode';
import {$normalizeSelection} from './LexicalNormalization';
import {
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from './LexicalUpdates';
import {SKIP_SELECTION_FOCUS_TAG} from './LexicalUpdateTags';
import {
  $findMatchingParent,
  $getCompositionKey,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getNodeFromDOM,
  $getRoot,
  $hasAncestor,
  $isRootOrShadowRoot,
  $isTokenOrSegmented,
  $isTokenOrTab,
  $setCompositionKey,
  doesContainSurrogatePair,
  getDOMSelection,
  getDOMTextNode,
  getElementByKeyOrThrow,
  getWindow,
  INTERNAL_$isBlock,
  isHTMLElement,
  isSelectionCapturedInDecoratorInput,
  isSelectionWithinEditor,
  removeDOMBlockCursorElement,
  scrollIntoViewIfNeeded,
  toggleTextFormatType,
} from './LexicalUtils';
import {$createTabNode, $isTabNode} from './nodes/LexicalTabNode';

export type TextPointType = {
  _selection: BaseSelection;
  getNode: () => TextNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
    onlyIfChanged?: boolean,
  ) => void;
  type: 'text';
};

export type ElementPointType = {
  _selection: BaseSelection;
  getNode: () => ElementNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
    onlyIfChanged?: boolean,
  ) => void;
  type: 'element';
};

export type PointType = TextPointType | ElementPointType;

export class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  _selection: BaseSelection | null;

  constructor(key: NodeKey, offset: number, type: 'text' | 'element') {
    if (__DEV__) {
      // This prevents a circular reference error when serialized as JSON,
      // which happens on unit test failures
      Object.defineProperty(this, '_selection', {
        enumerable: false,
        writable: true,
      });
    }
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }

  is(point: PointType): boolean {
    return (
      this.key === point.key &&
      this.offset === point.offset &&
      this.type === point.type
    );
  }

  isBefore(b: PointType): boolean {
    if (this.key === b.key) {
      return this.offset < b.offset;
    }
    const aCaret = $normalizeCaret($caretFromPoint(this, 'next'));
    const bCaret = $normalizeCaret($caretFromPoint(b, 'next'));
    return $comparePointCaretNext(aCaret, bCaret) < 0;
  }

  getNode(): LexicalNode {
    const key = this.key;
    const node = $getNodeByKey(key);
    if (node === null) {
      invariant(false, 'Point.getNode: node not found');
    }
    return node;
  }

  set(
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
    onlyIfChanged?: boolean,
  ): void {
    const selection = this._selection;
    const oldKey = this.key;
    if (
      onlyIfChanged &&
      this.key === key &&
      this.offset === offset &&
      this.type === type
    ) {
      return;
    }
    this.key = key;
    this.offset = offset;
    this.type = type;
    if (__DEV__) {
      const node = $getNodeByKey(key);
      invariant(
        type === 'text' ? $isTextNode(node) : $isElementNode(node),
        'PointType.set: node with key %s is %s and can not be used for a %s point',
        key,
        node ? node.__type : '[not found]',
        type,
      );
    }
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key);
      }
      if (selection !== null) {
        selection.setCachedNodes(null);
        selection.dirty = true;
      }
    }
  }
}

export function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

function selectPointOnNode(point: PointType, node: LexicalNode): void {
  let key = node.__key;
  let offset = point.offset;
  let type: 'element' | 'text' = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling();
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key;
      offset = 0;
      type = 'text';
    } else {
      const parentNode = node.getParent();
      if (parentNode) {
        key = parentNode.__key;
        offset = node.getIndexWithinParent() + 1;
      }
    }
  }
  point.set(key, offset, type);
}

export function $moveSelectionPointToEnd(
  point: PointType,
  node: LexicalNode,
): void {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else {
    selectPointOnNode(point, node);
  }
}

function $transferStartingElementPointToTextPoint(
  start: ElementPointType,
  end: PointType,
  format: number,
  style: string,
): void {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  textNode.setFormat(format);
  textNode.setStyle(style);
  if ($isParagraphNode(placementNode)) {
    placementNode.splice(0, 0, [textNode]);
  } else {
    const target = $isRootNode(element)
      ? $createParagraphNode().append(textNode)
      : textNode;
    if (placementNode === null) {
      element.append(target);
    } else {
      placementNode.insertBefore(target);
    }
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text');
  }
  start.set(textNode.__key, 0, 'text');
}

export interface BaseSelection {
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  clone(): BaseSelection;
  extract(): Array<LexicalNode>;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
  insertText(text: string): void;
  insertRawText(text: string): void;
  is(selection: null | BaseSelection): boolean;
  insertNodes(nodes: Array<LexicalNode>): void;
  getStartEndPoints(): null | [PointType, PointType];
  isCollapsed(): boolean;
  isBackward(): boolean;
  getCachedNodes(): LexicalNode[] | null;
  setCachedNodes(nodes: LexicalNode[] | null): void;
}

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(objects: Set<NodeKey>) {
    this._cachedNodes = null;
    this._nodes = objects;
    this.dirty = false;
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes;
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes;
  }

  is(selection: null | BaseSelection): boolean {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a: Set<NodeKey> = this._nodes;
    const b: Set<NodeKey> = selection._nodes;
    return a.size === b.size && Array.from(a).every((key) => b.has(key));
  }

  isCollapsed(): boolean {
    return false;
  }

  isBackward(): boolean {
    return false;
  }

  getStartEndPoints(): null {
    return null;
  }

  add(key: NodeKey): void {
    this.dirty = true;
    this._nodes.add(key);
    this._cachedNodes = null;
  }

  delete(key: NodeKey): void {
    this.dirty = true;
    this._nodes.delete(key);
    this._cachedNodes = null;
  }

  clear(): void {
    this.dirty = true;
    this._nodes.clear();
    this._cachedNodes = null;
  }

  has(key: NodeKey): boolean {
    return this._nodes.has(key);
  }

  clone(): NodeSelection {
    return new NodeSelection(new Set(this._nodes));
  }

  extract(): Array<LexicalNode> {
    return this.getNodes();
  }

  insertRawText(text: string): void {
    // Do nothing?
  }

  insertText(): void {
    // Do nothing?
  }

  insertNodes(nodes: Array<LexicalNode>) {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1];
    let selectionAtEnd: RangeSelection;
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select();
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1;
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index);
    }
    selectionAtEnd.insertNodes(nodes);
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove();
    }
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const objects = this._nodes;
    const nodes = [];
    for (const object of objects) {
      const node = $getNodeByKey(object);
      if (node !== null) {
        nodes.push(node);
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  getTextContent(): string {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }

  /**
   * Remove all nodes in the NodeSelection. If there were any nodes,
   * replace the selection with a new RangeSelection at the previous
   * location of the first node.
   */
  deleteNodes(): void {
    const nodes = this.getNodes();
    if (($getSelection() || $getPreviousSelection()) === this && nodes[0]) {
      const firstCaret = $getSiblingCaret(nodes[0], 'next');
      $setSelectionFromCaretRange($getCaretRange(firstCaret, firstCaret));
    }
    for (const node of nodes) {
      node.remove();
    }
  }
}

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection;
}

export class RangeSelection implements BaseSelection {
  format: number;
  style: string;
  anchor: PointType;
  focus: PointType;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(
    anchor: PointType,
    focus: PointType,
    format: number,
    style: string,
  ) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this.format = format;
    this.style = style;
    this.dirty = false;
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes;
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes;
  }

  /**
   * Used to check if the provided selections is equal to this one by value,
   * including anchor, focus, format, and style properties.
   * @param selection - the Selection to compare this one to.
   * @returns true if the Selections are equal, false otherwise.
   */
  is(selection: null | BaseSelection): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return (
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus) &&
      this.format === selection.format &&
      this.style === selection.style
    );
  }

  /**
   * Returns whether the Selection is "collapsed", meaning the anchor and focus are
   * the same node and have the same offset.
   *
   * @returns true if the Selection is collapsed, false otherwise.
   */
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }

  /**
   * Gets all the nodes in the Selection. Uses caching to make it generally suitable
   * for use in hot paths.
   *
   * See also the {@link CaretRange} APIs (starting with
   * {@link $caretRangeFromSelection}), which are likely to provide a better
   * foundation for any operation where partial selection is relevant
   * (e.g. the anchor or focus are inside an ElementNode and TextNode)
   *
   * @returns an Array containing all the nodes in the Selection
   */
  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const range = $getCaretRangeInDirection(
      $caretRangeFromSelection(this),
      'next',
    );
    const nodes = $getNodesFromCaretRangeCompat(range);
    if (__DEV__) {
      if (this.isCollapsed() && nodes.length > 1) {
        invariant(
          false,
          'RangeSelection.getNodes() returned %s > 1 nodes in a collapsed selection',
          String(nodes.length),
        );
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  /**
   * Sets this Selection to be of type "text" at the provided anchor and focus values.
   *
   * @param anchorNode - the anchor node to set on the Selection
   * @param anchorOffset - the offset to set on the Selection
   * @param focusNode - the focus node to set on the Selection
   * @param focusOffset - the focus offset to set on the Selection
   */
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    this.anchor.set(anchorNode.__key, anchorOffset, 'text');
    this.focus.set(focusNode.__key, focusOffset, 'text');
  }

  /**
   * Gets the (plain) text content of all the nodes in the selection.
   *
   * @returns a string representing the text content of all the nodes in the Selection
   */
  getTextContent(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);
    let textContent = '';
    let prevWasElement = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n';
        }
        if (node.isEmpty()) {
          prevWasElement = false;
        } else {
          prevWasElement = true;
        }
      } else {
        prevWasElement = false;
        if ($isTextNode(node)) {
          let text = node.getTextContent();
          if (node === firstNode) {
            if (node === lastNode) {
              if (
                anchor.type !== 'element' ||
                focus.type !== 'element' ||
                focus.offset === anchor.offset
              ) {
                text =
                  anchorOffset < focusOffset
                    ? text.slice(anchorOffset, focusOffset)
                    : text.slice(focusOffset, anchorOffset);
              }
            } else {
              text = isBefore
                ? text.slice(anchorOffset)
                : text.slice(focusOffset);
            }
          } else if (node === lastNode) {
            text = isBefore
              ? text.slice(0, focusOffset)
              : text.slice(0, anchorOffset);
          }
          textContent += text;
        } else if (
          ($isDecoratorNode(node) || $isLineBreakNode(node)) &&
          (node !== lastNode || !this.isCollapsed())
        ) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }

  /**
   * Attempts to map a DOM selection range onto this Lexical Selection,
   * setting the anchor, focus, and type accordingly
   *
   * @param range a DOM Selection range conforming to the StaticRange interface.
   */
  applyDOMRange(range: StaticRange): void {
    const editor = getActiveEditor();
    const currentEditorState = editor.getEditorState();
    const lastSelection = currentEditorState._selection;
    const resolvedSelectionPoints = $internalResolveSelectionPoints(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
      lastSelection,
    );
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints;
    this.anchor.set(
      anchorPoint.key,
      anchorPoint.offset,
      anchorPoint.type,
      true,
    );
    this.focus.set(focusPoint.key, focusPoint.offset, focusPoint.type, true);
    // Firefox will use an element point rather than a text point in some cases,
    // so we normalize for that
    $normalizeSelection(this);
  }

  /**
   * Creates a new RangeSelection, copying over all the property values from this one.
   *
   * @returns a new RangeSelection with the same property values as this one.
   */
  clone(): RangeSelection {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
      this.style,
    );
    return selection;
  }

  /**
   * Toggles the provided format on all the TextNodes in the Selection.
   *
   * @param format a string TextFormatType to toggle on the TextNodes in the selection
   */
  toggleFormat(format: TextFormatType): void {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  /**
   * Sets the value of the format property on the Selection
   *
   * @param format - the format to set at the value of the format property.
   */
  setFormat(format: number): void {
    this.format = format;
    this.dirty = true;
  }

  /**
   * Sets the value of the style property on the Selection
   *
   * @param style - the style to set at the value of the style property.
   */
  setStyle(style: string): void {
    this.style = style;
    this.dirty = true;
  }

  /**
   * Returns whether the provided TextFormatType is present on the Selection. This will be true if any node in the Selection
   * has the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
   */
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection.
   * converts tabs, newlines, and carriage returns into LexicalNodes.
   *
   * @param text the text to insert into the Selection
   */
  insertRawText(text: string): void {
    const parts = text.split(/(\r?\n|\t)/);
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else {
        nodes.push($createTextNode(part));
      }
    }
    this.insertNodes(nodes);
  }

  /**
   * Insert the provided text into the EditorState at the current Selection.
   *
   * @param text the text to insert into the Selection
   */
  insertText(text: string): void {
    // Now that "removeText" has been improved and does not depend on
    // insertText, insertText can be greatly simplified. The next
    // commented version is a WIP (about 5 tests fail).
    //
    // this.removeText();
    // if (text === '') {
    //   return;
    // }
    // const anchorNode = this.anchor.getNode();
    // const textNode = $createTextNode(text);
    // textNode.setFormat(this.format);
    // textNode.setStyle(this.style);
    // if ($isTextNode(anchorNode)) {
    //   const parent = anchorNode.getParentOrThrow();
    //   if (this.anchor.offset === 0) {
    //     if (parent.isInline() && !anchorNode.__prev) {
    //       parent.insertBefore(textNode);
    //     } else {
    //       anchorNode.insertBefore(textNode);
    //     }
    //   } else if (this.anchor.offset === anchorNode.getTextContentSize()) {
    //     if (parent.isInline() && !anchorNode.__next) {
    //       parent.insertAfter(textNode);
    //     } else {
    //       anchorNode.insertAfter(textNode);
    //     }
    //   } else {
    //     const [before] = anchorNode.splitText(this.anchor.offset);
    //     before.insertAfter(textNode);
    //   }
    // } else {
    //   anchorNode.splice(this.anchor.offset, 0, [textNode]);
    // }
    // const nodeToSelect = textNode.isAttached() ? textNode : anchorNode;
    // nodeToSelect.selectEnd();
    // // When composing, we need to adjust the anchor offset so that
    // // we correctly replace that right range.
    // if (
    //   textNode.isComposing() &&
    //   this.anchor.type === 'text' &&
    //   anchorNode.getTextContent() !== ''
    // ) {
    //   this.anchor.offset -= text.length;
    // }

    const anchor = this.anchor;
    const focus = this.focus;
    const format = this.format;
    const style = this.style;
    let firstPoint = anchor;
    let endPoint = focus;
    if (!this.isCollapsed() && focus.isBefore(anchor)) {
      firstPoint = focus;
      endPoint = anchor;
    }
    if (firstPoint.type === 'element') {
      $transferStartingElementPointToTextPoint(
        firstPoint,
        endPoint,
        format,
        style,
      );
    }
    if (endPoint.type === 'element') {
      $setPointFromCaret(
        endPoint,
        $normalizeCaret($caretFromPoint(endPoint, 'next')),
      );
    }
    const startOffset = firstPoint.offset;
    let endOffset = endPoint.offset;
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    let firstNode: TextNode = selectedNodes[0] as TextNode;

    if (!$isTextNode(firstNode)) {
      invariant(false, 'insertText: first node is not a text node');
    }
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const firstNodeParent = firstNode.getParentOrThrow();
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];

    if (selectedNodesLength === 1 && endPoint.type === 'element') {
      endOffset = firstNodeTextLength;
      endPoint.set(firstPoint.key, endOffset, 'text');
    }

    if (
      this.isCollapsed() &&
      startOffset === firstNodeTextLength &&
      ($isTokenOrSegmented(firstNode) ||
        !firstNode.canInsertTextAfter() ||
        (!firstNodeParent.canInsertTextAfter() &&
          firstNode.getNextSibling() === null))
    ) {
      let nextSibling = firstNode.getNextSibling<TextNode>();
      if (
        !$isTextNode(nextSibling) ||
        !nextSibling.canInsertTextBefore() ||
        $isTokenOrSegmented(nextSibling)
      ) {
        nextSibling = $createTextNode();
        nextSibling.setFormat(format);
        nextSibling.setStyle(style);
        if (!firstNodeParent.canInsertTextAfter()) {
          firstNodeParent.insertAfter(nextSibling);
        } else {
          firstNode.insertAfter(nextSibling);
        }
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (
      this.isCollapsed() &&
      startOffset === 0 &&
      ($isTokenOrSegmented(firstNode) ||
        !firstNode.canInsertTextBefore() ||
        (!firstNodeParent.canInsertTextBefore() &&
          firstNode.getPreviousSibling() === null))
    ) {
      let prevSibling = firstNode.getPreviousSibling<TextNode>();
      if (!$isTextNode(prevSibling) || $isTokenOrSegmented(prevSibling)) {
        prevSibling = $createTextNode();
        prevSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextBefore()) {
          firstNodeParent.insertBefore(prevSibling);
        } else {
          firstNode.insertBefore(prevSibling);
        }
      }
      prevSibling.select();
      firstNode = prevSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (firstNode.isSegmented() && startOffset !== firstNodeTextLength) {
      const textNode = $createTextNode(firstNode.getTextContent());
      textNode.setFormat(format);
      firstNode.replace(textNode);
      firstNode = textNode;
    } else if (!this.isCollapsed() && text !== '') {
      // When the firstNode or lastNode parents are elements that
      // do not allow text to be inserted before or after, we first
      // clear the content. Then we normalize selection, then insert
      // the new content.
      const lastNodeParent = lastNode.getParent();

      if (
        !firstNodeParent.canInsertTextBefore() ||
        !firstNodeParent.canInsertTextAfter() ||
        ($isElementNode(lastNodeParent) &&
          (!lastNodeParent.canInsertTextBefore() ||
            !lastNodeParent.canInsertTextAfter()))
      ) {
        this.insertText('');
        $normalizeSelectionPointsForBoundaries(this.anchor, this.focus, null);
        this.insertText(text);
        return;
      }
    }

    if (selectedNodesLength === 1) {
      if ($isTokenOrTab(firstNode)) {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const firstNodeFormat = firstNode.getFormat();
      const firstNodeStyle = firstNode.getStyle();

      if (
        startOffset === endOffset &&
        (firstNodeFormat !== format || firstNodeStyle !== style)
      ) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format);
          firstNode.setStyle(style);
        } else {
          const textNode = $createTextNode(text);
          textNode.setFormat(format);
          textNode.setStyle(style);
          textNode.select();
          if (startOffset === 0) {
            firstNode.insertBefore(textNode, false);
          } else {
            const [targetNode] = firstNode.splitText(startOffset);
            targetNode.insertAfter(textNode, false);
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length;
          }
          return;
        }
      } else if ($isTabNode(firstNode)) {
        // We don't need to check for delCount because there is only the entire selected node case
        // that can hit here for content size 1 and with canInsertTextBeforeAfter false
        const textNode = $createTextNode(text);
        textNode.setFormat(format);
        textNode.setStyle(style);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const delCount = endOffset - startOffset;

      firstNode = firstNode.spliceText(startOffset, delCount, text, true);
      if (firstNode.getTextContent() === '') {
        firstNode.remove();
      } else if (this.anchor.type === 'text') {
        if (firstNode.isComposing()) {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        } else {
          this.format = firstNodeFormat;
          this.style = firstNodeStyle;
        }
      }
    } else {
      const markedNodeKeysForKeep = new Set([
        ...firstNode.getParentKeys(),
        ...lastNode.getParentKeys(),
      ]);

      // We have to get the parent elements before the next section,
      // as in that section we might mutate the lastNode.
      const firstElement = $isElementNode(firstNode)
        ? firstNode
        : firstNode.getParentOrThrow();
      let lastElement = $isElementNode(lastNode)
        ? lastNode
        : lastNode.getParentOrThrow();
      let lastElementChild = lastNode;

      // If the last element is inline, we should instead look at getting
      // the nodes of its parent, rather than itself. This behavior will
      // then better match how text node insertions work. We will need to
      // also update the last element's child accordingly as we do this.
      if (!firstElement.is(lastElement) && lastElement.isInline()) {
        // Keep traversing till we have a non-inline element parent.
        do {
          lastElementChild = lastElement;
          lastElement = lastElement.getParentOrThrow();
        } while (lastElement.isInline());
      }

      // Handle mutations to the last node.
      if (
        (endPoint.type === 'text' &&
          (endOffset !== 0 || lastNode.getTextContent() === '')) ||
        (endPoint.type === 'element' &&
          lastNode.getIndexWithinParent() < endOffset)
      ) {
        if (
          $isTextNode(lastNode) &&
          !$isTokenOrTab(lastNode) &&
          endOffset !== lastNode.getTextContentSize()
        ) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent());
            lastNode.replace(textNode);
            lastNode = textNode;
          }
          // root node selections only select whole nodes, so no text splice is necessary
          if (!$isRootNode(endPoint.getNode()) && endPoint.type === 'text') {
            lastNode = (lastNode as TextNode).spliceText(0, endOffset, '');
          }
          markedNodeKeysForKeep.add(lastNode.__key);
        } else {
          const lastNodeParent = lastNode.getParentOrThrow();
          if (
            !lastNodeParent.canBeEmpty() &&
            lastNodeParent.getChildrenSize() === 1
          ) {
            lastNodeParent.remove();
          } else {
            lastNode.remove();
          }
        }
      } else {
        markedNodeKeysForKeep.add(lastNode.__key);
      }

      // Either move the remaining nodes of the last parent to after
      // the first child, or remove them entirely. If the last parent
      // is the same as the first parent, this logic also works.
      const lastNodeChildren = lastElement.getChildren();
      const selectedNodesSet = new Set(selectedNodes);
      const firstAndLastElementsAreEqual = firstElement.is(lastElement);

      // We choose a target to insert all nodes after. In the case of having
      // and inline starting parent element with a starting node that has no
      // siblings, we should insert after the starting parent element, otherwise
      // we will incorrectly merge into the starting parent element.
      // TODO: should we keep on traversing parents if we're inside another
      // nested inline element?
      const insertionTarget =
        firstElement.isInline() && firstNode.getNextSibling() === null
          ? firstElement
          : firstNode;

      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i];

        if (
          lastNodeChild.is(firstNode) ||
          ($isElementNode(lastNodeChild) && lastNodeChild.isParentOf(firstNode))
        ) {
          break;
        }

        if (lastNodeChild.isAttached()) {
          if (
            !selectedNodesSet.has(lastNodeChild) ||
            lastNodeChild.is(lastElementChild)
          ) {
            if (!firstAndLastElementsAreEqual) {
              insertionTarget.insertAfter(lastNodeChild, false);
            }
          } else {
            lastNodeChild.remove();
          }
        }
      }

      if (!firstAndLastElementsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent: ElementNode | null = lastElement;
        let lastRemovedParent = null;

        while (parent !== null) {
          const children = parent.getChildren();
          const childrenLength = children.length;
          if (
            childrenLength === 0 ||
            children[childrenLength - 1].is(lastRemovedParent)
          ) {
            markedNodeKeysForKeep.delete(parent.__key);
            lastRemovedParent = parent;
          }
          parent = parent.getParent();
        }
      }

      // Ensure we do splicing after moving of nodes, as splicing
      // can have side-effects (in the case of hashtags).
      if (!$isTokenOrTab(firstNode)) {
        firstNode = firstNode.spliceText(
          startOffset,
          firstNodeTextLength - startOffset,
          text,
          true,
        );
        if (firstNode.getTextContent() === '') {
          firstNode.remove();
        } else if (firstNode.isComposing() && this.anchor.type === 'text') {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        }
      } else if (startOffset === firstNodeTextLength) {
        firstNode.select();
      } else {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
      }

      // Remove all selected nodes that haven't already been removed.
      for (let i = 1; i < selectedNodesLength; i++) {
        const selectedNode = selectedNodes[i];
        const key = selectedNode.__key;
        if (!markedNodeKeysForKeep.has(key)) {
          selectedNode.remove();
        }
      }
    }
  }

  /**
   * Removes the text in the Selection, adjusting the EditorState accordingly.
   */
  removeText(): void {
    const isCurrentSelection = $getSelection() === this;
    const newRange = $removeTextFromCaretRange($caretRangeFromSelection(this));
    $updateRangeSelectionFromCaretRange(this, newRange);
    if (isCurrentSelection && $getSelection() !== this) {
      $setSelection(this);
    }
  }

  // TO-DO: Migrate this method to the new utility function $forEachSelectedTextNode (share similar logic)
  /**
   * Applies the provided format to the TextNodes in the Selection, splitting or
   * merging nodes as necessary.
   *
   * @param formatType the format type to apply to the nodes in the Selection.
   * @param alignWithFormat a 32-bit integer representing formatting flags to align with.
   */
  formatText(
    formatType: TextFormatType,
    alignWithFormat: number | null = null,
  ): void {
    if (this.isCollapsed()) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }

    const selectedNodes = this.getNodes();
    const selectedTextNodes: Array<TextNode> = [];
    for (const selectedNode of selectedNodes) {
      if ($isTextNode(selectedNode)) {
        selectedTextNodes.push(selectedNode);
      }
    }
    const applyFormatToElements = (alignWith: number | null) => {
      selectedNodes.forEach((node) => {
        if ($isElementNode(node)) {
          const newFormat = node.getFormatFlags(formatType, alignWith);
          node.setTextFormat(newFormat);
        }
      });
    };

    const selectedTextNodesLength = selectedTextNodes.length;
    if (selectedTextNodesLength === 0) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      applyFormatToElements(alignWithFormat);
      return;
    }

    const anchor = this.anchor;
    const focus = this.focus;
    const isBackward = this.isBackward();
    const startPoint = isBackward ? focus : anchor;
    const endPoint = isBackward ? anchor : focus;

    let firstIndex = 0;
    let firstNode = selectedTextNodes[0];
    let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset;

    // In case selection started at the end of text node use next text node
    if (
      startPoint.type === 'text' &&
      startOffset === firstNode.getTextContentSize()
    ) {
      firstIndex = 1;
      firstNode = selectedTextNodes[1];
      startOffset = 0;
    }

    if (firstNode == null) {
      return;
    }

    const firstNextFormat = firstNode.getFormatFlags(
      formatType,
      alignWithFormat,
    );
    applyFormatToElements(firstNextFormat);

    const lastIndex = selectedTextNodesLength - 1;
    let lastNode = selectedTextNodes[lastIndex];
    const endOffset =
      endPoint.type === 'text'
        ? endPoint.offset
        : lastNode.getTextContentSize();

    // Single node selected
    if (firstNode.is(lastNode)) {
      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }
      // The entire node is selected or it is token, so just format it
      if (
        $isTokenOrSegmented(firstNode) ||
        (startOffset === 0 && endOffset === firstNode.getTextContentSize())
      ) {
        firstNode.setFormat(firstNextFormat);
      } else {
        // Node is partially selected, so split it into two nodes
        // add style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFormat(firstNextFormat);

        // Update selection only if starts/ends on text node
        if (startPoint.type === 'text') {
          startPoint.set(replacement.__key, 0, 'text');
        }
        if (endPoint.type === 'text') {
          endPoint.set(replacement.__key, endOffset - startOffset, 'text');
        }
      }

      this.format = firstNextFormat;

      return;
    }
    // Multiple nodes selected
    // The entire first node isn't selected, so split it
    if (startOffset !== 0 && !$isTokenOrSegmented(firstNode)) {
      [, firstNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFormat(firstNextFormat);

    const lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat);
    // If the offset is 0, it means no actual characters are selected,
    // so we skip formatting the last node altogether.
    if (endOffset > 0) {
      if (
        endOffset !== lastNode.getTextContentSize() &&
        !$isTokenOrSegmented(lastNode)
      ) {
        [lastNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFormat(lastNextFormat);
    }

    // Process all text nodes in between
    for (let i = firstIndex + 1; i < lastIndex; i++) {
      const textNode = selectedTextNodes[i];
      const nextFormat = textNode.getFormatFlags(formatType, lastNextFormat);
      textNode.setFormat(nextFormat);
    }

    // Update selection only if starts/ends on text node
    if (startPoint.type === 'text') {
      startPoint.set(firstNode.__key, startOffset, 'text');
    }
    if (endPoint.type === 'text') {
      endPoint.set(lastNode.__key, endOffset, 'text');
    }

    this.format = firstNextFormat | lastNextFormat;
  }

  /**
   * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
   * current Selection according to a set of heuristics that determine how surrounding nodes
   * should be changed, replaced, or moved to accommodate the incoming ones.
   *
   * @param nodes - the nodes to insert
   */
  insertNodes(nodes: Array<LexicalNode>): void {
    if (nodes.length === 0) {
      return;
    }
    if (!this.isCollapsed()) {
      this.removeText();
    }
    if (this.anchor.key === 'root') {
      this.insertParagraph();
      const selection = $getSelection();
      invariant(
        $isRangeSelection(selection),
        'Expected RangeSelection after insertParagraph',
      );
      return selection.insertNodes(nodes);
    }

    const firstPoint = this.isBackward() ? this.focus : this.anchor;
    const firstNode = firstPoint.getNode();
    const firstBlock = $findMatchingParent(firstNode, INTERNAL_$isBlock);

    const last = nodes[nodes.length - 1]!;

    // CASE 1: insert inside a code block
    if ($isElementNode(firstBlock) && '__language' in firstBlock) {
      if ('__language' in nodes[0]) {
        this.insertText(nodes[0].getTextContent());
      } else {
        const index = $removeTextAndSplitBlock(this);
        firstBlock.splice(index, 0, nodes);
        last.selectEnd();
      }
      return;
    }

    // CASE 2: All elements of the array are inline
    const notInline = (node: LexicalNode) =>
      ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();

    if (!nodes.some(notInline)) {
      invariant(
        $isElementNode(firstBlock),
        'Expected node %s of type %s to have a block ElementNode ancestor',
        firstNode.constructor.name,
        firstNode.getType(),
      );
      const index = $removeTextAndSplitBlock(this);
      firstBlock.splice(index, 0, nodes);
      last.selectEnd();
      return;
    }

    // CASE 3: At least 1 element of the array is not inline
    const blocksParent = $wrapInlineNodes(nodes);
    const nodeToSelect = blocksParent.getLastDescendant()!;
    const blocks = blocksParent.getChildren();
    const isMergeable = (node: LexicalNode): node is ElementNode =>
      $isElementNode(node) &&
      INTERNAL_$isBlock(node) &&
      !node.isEmpty() &&
      $isElementNode(firstBlock) &&
      (!firstBlock.isEmpty() || firstBlock.canMergeWhenEmpty());

    const shouldInsert = !$isElementNode(firstBlock) || !firstBlock.isEmpty();
    const insertedParagraph = shouldInsert ? this.insertParagraph() : null;
    const lastToInsert: LexicalNode | undefined = blocks[blocks.length - 1];
    let firstToInsert: LexicalNode | undefined = blocks[0];
    if (isMergeable(firstToInsert)) {
      invariant(
        $isElementNode(firstBlock),
        'Expected node %s of type %s to have a block ElementNode ancestor',
        firstNode.constructor.name,
        firstNode.getType(),
      );
      firstBlock.append(...firstToInsert.getChildren());
      firstToInsert = blocks[1];
    }
    if (firstToInsert) {
      invariant(
        firstBlock !== null,
        'Expected node %s of type %s to have a block ancestor',
        firstNode.constructor.name,
        firstNode.getType(),
      );
      insertRangeAfter(firstBlock, firstToInsert);
    }
    const lastInsertedBlock = $findMatchingParent(
      nodeToSelect,
      INTERNAL_$isBlock,
    );

    if (
      insertedParagraph &&
      $isElementNode(lastInsertedBlock) &&
      (insertedParagraph.canMergeWhenEmpty() || INTERNAL_$isBlock(lastToInsert))
    ) {
      lastInsertedBlock.append(...insertedParagraph.getChildren());
      insertedParagraph.remove();
    }
    if ($isElementNode(firstBlock) && firstBlock.isEmpty()) {
      firstBlock.remove();
    }

    nodeToSelect.selectEnd();

    // To understand this take a look at the test "can wrap post-linebreak nodes into new element"
    const lastChild = $isElementNode(firstBlock)
      ? firstBlock.getLastChild()
      : null;
    if ($isLineBreakNode(lastChild) && lastInsertedBlock !== firstBlock) {
      lastChild.remove();
    }
  }

  /**
   * Inserts a new ParagraphNode into the EditorState at the current Selection
   *
   * @returns the newly inserted node.
   */
  insertParagraph(): ElementNode | null {
    if (this.anchor.key === 'root') {
      const paragraph = $createParagraphNode();
      $getRoot().splice(this.anchor.offset, 0, [paragraph]);
      paragraph.select();
      return paragraph;
    }
    const index = $removeTextAndSplitBlock(this);
    const block = $findMatchingParent(this.anchor.getNode(), INTERNAL_$isBlock);
    invariant(
      $isElementNode(block),
      'Expected ancestor to be a block ElementNode',
    );
    const firstToAppend = block.getChildAtIndex(index);
    const nodesToInsert = firstToAppend
      ? [firstToAppend, ...firstToAppend.getNextSiblings()]
      : [];
    const newBlock = block.insertNewAfter(this, false) as ElementNode | null;
    if (newBlock) {
      newBlock.append(...nodesToInsert);
      newBlock.selectStart();
      return newBlock;
    }
    // if newBlock is null, it means that block is of type CodeNode.
    return null;
  }

  /**
   * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
   * current Selection.
   */
  insertLineBreak(selectStart?: boolean): void {
    const lineBreak = $createLineBreakNode();
    this.insertNodes([lineBreak]);
    // this is used in MacOS with the command 'ctrl-O' (openLineBreak)
    if (selectStart) {
      const parent = lineBreak.getParentOrThrow();
      const index = lineBreak.getIndexWithinParent();
      parent.select(index, index);
    }
  }

  /**
   * Extracts the nodes in the Selection, splitting nodes where necessary
   * to get offset-level precision.
   *
   * @returns The nodes in the Selection
   */
  extract(): Array<LexicalNode> {
    const selectedNodes = [...this.getNodes()];
    const selectedNodesLength = selectedNodes.length;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[selectedNodesLength - 1];
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);
    const isBackward = this.isBackward();
    const [startPoint, endPoint] = isBackward
      ? [this.focus, this.anchor]
      : [this.anchor, this.focus];
    const [startOffset, endOffset] = isBackward
      ? [focusOffset, anchorOffset]
      : [anchorOffset, focusOffset];

    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        if (node) {
          startPoint.set(node.getKey(), 0, 'text');
          endPoint.set(node.getKey(), node.getTextContentSize(), 'text');
          return [node];
        }
        return [];
      }
      return [firstNode];
    }

    if ($isTextNode(firstNode)) {
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift();
      } else if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        selectedNodes[0] = firstNode;
        startPoint.set(firstNode.getKey(), 0, 'text');
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      if (endOffset === 0) {
        selectedNodes.pop();
      } else if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
        selectedNodes[selectedNodes.length - 1] = lastNode;
        endPoint.set(lastNode.getKey(), lastNode.getTextContentSize(), 'text');
      }
    }
    return selectedNodes;
  }

  /**
   * Modifies the Selection according to the parameters and a set of heuristics that account for
   * various node types. Can be used to safely move or extend selection by one logical "unit" without
   * dealing explicitly with all the possible node types.
   *
   * @param alter the type of modification to perform
   * @param isBackward whether or not selection is backwards
   * @param granularity the granularity at which to apply the modification
   */
  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void {
    if (
      $modifySelectionAroundDecoratorsAndBlocks(
        this,
        alter,
        isBackward,
        granularity,
      )
    ) {
      return;
    }
    const collapse = alter === 'move';

    const editor = getActiveEditor();
    const domSelection = getDOMSelection(getWindow(editor));

    if (!domSelection) {
      return;
    }
    const blockCursorElement = editor._blockCursorElement;
    const rootElement = editor._rootElement;
    const focusNode = this.focus.getNode();
    // Remove the block cursor element if it exists. This will ensure selection
    // works as intended. If we leave it in the DOM all sorts of strange bugs
    // occur. :/
    if (
      rootElement !== null &&
      blockCursorElement !== null &&
      $isElementNode(focusNode) &&
      !focusNode.isInline() &&
      !focusNode.canBeEmpty()
    ) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
    }
    if (this.dirty) {
      let nextAnchorDOM: HTMLElement | Text | null = getElementByKeyOrThrow(
        editor,
        this.anchor.key,
      );
      let nextFocusDOM: HTMLElement | Text | null = getElementByKeyOrThrow(
        editor,
        this.focus.key,
      );
      if (this.anchor.type === 'text') {
        nextAnchorDOM = getDOMTextNode(nextAnchorDOM);
      }
      if (this.focus.type === 'text') {
        nextFocusDOM = getDOMTextNode(nextFocusDOM);
      }
      if (nextAnchorDOM && nextFocusDOM) {
        setDOMSelectionBaseAndExtent(
          domSelection,
          nextAnchorDOM,
          this.anchor.offset,
          nextFocusDOM,
          this.focus.offset,
        );
      }
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    moveNativeSelection(
      domSelection,
      alter,
      isBackward ? 'backward' : 'forward',
      granularity,
    );
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      const anchorNode = this.anchor.getNode();
      const root = $isRootNode(anchorNode)
        ? anchorNode
        : $getNearestRootOrShadowRoot(anchorNode);
      this.applyDOMRange(range);
      this.dirty = true;
      if (!collapse) {
        // Validate selection; make sure that the new extended selection respects shadow roots
        const nodes = this.getNodes();
        const validNodes = [];
        let shrinkSelection = false;
        for (let i = 0; i < nodes.length; i++) {
          const nextNode = nodes[i];
          if ($hasAncestor(nextNode, root)) {
            validNodes.push(nextNode);
          } else {
            shrinkSelection = true;
          }
        }
        if (shrinkSelection && validNodes.length > 0) {
          // validNodes length check is a safeguard against an invalid selection; as getNodes()
          // will return an empty array in this case
          if (isBackward) {
            const firstValidNode = validNodes[0];
            if ($isElementNode(firstValidNode)) {
              firstValidNode.selectStart();
            } else {
              firstValidNode.getParentOrThrow().selectStart();
            }
          } else {
            const lastValidNode = validNodes[validNodes.length - 1];
            if ($isElementNode(lastValidNode)) {
              lastValidNode.selectEnd();
            } else {
              lastValidNode.getParentOrThrow().selectEnd();
            }
          }
        }

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically.
        if (
          domSelection.anchorNode !== range.startContainer ||
          domSelection.anchorOffset !== range.startOffset
        ) {
          $swapPoints(this);
        }
      }
    }
    if (granularity === 'lineboundary') {
      $modifySelectionAroundDecoratorsAndBlocks(
        this,
        alter,
        isBackward,
        granularity,
        'decorators',
      );
    }
  }
  /**
   * Helper for handling forward character and word deletion that prevents element nodes
   * like a table, columns layout being destroyed
   *
   * @param anchor the anchor
   * @param anchorNode the anchor node in the selection
   * @param isBackward whether or not selection is backwards
   */
  forwardDeletion(
    anchor: PointType,
    anchorNode: TextNode | ElementNode,
    isBackward: boolean,
  ): boolean {
    if (
      !isBackward &&
      // Delete forward handle case
      ((anchor.type === 'element' &&
        $isElementNode(anchorNode) &&
        anchor.offset === anchorNode.getChildrenSize()) ||
        (anchor.type === 'text' &&
          anchor.offset === anchorNode.getTextContentSize()))
    ) {
      const parent = anchorNode.getParent();
      const nextSibling =
        anchorNode.getNextSibling() ||
        (parent === null ? null : parent.getNextSibling());

      if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Performs one logical character deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteCharacter(isBackward: boolean): void {
    const wasCollapsed = this.isCollapsed();
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      let anchorNode: TextNode | ElementNode | null = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return;
      }
      const direction = isBackward ? 'previous' : 'next';
      const initialCaret = $caretFromPoint(anchor, direction);
      const initialRange = $extendCaretToRange(initialCaret);
      if (
        initialRange
          .getTextSlices()
          .every((slice) => slice === null || slice.distance === 0)
      ) {
        // There's no text in the direction of the deletion so we can explore our options
        let state:
          | {type: 'initial'}
          | {
              type: 'merge-next-block';
              block: ElementNode;
            }
          | {
              type: 'merge-block';
              caret: ChildCaret<ElementNode, typeof direction>;
              block: ElementNode;
            } = {type: 'initial'};
        for (const caret of initialRange.iterNodeCarets('shadowRoot')) {
          if ($isChildCaret(caret)) {
            if (caret.origin.isInline()) {
              // fall through when descending an inline
            } else if (caret.origin.isShadowRoot()) {
              if (state.type === 'merge-block') {
                break;
              }
              // Don't merge with a shadow root block
              if (
                $isElementNode(initialRange.anchor.origin) &&
                initialRange.anchor.origin.isEmpty()
              ) {
                // delete an empty paragraph like the DecoratorNode case
                const normCaret = $normalizeCaret(caret);
                $updateRangeSelectionFromCaretRange(
                  this,
                  $getCaretRange(normCaret, normCaret),
                );
                initialRange.anchor.origin.remove();
              }
              return;
            } else if (
              state.type === 'merge-next-block' ||
              state.type === 'merge-block'
            ) {
              // Keep descending ChildCaret to find which block to merge with
              state = {block: state.block, caret, type: 'merge-block'};
            }
          } else if (state.type === 'merge-block') {
            break;
          } else if ($isSiblingCaret(caret)) {
            if ($isElementNode(caret.origin)) {
              if (!caret.origin.isInline()) {
                state = {block: caret.origin, type: 'merge-next-block'};
              } else if (!caret.origin.isParentOf(initialRange.anchor.origin)) {
                break;
              }
              continue;
            } else if ($isDecoratorNode(caret.origin)) {
              if (caret.origin.isIsolated()) {
                // do nothing, shouldn't delete an isolated decorator
              } else if (
                state.type === 'merge-next-block' &&
                (caret.origin.isKeyboardSelectable() ||
                  !caret.origin.isInline()) &&
                $isElementNode(initialRange.anchor.origin) &&
                initialRange.anchor.origin.isEmpty()
              ) {
                // If the anchor is an empty element that is adjacent to a
                // decorator then we remove the paragraph and select the
                // decorator
                initialRange.anchor.origin.remove();
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(caret.origin.getKey());
                $setSelection(nodeSelection);
              } else {
                // When the anchor is not an empty element then the
                // adjacent decorator is removed
                caret.origin.remove();
              }
              // always stop when a decorator is encountered
              return;
            }
            break;
          }
        }
        if (state.type === 'merge-block') {
          const {caret, block} = state;
          $updateRangeSelectionFromCaretRange(
            this,
            $getCaretRange(
              !caret.origin.isEmpty() && block.isEmpty()
                ? $rewindSiblingCaret($getSiblingCaret(block, caret.direction))
                : initialRange.anchor,
              caret,
            ),
          );
          return this.removeText();
        }
      }

      // Handle the deletion around decorators.
      const focus = this.focus;
      this.modify('extend', isBackward, 'character');

      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null;
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null;

        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset;
          const textContentSize = focusNode.getTextContentSize();
          if (
            focusNode.is(anchorNode) ||
            (isBackward && offset !== textContentSize) ||
            (!isBackward && offset !== 0)
          ) {
            $removeSegment(focusNode, isBackward, offset);
            return;
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset;
          const textContentSize = anchorNode.getTextContentSize();
          if (
            anchorNode.is(focusNode) ||
            (isBackward && offset !== 0) ||
            (!isBackward && offset !== textContentSize)
          ) {
            $removeSegment(anchorNode, isBackward, offset);
            return;
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward);
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        if ($collapseAtStart(this, anchor.getNode())) {
          return;
        }
      }
    }
    this.removeText();
    if (
      isBackward &&
      !wasCollapsed &&
      this.isCollapsed() &&
      this.anchor.type === 'element' &&
      this.anchor.offset === 0
    ) {
      const anchorNode = this.anchor.getNode();
      if (
        anchorNode.isEmpty() &&
        $isRootNode(anchorNode.getParent()) &&
        anchorNode.getPreviousSibling() === null
      ) {
        $collapseAtStart(this, anchorNode);
      }
    }
  }

  /**
   * Performs one logical line deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteLine(isBackward: boolean): void {
    if (this.isCollapsed()) {
      this.modify('extend', isBackward, 'lineboundary');
    }
    if (this.isCollapsed()) {
      // If the selection was already collapsed at the lineboundary,
      // use the deleteCharacter operation to handle all of the logic associated
      // with navigating through the parent element
      this.deleteCharacter(isBackward);
    } else {
      this.removeText();
    }
  }

  /**
   * Performs one logical word deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteWord(isBackward: boolean): void {
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const anchorNode: TextNode | ElementNode | null = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return;
      }
      this.modify('extend', isBackward, 'word');
    }
    this.removeText();
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  getStartEndPoints(): null | [PointType, PointType] {
    return [this.anchor, this.focus];
  }
}

export function $isNodeSelection(x: unknown): x is NodeSelection {
  return x instanceof NodeSelection;
}

function getCharacterOffset(point: PointType): number {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }

  const parent = point.getNode();
  return offset === parent.getChildrenSize()
    ? parent.getTextContent().length
    : 0;
}

export function $getCharacterOffsets(
  selection: BaseSelection,
): [number, number] {
  const anchorAndFocus = selection.getStartEndPoints();
  if (anchorAndFocus === null) {
    return [0, 0];
  }
  const [anchor, focus] = anchorAndFocus;
  if (
    anchor.type === 'element' &&
    focus.type === 'element' &&
    anchor.key === focus.key &&
    anchor.offset === focus.offset
  ) {
    return [0, 0];
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)];
}

function $collapseAtStart(
  selection: RangeSelection,
  startNode: LexicalNode,
): boolean {
  for (
    let node: null | LexicalNode = startNode;
    node;
    node = node.getParent()
  ) {
    if ($isElementNode(node)) {
      if (node.collapseAtStart(selection)) {
        return true;
      }
      if ($isRootOrShadowRoot(node)) {
        break;
      }
    }
    if (node.getPreviousSibling()) {
      break;
    }
  }
  return false;
}

function $swapPoints(selection: RangeSelection): void {
  const focus = selection.focus;
  const anchor = selection.anchor;
  const anchorKey = anchor.key;
  const anchorOffset = anchor.offset;
  const anchorType = anchor.type;

  anchor.set(focus.key, focus.offset, focus.type, true);
  focus.set(anchorKey, anchorOffset, anchorType, true);
}

function moveNativeSelection(
  domSelection: Selection,
  alter: 'move' | 'extend',
  direction: 'backward' | 'forward' | 'left' | 'right',
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity);
}

/**
 * Called by `RangeSelection.deleteCharacter` to determine if
 * `this.modify('extend', isBackward, 'character')` extended the selection
 * further than a user would expect for that operation.
 *
 * A short(?) JavaScript string vs. Unicode primer:
 *
 * Strings in JavaScript use an UTF-16 encoding, and the offsets into a
 * string are based on those UTF-16 *code units*. This is basically a
 * historical mistake (though logical at that time, decades ago), but
 * can never really be fixed for compatibility reasons.
 *
 * In Unicode, a *code point* is the combination of one or more *code units*.
 * and the range of a *code point* can fit into 21 bits.
 *
 * Every valid *code point* can be represented with one or two
 * *UTF-16 code units*. One unit is used when the code point is in the
 * Basic Multilingual Plane (BMP) and is `< 0xFFFF`. Anything outside
 * of that plane is encoded with a *surrogate pair* of *code units* and
 * `/[\uD800-\uDBFF][\uDC00-\uDFFF]/` is a regex that you could use to
 * find any valid *surrogate pair*. As far as Unicode is concerned, these
 * pairs represent a single *code point*, but in JavaScript, these pairs
 * have a length of 2 (`pair.charCodeAt(n)` is really returning a
 * UTF-16 *code unit*, not a unicode *code point*). It is possible to request
 * a *code point* with `pair.codePointAt(0)` and enumerate code points
 * in a string with `[...string]` but the offsets we work with, and
 * the string length, are based in *code units* so that functionality
 * is unfortunately not very useful here.
 *
 * This only gets us as far as *code points*. We now know that we must
 * consider that each *code point* can have a length of 1 or 2 in JavaScript
 * string distance. It gets even trickier because the visual representation
 * of a character is a *grapheme* (approximately what the user thinks of
 * as a character). A *grapheme* is one or more *code points*, and can
 * essentially be arbitrarily long, as there are many ways to combine
 * them.
 *
 * The `this.modify(…)` call has already extended our selection by one
 * *grapheme* in the direction we want to delete. Sounds great, it's done
 * a lot of awfully tricky work for us because this functionality has only
 * recently become available in JavaScript via `Intl.Segmenter`. The
 * problem is that in many cases the expected behavior of backspace or
 * delete is *not always to delete a whole grapheme*. In some languages
 * it's always expected that backspace ought to delete one code point, not the
 * whole grapheme. In other situations such as emoji that use variation
 * selectors you *do* want to delete the whole *grapheme*.
 *
 * In a few situations the behavior is even application dependent, such as
 * with latin languages where you have multiple ways to represent the same
 * character visually (e.g. a letter with an accent in one code point, or a
 * letter followed by a combining mark in a second code point); some apps will
 * delete the whole grapheme and others will delete only the combining mark,
 * probably based on whether they perform some sort of *normalization* on their
 * input to ensure that only one form is used when two sequences of code points
 * can represent the same visual character. Lexical currently chooses not
 * to perform any normalization so this type of combining marks will be
 * deleted as a *code point* without deleting the whole *grapheme*.
 *
 * See also:
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-2/#G25564
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/#G30602
 * https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/#G49537
 * https://mathiasbynens.be/notes/javascript-unicode
 */
function $updateCaretSelectionForUnicodeCharacter(
  selection: RangeSelection,
  isBackward: boolean,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  if (
    anchorNode === focusNode &&
    anchor.type === 'text' &&
    focus.type === 'text'
  ) {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;

    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (shouldDeleteExactlyOneCodeUnit(text)) {
        if (isBackward) {
          focus.set(focus.key, characterOffset, focus.type);
        } else {
          anchor.set(anchor.key, characterOffset, anchor.type);
        }
      }
    }
  }
}

function shouldDeleteExactlyOneCodeUnit(text: string) {
  if (__DEV__) {
    invariant(
      text.length > 1,
      'shouldDeleteExactlyOneCodeUnit: expecting to be called only with sequences of two or more code units',
    );
  }
  return !(doesContainSurrogatePair(text) || doesContainEmoji(text));
}

/**
 * Given the wall of text in $updateCaretSelectionForUnicodeCharacter, you'd
 * think that the solution might be complex, but the only currently known
 * cases given the above constraints where we want to delete a whole grapheme
 * are when emoji is involved. Since ES6 we can use unicode character classes
 * in regexp which makes this simple.
 *
 * It may make sense to add to this heuristic in the future if other
 * edge cases are discovered, which is why detailed notes remain.
 *
 * This is implemented with runtime feature detection and will always
 * return false on pre-2020 platforms that do not have unicode character
 * class support.
 */
const doesContainEmoji: (text: string) => boolean = (() => {
  try {
    const re = new RegExp('\\p{Emoji}', 'u');
    const test = re.test.bind(re);
    // Sanity check a few emoji to make sure the regexp was parsed
    // and works correctly. Any one of these should be sufficient,
    // but they're cheap and it only runs once.
    if (
      // Emoji in the BMP (heart) with variation selector
      test('\u2764\ufe0f') &&
      // Emoji in the BMP (#) with variation selector
      test('#\ufe0f\u20e3') &&
      // Emoji outside the BMP (thumbs up) that is encoded with a surrogate pair
      test('\ud83d\udc4d')
    ) {
      return test;
    }
  } catch (_e) {
    // SyntaxError
  }
  // fallback, surrogate pair already checked
  return () => false;
})();

function $removeSegment(
  node: TextNode,
  isBackward: boolean,
  offset: number,
): void {
  const textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/(?=\s)/g);
  const splitLength = split.length;
  let segmentOffset = 0;
  let restoreOffset: number | undefined = 0;

  for (let i = 0; i < splitLength; i++) {
    const text = split[i];
    const isLast = i === splitLength - 1;
    restoreOffset = segmentOffset;
    segmentOffset += text.length;

    if (
      (isBackward && segmentOffset === offset) ||
      segmentOffset > offset ||
      isLast
    ) {
      split.splice(i, 1);
      if (isLast) {
        restoreOffset = undefined;
      }
      break;
    }
  }
  const nextTextContent = split.join('').trim();

  if (nextTextContent === '') {
    textNode.remove();
  } else {
    textNode.setTextContent(nextTextContent);
    textNode.select(restoreOffset, restoreOffset);
  }
}

function shouldResolveAncestor(
  resolvedElement: ElementNode,
  resolvedOffset: number,
  lastPoint: null | PointType,
): boolean {
  const parent = resolvedElement.getParent();
  return (
    lastPoint === null ||
    parent === null ||
    !parent.canBeEmpty() ||
    parent !== lastPoint.getNode()
  );
}

function $internalResolveSelectionPoint(
  dom: Node,
  offset: number,
  lastPoint: null | PointType,
  editor: LexicalEditor,
): null | PointType {
  let resolvedOffset = offset;
  let resolvedNode: TextNode | LexicalNode | null;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (isHTMLElement(dom)) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes;
    const childNodesLength = childNodes.length;
    const blockCursorElement = editor._blockCursorElement;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    let childDOM = childNodes[resolvedOffset];
    let hasBlockCursor = false;
    if (childDOM === blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1];
      hasBlockCursor = true;
    } else if (blockCursorElement !== null) {
      const blockCursorElementParent = blockCursorElement.parentNode;
      if (dom === blockCursorElementParent) {
        const blockCursorOffset = Array.prototype.indexOf.call(
          blockCursorElementParent.children,
          blockCursorElement,
        );
        if (offset > blockCursorOffset) {
          resolvedOffset--;
        }
      }
    }
    resolvedNode = $getNodeFromDOM(childDOM);

    if ($isTextNode(resolvedNode)) {
      resolvedOffset = $getTextNodeOffset(
        resolvedNode,
        moveSelectionToEnd ? 'next' : 'previous',
      );
    } else {
      let resolvedElement = $getNodeFromDOM(dom);
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null;
      }
      if ($isElementNode(resolvedElement)) {
        const elementDOM = editor.getElementByKey(resolvedElement.getKey());
        invariant(
          elementDOM !== null,
          '$internalResolveSelectionPoint: node in DOM but not keyToDOMMap',
        );
        const slot = resolvedElement.getDOMSlot(elementDOM);
        [resolvedElement, resolvedOffset] = slot.resolveChildIndex(
          resolvedElement,
          elementDOM,
          dom,
          offset,
        );
        // This is just a typescript workaround, it is true but lost due to mutability
        invariant(
          $isElementNode(resolvedElement),
          '$internalResolveSelectionPoint: resolvedElement is not an ElementNode',
        );
        if (
          moveSelectionToEnd &&
          resolvedOffset >= resolvedElement.getChildrenSize()
        ) {
          resolvedOffset = Math.max(0, resolvedElement.getChildrenSize() - 1);
        }
        let child = resolvedElement.getChildAtIndex(resolvedOffset);
        if (
          $isElementNode(child) &&
          shouldResolveAncestor(child, resolvedOffset, lastPoint)
        ) {
          const descendant = moveSelectionToEnd
            ? child.getLastDescendant()
            : child.getFirstDescendant();
          if (descendant === null) {
            resolvedElement = child;
          } else {
            child = descendant;
            resolvedElement = $isElementNode(child)
              ? child
              : child.getParentOrThrow();
          }
          resolvedOffset = 0;
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = $getTextNodeOffset(
            child,
            moveSelectionToEnd ? 'next' : 'previous',
          );
        } else if (
          child !== resolvedElement &&
          moveSelectionToEnd &&
          !hasBlockCursor
        ) {
          invariant($isElementNode(resolvedElement), 'invariant');
          resolvedOffset = Math.min(
            resolvedElement.getChildrenSize(),
            resolvedOffset + 1,
          );
        }
      } else {
        const index = resolvedElement.getIndexWithinParent();
        // When selecting decorators, there can be some selection issues when using resolvedOffset,
        // and instead we should be checking if we're using the offset
        if (
          offset === 0 &&
          $isDecoratorNode(resolvedElement) &&
          $getNodeFromDOM(dom) === resolvedElement
        ) {
          resolvedOffset = index;
        } else {
          resolvedOffset = index + 1;
        }
        resolvedElement = resolvedElement.getParentOrThrow();
      }
      if ($isElementNode(resolvedElement)) {
        return $createPoint(resolvedElement.__key, resolvedOffset, 'element');
      }
    }
  } else {
    // TextNode or null
    resolvedNode = $getNodeFromDOM(dom);
  }
  if (!$isTextNode(resolvedNode)) {
    return null;
  }
  return $createPoint(
    resolvedNode.__key,
    $getTextNodeOffset(resolvedNode, resolvedOffset, 'clamp'),
    'text',
  );
}

function resolveSelectionPointOnBoundary(
  point: TextPointType,
  isBackward: boolean,
  isCollapsed: boolean,
): void {
  const offset = point.offset;
  const node = point.getNode();

  if (offset === 0) {
    const prevSibling = node.getPreviousSibling();
    const parent = node.getParent();

    if (!isBackward) {
      if (
        $isElementNode(prevSibling) &&
        !isCollapsed &&
        prevSibling.isInline()
      ) {
        point.set(prevSibling.__key, prevSibling.getChildrenSize(), 'element');
      } else if ($isTextNode(prevSibling)) {
        point.set(
          prevSibling.__key,
          prevSibling.getTextContent().length,
          'text',
        );
      }
    } else if (
      (isCollapsed || !isBackward) &&
      prevSibling === null &&
      $isElementNode(parent) &&
      parent.isInline()
    ) {
      const parentSibling = parent.getPreviousSibling();
      if ($isTextNode(parentSibling)) {
        point.set(
          parentSibling.__key,
          parentSibling.getTextContent().length,
          'text',
        );
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling();
    const parent = node.getParent();

    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.set(nextSibling.__key, 0, 'element');
    } else if (
      (isCollapsed || isBackward) &&
      nextSibling === null &&
      $isElementNode(parent) &&
      parent.isInline() &&
      !parent.canInsertTextAfter()
    ) {
      const parentSibling = parent.getNextSibling();
      if ($isTextNode(parentSibling)) {
        point.set(parentSibling.__key, 0, 'text');
      }
    }
  }
}

function $normalizeSelectionPointsForBoundaries(
  anchor: PointType,
  focus: PointType,
  lastSelection: null | BaseSelection,
): void {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);

    if (isCollapsed) {
      focus.set(anchor.key, anchor.offset, anchor.type);
    }
    const editor = getActiveEditor();

    if (
      editor.isComposing() &&
      editor._compositionKey !== anchor.key &&
      $isRangeSelection(lastSelection)
    ) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      anchor.set(lastAnchor.key, lastAnchor.offset, lastAnchor.type, true);
      focus.set(lastFocus.key, lastFocus.offset, lastFocus.type, true);
    }
  }
}

function $internalResolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: LexicalEditor,
  lastSelection: null | BaseSelection,
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolvedAnchorPoint = $internalResolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    $isRangeSelection(lastSelection) ? lastSelection.anchor : null,
    editor,
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = $internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
    editor,
  );
  if (resolvedFocusPoint === null) {
    return null;
  }
  if (__DEV__) {
    $validatePoint('anchor', resolvedAnchorPoint);
    $validatePoint('focus', resolvedFocusPoint);
  }
  if (
    resolvedAnchorPoint.type === 'element' &&
    resolvedFocusPoint.type === 'element'
  ) {
    const anchorNode = $getNodeFromDOM(anchorDOM);
    const focusNode = $getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  $normalizeSelectionPointsForBoundaries(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection,
  );

  return [resolvedAnchorPoint, resolvedFocusPoint];
}

export function $isBlockElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return $isElementNode(node) && !node.isInline();
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.

export function $internalMakeRangeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
  anchorType: 'text' | 'element',
  focusType: 'text' | 'element',
): RangeSelection {
  const editorState = getActiveEditorState();
  const selection = new RangeSelection(
    $createPoint(anchorKey, anchorOffset, anchorType),
    $createPoint(focusKey, focusOffset, focusType),
    0,
    '',
  );
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}

export function $createRangeSelection(): RangeSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0, '');
}

export function $createNodeSelection(): NodeSelection {
  return new NodeSelection(new Set());
}

export function $internalCreateSelection(
  editor: LexicalEditor,
  event: UIEvent | Event | null,
): null | BaseSelection {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(getWindow(editor));

  if ($isRangeSelection(lastSelection) || lastSelection == null) {
    return $internalCreateRangeSelection(
      lastSelection,
      domSelection,
      editor,
      event,
    );
  }
  return lastSelection.clone();
}

export function $createRangeSelectionFromDom(
  domSelection: Selection | null,
  editor: LexicalEditor,
): null | RangeSelection {
  return $internalCreateRangeSelection(null, domSelection, editor, null);
}

export function $internalCreateRangeSelection(
  lastSelection: null | BaseSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
  event: UIEvent | Event | null,
): null | RangeSelection {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = event || windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    !getIsProcessingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' &&
        windowEvent &&
        (windowEvent as InputEvent).detail === 3) ||
      eventType === 'drop' ||
      eventType === undefined);
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
    if (
      isSelectionChange &&
      $isRangeSelection(lastSelection) &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = $internalResolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
    lastSelection,
  );
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;
  return new RangeSelection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    !$isRangeSelection(lastSelection) ? 0 : lastSelection.format,
    !$isRangeSelection(lastSelection) ? '' : lastSelection.style,
  );
}

function $validatePoint(name: 'anchor' | 'focus', point: PointType): void {
  const node = $getNodeByKey(point.key);
  invariant(
    node !== undefined,
    '$validatePoint: %s key %s not found in current editorState',
    name,
    point.key,
  );
  if (point.type === 'text') {
    invariant(
      $isTextNode(node),
      '$validatePoint: %s key %s is not a TextNode',
      name,
      point.key,
    );
    const size = node.getTextContentSize();
    invariant(
      point.offset <= size,
      '$validatePoint: %s point.offset > node.getTextContentSize() (%s > %s)',
      name,
      String(point.offset),
      String(size),
    );
  } else {
    invariant(
      $isElementNode(node),
      '$validatePoint: %s key %s is not an ElementNode',
      name,
      point.key,
    );
    const size = node.getChildrenSize();
    invariant(
      point.offset <= size,
      '$validatePoint: %s point.offset > node.getChildrenSize() (%s > %s)',
      name,
      String(point.offset),
      String(size),
    );
  }
}

export function $getSelection(): null | BaseSelection {
  const editorState = getActiveEditorState();
  return editorState._selection;
}

export function $getPreviousSelection(): null | BaseSelection {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}

export function $updateElementSelectionOnCreateDeleteNode(
  selection: RangeSelection,
  parentNode: LexicalNode,
  nodeOffset: number,
  times = 1,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return;
  }
  const parentKey = parentNode.__key;
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset;
    if (
      (nodeOffset <= selectionOffset && times > 0) ||
      (nodeOffset < selectionOffset && times < 0)
    ) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
  } else {
    // Multiple nodes selected. We shift or redimension selection
    const isBackward = selection.isBackward();
    const firstPoint = isBackward ? focus : anchor;
    const firstPointNode = firstPoint.getNode();
    const lastPoint = isBackward ? anchor : focus;
    const lastPointNode = lastPoint.getNode();
    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset;
      if (
        (nodeOffset <= firstPointOffset && times > 0) ||
        (nodeOffset < firstPointOffset && times < 0)
      ) {
        firstPoint.set(
          parentKey,
          Math.max(0, firstPointOffset + times),
          'element',
        );
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset;
      if (
        (nodeOffset <= lastPointOffset && times > 0) ||
        (nodeOffset < lastPointOffset && times < 0)
      ) {
        lastPoint.set(
          parentKey,
          Math.max(0, lastPointOffset + times),
          'element',
        );
      }
    }
  }
  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection);
}

function $updateSelectionResolveTextNodes(selection: RangeSelection): void {
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const focus = selection.focus;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return;
    }
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
      focus.set(child.__key, newOffset, 'text');
    }
    return;
  }
  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
    }
  }
  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize();
    const focusOffsetAtEnd = focusOffset >= childSize;
    const child = focusOffsetAtEnd
      ? focusNode.getChildAtIndex(childSize - 1)
      : focusNode.getChildAtIndex(focusOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      focus.set(child.__key, newOffset, 'text');
    }
  }
}

export function applySelectionTransforms(
  nextEditorState: EditorState,
  editor: LexicalEditor,
): void {
  const prevEditorState = editor.getEditorState();
  const prevSelection = prevEditorState._selection;
  const nextSelection = nextEditorState._selection;
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;

    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}

export function moveSelectionPointToSibling(
  point: PointType,
  node: LexicalNode,
  parent: ElementNode,
  prevSibling: LexicalNode | null,
  nextSibling: LexicalNode | null,
): void {
  let siblingKey = null;
  let offset = 0;
  let type: 'text' | 'element' | null = null;
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key;
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize();
      type = 'text';
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize();
      type = 'element';
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key;
      if ($isTextNode(nextSibling)) {
        type = 'text';
      } else if ($isElementNode(nextSibling)) {
        type = 'element';
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type);
  } else {
    offset = node.getIndexWithinParent();
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize();
    }
    point.set(parent.__key, offset, 'element');
  }
}

export function adjustPointOffsetForMergedSibling(
  point: PointType,
  isBefore: boolean,
  key: NodeKey,
  target: TextNode,
  textLength: number,
): void {
  if (point.type === 'text') {
    point.set(key, point.offset + (isBefore ? 0 : textLength), 'text');
  } else if (point.offset > target.getIndexWithinParent()) {
    point.set(point.key, point.offset - 1, 'element');
  }
}

function setDOMSelectionBaseAndExtent(
  domSelection: Selection,
  nextAnchorDOM: HTMLElement | Text,
  nextAnchorOffset: number,
  nextFocusDOM: HTMLElement | Text,
  nextFocusOffset: number,
): void {
  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      nextAnchorDOM,
      nextAnchorOffset,
      nextFocusDOM,
      nextFocusOffset,
    );
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
    if (__DEV__) {
      console.warn(error);
    }
  }
}

export function updateDOMSelection(
  prevSelection: BaseSelection | null,
  nextSelection: BaseSelection | null,
  editor: LexicalEditor,
  domSelection: Selection,
  tags: Set<string>,
  rootElement: HTMLElement,
  nodeCount: number,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;
  const activeElement = document.activeElement;

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (
    (tags.has(COLLABORATION_TAG) && activeElement !== rootElement) ||
    (activeElement !== null &&
      isSelectionCapturedInDecoratorInput(activeElement))
  ) {
    return;
  }

  if (!$isRangeSelection(nextSelection)) {
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
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  const nextAnchorOffset = anchor.offset;
  const nextFocusOffset = focus.offset;
  const nextFormat = nextSelection.format;
  const nextStyle = nextSelection.style;
  const isCollapsed = nextSelection.isCollapsed();
  let nextAnchorNode: HTMLElement | Text | null = anchorDOM;
  let nextFocusNode: HTMLElement | Text | null = focusDOM;
  let anchorFormatOrStyleChanged = false;

  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM);
    const anchorNode = anchor.getNode();
    anchorFormatOrStyleChanged =
      anchorNode.getFormat() !== nextFormat ||
      anchorNode.getStyle() !== nextStyle;
  } else if (
    $isRangeSelection(prevSelection) &&
    prevSelection.anchor.type === 'text'
  ) {
    anchorFormatOrStyleChanged = true;
  }

  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM);
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }

  if (
    isCollapsed &&
    (prevSelection === null ||
      anchorFormatOrStyleChanged ||
      ($isRangeSelection(prevSelection) &&
        (prevSelection.format !== nextFormat ||
          prevSelection.style !== nextStyle)))
  ) {
    markCollapsedSelectionFormat(
      nextFormat,
      nextStyle,
      nextAnchorOffset,
      anchorKey,
      performance.now(),
    );
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode && // Badly interpreted range selection when collapsed - #1482
    !(domSelection.type === 'Range' && isCollapsed)
  ) {
    // If the root element does not have focus, ensure it has focus
    if (activeElement === null || !rootElement.contains(activeElement)) {
      if (!tags.has(SKIP_SELECTION_FOCUS_TAG)) {
        rootElement.focus({
          preventScroll: true,
        });
      }
    }
    if (anchor.type !== 'element') {
      return;
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  setDOMSelectionBaseAndExtent(
    domSelection,
    nextAnchorNode,
    nextAnchorOffset,
    nextFocusNode,
    nextFocusOffset,
  );
  if (
    !tags.has(SKIP_SCROLL_INTO_VIEW_TAG) &&
    nextSelection.isCollapsed() &&
    rootElement !== null &&
    rootElement === document.activeElement
  ) {
    const selectionTarget: null | Range | HTMLElement | Text =
      $isRangeSelection(nextSelection) &&
      nextSelection.anchor.type === 'element'
        ? (nextAnchorNode.childNodes[nextAnchorOffset] as HTMLElement | Text) ||
          null
        : domSelection.rangeCount > 0
          ? domSelection.getRangeAt(0)
          : null;
    if (selectionTarget !== null) {
      let selectionRect: DOMRect;
      if (selectionTarget instanceof Text) {
        const range = document.createRange();
        range.selectNode(selectionTarget);
        selectionRect = range.getBoundingClientRect();
      } else {
        selectionRect = selectionTarget.getBoundingClientRect();
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement);
    }
  }

  markSelectionChangeFromDOMUpdate();
}

export function $insertNodes(nodes: Array<LexicalNode>) {
  let selection = $getSelection() || $getPreviousSelection();

  if (selection === null) {
    selection = $getRoot().selectEnd();
  }
  selection.insertNodes(nodes);
}

export function $getTextContent(): string {
  const selection = $getSelection();
  if (selection === null) {
    return '';
  }
  return selection.getTextContent();
}

function $removeTextAndSplitBlock(selection: RangeSelection): number {
  let selection_ = selection;
  if (!selection.isCollapsed()) {
    selection_.removeText();
  }
  // A new selection can originate as a result of node replacement, in which case is registered via
  // $setSelection
  const newSelection = $getSelection();
  if ($isRangeSelection(newSelection)) {
    selection_ = newSelection;
  }

  invariant(
    $isRangeSelection(selection_),
    'Unexpected dirty selection to be null',
  );

  const anchor = selection_.anchor;
  let node = anchor.getNode();
  let offset = anchor.offset;

  while (!INTERNAL_$isBlock(node)) {
    const prevNode = node;
    [node, offset] = $splitNodeAtPoint(node, offset);
    if (prevNode.is(node)) {
      break;
    }
  }

  return offset;
}

function $splitNodeAtPoint(
  node: LexicalNode,
  offset: number,
): [parent: ElementNode, offset: number] {
  const parent = node.getParent();
  if (!parent) {
    const paragraph = $createParagraphNode();
    $getRoot().append(paragraph);
    paragraph.select();
    return [$getRoot(), 0];
  }

  if ($isTextNode(node)) {
    const split = node.splitText(offset);
    if (split.length === 0) {
      return [parent, node.getIndexWithinParent()];
    }
    const x = offset === 0 ? 0 : 1;
    const index = split[0].getIndexWithinParent() + x;

    return [parent, index];
  }

  if (!$isElementNode(node) || offset === 0) {
    return [parent, node.getIndexWithinParent()];
  }

  const firstToAppend = node.getChildAtIndex(offset);
  if (firstToAppend) {
    const insertPoint = new RangeSelection(
      $createPoint(node.__key, offset, 'element'),
      $createPoint(node.__key, offset, 'element'),
      0,
      '',
    );
    const newElement = node.insertNewAfter(insertPoint) as ElementNode | null;
    if (newElement) {
      newElement.append(firstToAppend, ...firstToAppend.getNextSiblings());
    }
  }
  return [parent, node.getIndexWithinParent() + 1];
}

function $wrapInlineNodes(nodes: LexicalNode[]) {
  // We temporarily insert the topLevelNodes into an arbitrary ElementNode,
  // since insertAfter does not work on nodes that have no parent (TO-DO: fix that).
  const virtualRoot = $createParagraphNode();

  let currentBlock = null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const isLineBreakNode = $isLineBreakNode(node);

    if (
      isLineBreakNode ||
      ($isDecoratorNode(node) && node.isInline()) ||
      ($isElementNode(node) && node.isInline()) ||
      $isTextNode(node) ||
      node.isParentRequired()
    ) {
      if (currentBlock === null) {
        currentBlock = node.createParentElementNode();
        virtualRoot.append(currentBlock);
        // In the case of LineBreakNode, we just need to
        // add an empty ParagraphNode to the topLevelBlocks.
        if (isLineBreakNode) {
          continue;
        }
      }

      if (currentBlock !== null) {
        currentBlock.append(node);
      }
    } else {
      virtualRoot.append(node);
      currentBlock = null;
    }
  }

  return virtualRoot;
}

/**
 * Get all nodes in a CaretRange in a way that complies with all of the
 * quirks of the original RangeSelection.getNodes().
 *
 * @param range The CaretRange
 */
function $getNodesFromCaretRangeCompat(
  // getNodes returned nodes in document order
  range: CaretRange<'next'>,
): LexicalNode[] {
  const nodes: LexicalNode[] = [];
  const [beforeSlice, afterSlice] = range.getTextSlices();
  if (beforeSlice) {
    nodes.push(beforeSlice.caret.origin);
  }
  const seenAncestors = new Set<ElementNode>();
  const seenElements = new Set<ElementNode>();
  for (const caret of range) {
    if ($isChildCaret(caret)) {
      // Emulate the leading under-selection behavior of getNodes by
      // ignoring the 'enter' of any ElementNode until we've seen a
      // SiblingCaret
      const {origin} = caret;
      if (nodes.length === 0) {
        seenAncestors.add(origin);
      } else {
        seenElements.add(origin);
        nodes.push(origin);
      }
    } else {
      const {origin} = caret;
      if (!$isElementNode(origin) || !seenElements.has(origin)) {
        nodes.push(origin);
      }
    }
  }
  if (afterSlice) {
    nodes.push(afterSlice.caret.origin);
  }
  // Emulate the trailing underselection behavior when the last offset of
  // an element is selected
  if (
    $isSiblingCaret(range.focus) &&
    $isElementNode(range.focus.origin) &&
    range.focus.getNodeAtCaret() === null
  ) {
    for (
      let reverseCaret: null | NodeCaret<'previous'> = $getChildCaret(
        range.focus.origin,
        'previous',
      );
      $isChildCaret(reverseCaret) &&
      seenAncestors.has(reverseCaret.origin) &&
      !reverseCaret.origin.isEmpty() &&
      reverseCaret.origin.is(nodes[nodes.length - 1]);
      reverseCaret = $getAdjacentChildCaret(reverseCaret)
    ) {
      seenAncestors.delete(reverseCaret.origin);
      nodes.pop();
    }
  }
  while (nodes.length > 1) {
    const lastIncludedNode = nodes[nodes.length - 1];
    if ($isElementNode(lastIncludedNode)) {
      if (
        seenElements.has(lastIncludedNode) ||
        lastIncludedNode.isEmpty() ||
        seenAncestors.has(lastIncludedNode)
      ) {
        // fall through to break
      } else {
        nodes.pop();
        continue;
      }
    }
    break;
  }
  if (nodes.length === 0 && range.isCollapsed()) {
    // Emulate the collapsed behavior of getNodes by returning the descendant
    const normCaret = $normalizeCaret(range.anchor);
    const flippedNormCaret = $normalizeCaret(range.anchor.getFlipped());
    const $getCandidate = (caret: PointCaret): LexicalNode | null =>
      $isTextPointCaret(caret) ? caret.origin : caret.getNodeAtCaret();
    const node =
      $getCandidate(normCaret) ||
      $getCandidate(flippedNormCaret) ||
      (range.anchor.getNodeAtCaret()
        ? normCaret.origin
        : flippedNormCaret.origin);
    nodes.push(node);
  }
  return nodes;
}

/**
 * @internal
 *
 * Modify the focus of the focus around possible decorators and blocks and return true
 * if the movement is done.
 */
function $modifySelectionAroundDecoratorsAndBlocks(
  selection: RangeSelection,
  alter: 'move' | 'extend',
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
  mode: 'decorators-and-blocks' | 'decorators' = 'decorators-and-blocks',
): boolean {
  if (
    alter === 'move' &&
    granularity === 'character' &&
    !selection.isCollapsed()
  ) {
    // moving left or right when the selection isn't collapsed will
    // just set the anchor to the focus or vice versa depending on
    // direction
    const [src, dst] =
      isBackward === selection.isBackward()
        ? [selection.focus, selection.anchor]
        : [selection.anchor, selection.focus];
    dst.set(src.key, src.offset, src.type);
    return true;
  }
  const initialFocus = $caretFromPoint(
    selection.focus,
    isBackward ? 'previous' : 'next',
  );
  const isLineBoundary = granularity === 'lineboundary';
  const collapse = alter === 'move';
  let focus = initialFocus;
  let checkForBlock = mode === 'decorators-and-blocks';
  if (!$isExtendableTextPointCaret(focus)) {
    for (const siblingCaret of focus) {
      checkForBlock = false;
      const {origin} = siblingCaret;
      if ($isDecoratorNode(origin) && !origin.isIsolated()) {
        focus = siblingCaret;
        if (isLineBoundary && origin.isInline()) {
          continue;
        }
      }
      break;
    }
    if (checkForBlock) {
      for (const nextCaret of $extendCaretToRange(initialFocus).iterNodeCarets(
        alter === 'extend' ? 'shadowRoot' : 'root',
      )) {
        if ($isChildCaret(nextCaret)) {
          if (!nextCaret.origin.isInline()) {
            focus = nextCaret;
          }
        } else if ($isElementNode(nextCaret.origin)) {
          continue;
        } else if (
          $isDecoratorNode(nextCaret.origin) &&
          !nextCaret.origin.isInline()
        ) {
          focus = nextCaret;
        }
        break;
      }
    }
  }
  if (focus === initialFocus) {
    return false;
  }
  // After this point checkForBlock is true if and only if we moved to a
  // different block, so we should stop regardless of the granularity
  if (
    collapse &&
    !isLineBoundary &&
    $isDecoratorNode(focus.origin) &&
    focus.origin.isKeyboardSelectable()
  ) {
    // Make it possible to move selection from range selection to
    // node selection on the node.
    const nodeSelection = $createNodeSelection();
    nodeSelection.add(focus.origin.getKey());
    $setSelection(nodeSelection);
    return true;
  }
  focus = $normalizeCaret(focus);
  if (collapse) {
    $setPointFromCaret(selection.anchor, focus);
  }
  $setPointFromCaret(selection.focus, focus);
  return checkForBlock || !isLineBoundary;
}
