/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Selection} from './OutlineSelection';
import type {NodeKey} from './OutlineNode';
import type {EditorThemeClasses} from './OutlineEditor';

import {OutlineNode} from './OutlineNode';
import {getWritableNode} from './OutlineNode';
import {getSelection, makeSelection} from './OutlineSelection';
import {invariant, isArray} from './OutlineUtils';
import {shouldErrorOnReadOnly} from './OutlineView';
import {
  IS_CODE,
  IS_BOLD,
  IS_ITALIC,
  IS_HASHTAG,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_LINK,
  IS_OVERFLOWED,
  BYTE_ORDER_MARK,
} from './OutlineConstants';

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'code'
  | 'link'
  | 'hashtag'
  | 'overflowed';

export type SelectionFragment = {
  root: OutlineNode,
  nodeMap: {[string]: OutlineNode},
};

const textFormatStateFlags: {[TextFormatType]: number} = {
  bold: IS_BOLD,
  underline: IS_UNDERLINE,
  strikethrough: IS_STRIKETHROUGH,
  italic: IS_ITALIC,
  code: IS_CODE,
  link: IS_LINK,
  hashtag: IS_HASHTAG,
  overflowed: IS_OVERFLOWED,
};

function getElementOuterTag(node: TextNode, flags: number): string | null {
  if (flags & IS_CODE) {
    return 'code';
  }
  return null;
}

function getElementInnerTag(node: TextNode, flags: number): string {
  if (flags & IS_BOLD) {
    return 'strong';
  }
  if (flags & IS_ITALIC) {
    return 'em';
  }
  return 'span';
}

function splitText(
  node: TextNode,
  splitOffsets: Array<number>,
): Array<TextNode> {
  if (node.isImmutable()) {
    throw new Error('splitText: can only be used on non-immutable text nodes');
  }
  const textContent = node.getTextContent();
  const key = node.__key;
  const offsetsSet = new Set(splitOffsets);
  const parts = [];
  const textLength = textContent.length;
  let string = '';
  for (let i = 0; i < textLength; i++) {
    if (string !== '' && offsetsSet.has(i)) {
      parts.push(string);
      string = '';
    }
    string += textContent[i];
  }
  if (string !== '') {
    parts.push(string);
  }
  const partsLength = parts.length;
  if (partsLength === 0) {
    return [];
  } else if (parts[0] === textContent) {
    return [node];
  }
  // For the first part, update the existing node
  const writableNode = getWritableNode(node);
  const parentKey = writableNode.__parent;
  const firstPart = parts[0];
  const flags = writableNode.__flags;
  writableNode.__text = firstPart;

  // Handle selection
  const selection = getSelection();

  // Then handle all other parts
  const splitNodes = [writableNode];
  let textSize = firstPart.length;
  for (let i = 1; i < partsLength; i++) {
    const part = parts[i];
    const partSize = part.length;
    const sibling = getWritableNode(createTextNode(part));
    sibling.__flags = flags;
    const siblingKey = sibling.__key;
    const nextTextSize = textSize + partSize;

    if (selection !== null) {
      const anchorOffset = selection.anchorOffset;
      const focusOffset = selection.focusOffset;

      if (
        selection.anchorKey === key &&
        anchorOffset > textSize &&
        anchorOffset <= nextTextSize
      ) {
        selection.anchorKey = siblingKey;
        selection.anchorOffset = anchorOffset - textSize;
        selection.isDirty = true;
      }
      if (
        selection.focusKey === key &&
        focusOffset > textSize &&
        focusOffset <= nextTextSize
      ) {
        selection.focusKey = siblingKey;
        selection.focusOffset = focusOffset - textSize;
        selection.isDirty = true;
      }
    }
    textSize = nextTextSize;
    sibling.__parent = parentKey;
    splitNodes.push(sibling);
  }

  // Insert the nodes into the parent's children
  const parent = node.getParentOrThrow();
  const writableParent = getWritableNode(parent);
  const writableParentChildren = writableParent.__children;
  const insertionIndex = writableParentChildren.indexOf(key);
  const splitNodesKeys = splitNodes.map((splitNode) => splitNode.__key);
  writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);

  return splitNodes;
}

function setTextThemeClassNames(
  tag: string,
  prevFlags: number,
  nextFlags: number,
  dom: HTMLElement,
  textClassNames,
): void {
  const domClassList = dom.classList;
  for (const key in textFormatStateFlags) {
    // $FlowFixMe: expected cast here
    const format: TextFormatType = key;
    const flag = textFormatStateFlags[format];
    let classNames = textClassNames[key];
    if (classNames !== undefined) {
      // As we're using classList below, we need
      // to handle className tokens that have spaces.
      // The easiest way to do this to convert the
      // className tokens to an array that can be
      // applied to classList.add()/remove().
      if (!isArray(classNames)) {
        classNames = classNames.split(' ');
        textClassNames[key] = classNames;
      }
      if (nextFlags & flag) {
        if ((prevFlags & flag) === 0) {
          domClassList.add(...classNames);
        }
      } else if (prevFlags & flag) {
        domClassList.remove(...classNames);
      }
    }
  }
  // Now we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  let classNames = textClassNames.underlineStrikethrough;
  if (classNames !== undefined) {
    if (!isArray(classNames)) {
      classNames = classNames.split(' ');
      // $FlowFixMe: this isn't right but we want to cache the array value
      textClassNames.underlineStrikethrough = classNames;
    }

    const prevUnderlineStrikethrough =
      prevFlags & IS_UNDERLINE && prevFlags & IS_STRIKETHROUGH;
    const nextUnderlineStrikethrough =
      nextFlags & IS_UNDERLINE && nextFlags & IS_STRIKETHROUGH;
    if (nextUnderlineStrikethrough) {
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames);
      }
    } else if (prevUnderlineStrikethrough) {
      domClassList.remove(...classNames);
    }
  }
}

function setTextContent(
  prevText: null | string,
  _nextText: string,
  dom: HTMLElement,
  node: TextNode,
): void {
  let nextText = _nextText;
  const firstChild = dom.firstChild;
  const hasBreakNode = firstChild && firstChild.nextSibling;
  const parent = node.getParent();
  // Check if we are on an empty line
  if (parent !== null && parent.__children.length === 1) {
    if (nextText === '') {
      if (firstChild == null) {
        // We use a zero width string so that the browser moves
        // the cursor into the text node. It won't move the cursor
        // in if it's empty. This trick makes it seem empty, so
        // the browser plays along nicely. We use the <br>
        // to ensure we take up a full line, as we don't have any
        // characters taking up the full height yet.
        dom.appendChild(document.createTextNode(BYTE_ORDER_MARK));
        dom.appendChild(document.createElement('br'));
      } else if (!hasBreakNode) {
        firstChild.nodeValue = BYTE_ORDER_MARK;
        dom.appendChild(document.createElement('br'));
      }
      return;
    }
  }
  if (nextText === '') {
    nextText = BYTE_ORDER_MARK;
  } else if (nextText.endsWith('\n')) {
    nextText += BYTE_ORDER_MARK;
  }
  if (firstChild == null || hasBreakNode) {
    dom.textContent = nextText;
  } else if (prevText !== nextText) {
    firstChild.nodeValue = nextText;
  }
}

export class TextNode extends OutlineNode {
  __text: string;
  __url: null | string;

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__type = 'text';
    this.__flags = 0;
    this.__url = null;
  }

  clone(): TextNode {
    const clone = new TextNode(this.__text, this.__key);
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    clone.__url = this.__url;
    return clone;
  }
  isBold(): boolean {
    return (this.getLatest().__flags & IS_BOLD) !== 0;
  }
  isItalic(): boolean {
    return (this.getLatest().__flags & IS_ITALIC) !== 0;
  }
  isStrikethrough(): boolean {
    return (this.getLatest().__flags & IS_STRIKETHROUGH) !== 0;
  }
  isUnderline(): boolean {
    return (this.getLatest().__flags & IS_UNDERLINE) !== 0;
  }
  isCode(): boolean {
    return (this.getLatest().__flags & IS_CODE) !== 0;
  }
  isLink(): boolean {
    return (this.getLatest().__flags & IS_LINK) !== 0;
  }
  isHashtag(): boolean {
    return (this.getLatest().__flags & IS_HASHTAG) !== 0;
  }
  isOverflowed(): boolean {
    return (this.getLatest().__flags & IS_OVERFLOWED) !== 0;
  }
  getURL(): null | string {
    return this.__url;
  }
  getTextContent(includeInert?: boolean): string {
    if (!includeInert && this.isInert()) {
      return '';
    }
    const self = this.getLatest();
    return self.__text;
  }
  getTextNodeFormatFlags(
    type: TextFormatType,
    alignWithFlags: null | number,
    force?: boolean,
  ): number {
    const self = this.getLatest<TextNode>();
    const nodeFlags = self.__flags;
    const stateFlag = textFormatStateFlags[type];
    const isStateFlagPresent = nodeFlags & stateFlag;

    if (
      isStateFlagPresent &&
      !force &&
      (alignWithFlags === null || (alignWithFlags & stateFlag) === 0)
    ) {
      // Remove the state flag.
      return nodeFlags ^ stateFlag;
    }
    if (alignWithFlags === null || alignWithFlags & stateFlag) {
      // Add the state flag.
      return nodeFlags | stateFlag;
    }
    return nodeFlags;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const flags = this.__flags;
    const outerTag = getElementOuterTag(this, flags);
    const innerTag = getElementInnerTag(this, flags);
    const tag = outerTag === null ? innerTag : outerTag;
    const dom = document.createElement(tag);
    let innerDOM = dom;
    if (outerTag !== null) {
      innerDOM = document.createElement(innerTag);
      dom.appendChild(innerDOM);
    }
    const text = this.__text;

    setTextContent(null, text, innerDOM, this);
    // Apply theme class names
    const textClassNames = editorThemeClasses.text;

    if (textClassNames !== undefined) {
      setTextThemeClassNames(innerTag, 0, flags, innerDOM, textClassNames);
    }
    return dom;
  }
  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
  ): boolean {
    const prevText = prevNode.__text;
    const nextText = this.__text;
    const prevFlags = prevNode.__flags;
    const nextFlags = this.__flags;
    const prevOuterTag = getElementOuterTag(this, prevFlags);
    const nextOuterTag = getElementOuterTag(this, nextFlags);
    const prevInnerTag = getElementInnerTag(this, prevFlags);
    const nextInnerTag = getElementInnerTag(this, nextFlags);
    const prevTag = prevOuterTag === null ? prevInnerTag : prevOuterTag;
    const nextTag = nextOuterTag === null ? nextInnerTag : nextOuterTag;

    if (prevTag !== nextTag) {
      return true;
    }
    let innerDOM: HTMLElement = dom;
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        // $FlowFixMe: this should not be possible
        innerDOM = dom.firstChild;
        invariant(
          innerDOM != null && innerDOM.nodeType === 1,
          'Should never happen',
        );
      } else {
        // TODO ensure we can remove this and simplify this block's logic
        invariant(false, 'Should never happen');
      }
    } else {
      if (prevOuterTag !== null) {
        // TODO ensure we can remove this and simplify this block's logic
        invariant(false, 'Should never happen');
      }
    }
    setTextContent(prevText, nextText, innerDOM, this);
    // Apply theme class names
    const textClassNames = editorThemeClasses.text;

    if (textClassNames !== undefined && prevFlags !== nextFlags) {
      setTextThemeClassNames(
        nextInnerTag,
        prevFlags,
        nextFlags,
        innerDOM,
        textClassNames,
      );
    }
    return false;
  }

  // Mutators
  toggleOverflowed(): TextNode {
    const newFlags = this.getTextNodeFormatFlags('overflowed', null);
    return this.setFlags(newFlags);
  }
  toggleHashtag(): TextNode {
    const newFlags = this.getTextNodeFormatFlags('hashtag', null);
    return this.setFlags(newFlags);
  }
  setURL(url: string | null): TextNode {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error('setURL: can only be used on non-immutable text nodes');
    }
    const writableSelf = getWritableNode(this);
    writableSelf.__url = url;
    return writableSelf;
  }
  setTextContent(text: string): TextNode {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error(
        'setTextContent: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = getWritableNode(this);
    writableSelf.__text = text;
    return writableSelf;
  }
  selectEnd(): Selection {
    shouldErrorOnReadOnly();
    const text = this.getTextContent();
    return this.select(text.length, text.length);
  }
  selectNext(anchorOffset?: number, focusOffset?: number): Selection {
    shouldErrorOnReadOnly();
    const nextSibling = this.getNextSibling();
    if (
      nextSibling === null ||
      !(nextSibling instanceof TextNode) ||
      nextSibling.isImmutable() ||
      nextSibling.isSegmented()
    ) {
      throw new Error('This needs to be fixed');
    }
    return nextSibling.select(anchorOffset, focusOffset);
  }
  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    shouldErrorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this.__key;
    if (key === null) {
      throw new Error('TODO: validate nodes have keys in a more generic way');
    }
    if (typeof text === 'string') {
      const lastOffset = text.length;
      if (anchorOffset === undefined) {
        anchorOffset = lastOffset;
      }
      if (focusOffset === undefined) {
        focusOffset = lastOffset;
      }
    } else {
      anchorOffset = 0;
      focusOffset = 0;
    }
    if (selection === null) {
      return makeSelection(key, anchorOffset, key, focusOffset);
    } else {
      selection.setRange(key, anchorOffset, key, focusOffset);
    }
    return selection;
  }
  spliceText(
    offset: number,
    delCount: number,
    newText: string,
    restoreSelection?: boolean,
  ): TextNode {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error(
        'spliceText: can only be used on non-immutable text nodes',
      );
    }
    const isHashtag = this.isHashtag();
    let skipSelectionRestoration = false;
    let handledText = newText;
    // Handle hashtag containing whitespace
    if (isHashtag) {
      const whiteSpaceIndex = handledText.search(/\s/);

      if (whiteSpaceIndex !== -1) {
        handledText = newText.slice(0, whiteSpaceIndex);
        const splitTextStr = newText.slice(whiteSpaceIndex);
        const textNode = createTextNode(splitTextStr);
        this.insertAfter(textNode);
        if (restoreSelection) {
          textNode.select();
          skipSelectionRestoration = true;
        }
        const parent = this.getParentOrThrow();
        parent.normalizeTextNodes(true);
      }
    }
    const writableSelf = getWritableNode(this);
    const text = writableSelf.__text;
    const handledTextLength = handledText.length;
    let index = offset;
    if (index < 0) {
      index = handledTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    const updatedText =
      text.slice(0, index) + handledText + text.slice(index + delCount);
    writableSelf.__text = updatedText;
    // If the hash gets removed, remove the hashtag status
    if (isHashtag && updatedText.indexOf('#') === -1) {
      const flags = this.getTextNodeFormatFlags('hashtag', null);
      this.setFlags(flags);
    }
    if (restoreSelection && !skipSelectionRestoration) {
      const key = writableSelf.__key;
      if (key === null) {
        throw new Error('TODO: validate nodes have keys in a more generic way');
      }
      const selection = getSelection();
      invariant(selection !== null, 'spliceText: selection not found');
      const newOffset = offset + handledTextLength;
      selection.setRange(key, newOffset, key, newOffset);
    }
    return writableSelf;
  }
  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    shouldErrorOnReadOnly();
    return splitText(this, splitOffsets);
  }
}

export function createTextNode(text?: string = ''): TextNode {
  return new TextNode(text);
}
