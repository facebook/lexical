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
import {
  getTextDirection,
  isArray,
  isImmutableOrInertOrSegmented,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {errorOnReadOnly} from './OutlineView';
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
  IS_DIRTY_DECORATOR,
  IS_UNMERGEABLE,
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

function setTextThemeClassNames(
  tag: string,
  prevFlags: number,
  nextFlags: number,
  dom: HTMLElement,
  textClassNames,
): void {
  const domClassList = dom.classList;
  // First we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  let classNames = textClassNames.underlineStrikethrough;
  let hasUnderlineStrikethrough = false;
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
      hasUnderlineStrikethrough = true;
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames);
      }
    } else if (prevUnderlineStrikethrough) {
      domClassList.remove(...classNames);
    }
  }

  for (const key in textFormatStateFlags) {
    // $FlowFixMe: expected cast here
    const format: TextFormatType = key;
    const flag = textFormatStateFlags[format];
    classNames = textClassNames[key];
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
        if (
          hasUnderlineStrikethrough &&
          (key === 'underline' || key === 'strikethrough')
        ) {
          if (prevFlags & flag) {
            domClassList.remove(...classNames);
          }
          continue;
        }
        if ((prevFlags & flag) === 0) {
          domClassList.add(...classNames);
        }
      } else if (prevFlags & flag) {
        domClassList.remove(...classNames);
      }
    }
  }
}

function setTextContent(
  nextText: string,
  dom: HTMLElement,
  node: TextNode,
): void {
  const firstChild = dom.firstChild;
  // We only prefix normal nodes with the byte order mark.
  const prefix = isImmutableOrInertOrSegmented(node) ? '' : BYTE_ORDER_MARK;
  if (firstChild == null) {
    dom.textContent = prefix + nextText;
  } else if (firstChild.nodeValue !== prefix + nextText) {
    firstChild.nodeValue = prefix + nextText;
  }
}

function createTextInnerDOM(
  innerDOM: HTMLElement,
  node: TextNode,
  innerTag: string,
  flags: number,
  text: string,
  editorThemeClasses: EditorThemeClasses,
): void {
  setTextContent(text, innerDOM, node);
  // Apply theme class names
  const textClassNames = editorThemeClasses.text;

  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, flags, innerDOM, textClassNames);
  }
}

export class TextNode extends OutlineNode {
  __text: string;
  __url: null | string;

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__type = 'text';
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
    return (this.getFlags() & IS_BOLD) !== 0;
  }
  isItalic(): boolean {
    return (this.getFlags() & IS_ITALIC) !== 0;
  }
  isStrikethrough(): boolean {
    return (this.getFlags() & IS_STRIKETHROUGH) !== 0;
  }
  isUnderline(): boolean {
    return (this.getFlags() & IS_UNDERLINE) !== 0;
  }
  isCode(): boolean {
    return (this.getFlags() & IS_CODE) !== 0;
  }
  isLink(): boolean {
    return (this.getFlags() & IS_LINK) !== 0;
  }
  isHashtag(): boolean {
    return (this.getFlags() & IS_HASHTAG) !== 0;
  }
  isOverflowed(): boolean {
    return (this.getFlags() & IS_OVERFLOWED) !== 0;
  }
  isUnmergeable(): boolean {
    return (this.getFlags() & IS_UNMERGEABLE) !== 0;
  }
  getURL(): null | string {
    return this.__url;
  }
  markDirtyDecorator(): void {
    errorOnReadOnly();
    const self = getWritableNode(this);
    self.__flags |= IS_DIRTY_DECORATOR;
  }
  getTextContent(includeInert?: boolean, includeDirectionless?: false): string {
    if (
      (!includeInert && this.isInert()) ||
      (includeDirectionless === false && this.isDirectionless())
    ) {
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
    createTextInnerDOM(
      innerDOM,
      this,
      innerTag,
      flags,
      text,
      editorThemeClasses,
    );
    return dom;
  }
  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    editorThemeClasses: EditorThemeClasses,
  ): boolean {
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
    if (prevOuterTag === nextOuterTag && prevInnerTag !== nextInnerTag) {
      // $FlowFixMe: should always be an element
      const prevInnerDOM: HTMLElement = dom.firstChild;
      if (prevInnerDOM == null) {
        invariant(false, 'updateDOM: prevInnerDOM is null or undefined');
      }
      const nextInnerDOM = document.createElement(nextInnerTag);
      createTextInnerDOM(
        nextInnerDOM,
        this,
        nextInnerTag,
        nextFlags,
        nextText,
        editorThemeClasses,
      );
      dom.replaceChild(nextInnerDOM, prevInnerDOM);
      return false;
    }
    let innerDOM: HTMLElement = dom;
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        // $FlowFixMe: should always be an element
        innerDOM = dom.firstChild;
        if (innerDOM == null) {
          invariant(false, 'updateDOM: innerDOM is null or undefined');
        }
      }
    }
    setTextContent(nextText, innerDOM, this);
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
  selectionTransform(
    prevSelection: null | Selection,
    nextSelection: Selection,
  ): void {}

  // Mutators
  toggleOverflowed(): TextNode {
    const flags = this.getFlags();
    return this.setFlags(flags ^ IS_OVERFLOWED);
  }
  toggleHashtag(): TextNode {
    const flags = this.getFlags();
    return this.setFlags(flags ^ IS_HASHTAG);
  }
  toggleUnmergeable(): TextNode {
    const flags = this.getFlags();
    return this.setFlags(flags ^ IS_UNMERGEABLE);
  }
  setURL(url: string | null): TextNode {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(false, 'setURL: can only be used on non-immutable text nodes');
    }
    const writableSelf = getWritableNode(this);
    writableSelf.__url = url;
    return writableSelf;
  }
  setTextContent(text: string): boolean {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(
        false,
        'setTextContent: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = getWritableNode(this);

    // Handle text direction and update text content
    const topBlock = this.getTopParentBlock();
    if (topBlock !== null) {
      const topBlockWasEmpty =
        text === '' && topBlock.getTextContent(false, false) === '';

      writableSelf.__text = text;
      const prevDirection = topBlock.getDirection();
      if (prevDirection === null || topBlockWasEmpty) {
        const direction = getTextDirection(text);
        if (direction !== null) {
          topBlock.setDirection(direction);
        }
      } else if (
        prevDirection !== null &&
        text === '' &&
        topBlock.getTextContent() === ''
      ) {
        topBlock.setDirection(null);
      }
    } else {
      writableSelf.__text = text;
    }

    const isHashtag = this.isHashtag();
    // Handle hashtags
    let requireNormalize = false;
    if (isHashtag) {
      const indexOfHash = text.indexOf('#');
      let targetNode = this;
      if (indexOfHash === -1) {
        targetNode.toggleHashtag();
        requireNormalize = true;
      } else if (indexOfHash > 0) {
        [, targetNode] = this.splitText(indexOfHash);
        targetNode.toggleHashtag();
        requireNormalize = true;
      }
      // Check for invalid characters
      const targetTextContent = targetNode.getTextContent().slice(1);
      const indexOfInvalidChar = targetTextContent.search(
        /[\s.,\\\/#!$%\^&\*;:{}=\-`~()]/,
      );
      if (indexOfInvalidChar === 0) {
        targetNode.toggleHashtag();
        requireNormalize = true;
      } else if (indexOfInvalidChar > 0) {
        [targetNode] = targetNode.splitText(indexOfInvalidChar + 1);
        targetNode.toggleHashtag();
        requireNormalize = true;
      }
    }
    return requireNormalize;
  }
  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    errorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this.__key;
    if (key === null) {
      invariant(
        false,
        'select: TODO? validate nodes have keys in a more generic way',
      );
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
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(
        false,
        'spliceText: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = getWritableNode(this);
    const text = writableSelf.__text;
    const handledTextLength = newText.length;
    let index = offset;
    if (index < 0) {
      index = handledTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    if (restoreSelection) {
      const key = writableSelf.__key;
      if (key === null) {
        invariant(
          false,
          'spliceText: TODO? validate nodes have keys in a more generic way',
        );
      }
      const selection = getSelection();
      if (selection === null) {
        invariant(false, 'spliceText: selection not found');
      }
      const newOffset = offset + handledTextLength;
      selection.setRange(key, newOffset, key, newOffset);
    }

    const updatedText =
      text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf.setTextContent(updatedText);

    return writableSelf;
  }
  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(
        false,
        'splitText: can only be used on non-immutable text nodes',
      );
    }
    const textContent = this.getTextContent();
    const key = this.__key;
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
    if (this.isHashtag()) {
      this.toggleHashtag();
    }
    const partsLength = parts.length;
    if (partsLength === 0) {
      return [];
    } else if (parts[0] === textContent) {
      return [this];
    }
    // For the first part, update the existing node
    const writableNode = getWritableNode(this);
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
    const parent = this.getParentOrThrow();
    const writableParent = getWritableNode(parent);
    const writableParentChildren = writableParent.__children;
    const insertionIndex = writableParentChildren.indexOf(key);
    const splitNodesKeys = splitNodes.map((splitNode) => splitNode.__key);
    writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);

    return splitNodes;
  }
}

export function createTextNode(text?: string = ''): TextNode {
  return new TextNode(text);
}

export function isTextNode(node: ?OutlineNode): boolean %checks {
  return node instanceof TextNode;
}
