/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Selection} from './OutlineSelection';
import type {NodeKey, ParsedNode} from './OutlineNode';
import type {EditorThemeClasses} from './OutlineEditor';

import {OutlineNode, setCompositionKey, getCompositionKey} from './OutlineNode';
import {getSelection, makeSelection} from './OutlineSelection';
import {
  getTextDirection,
  isArray,
  isImmutableOrInertOrSegmented,
  toggleTextFormatType,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {errorOnReadOnly} from './OutlineView';
import {
  IS_CODE,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_OVERFLOWED,
  IS_UNMERGEABLE,
  ZERO_WIDTH_JOINER_CHAR,
  NO_BREAK_SPACE_CHAR,
  TEXT_TYPE_TO_FORMAT,
} from './OutlineConstants';

export type ParsedTextNode = {
  ...ParsedNode,
  __text: string,
};

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'code'
  | 'overflowed';

function getElementOuterTag(node: TextNode, format: number): string | null {
  if (format & IS_CODE) {
    return 'code';
  }
  return null;
}

function getElementInnerTag(node: TextNode, format: number): string {
  if (format & IS_BOLD) {
    return 'strong';
  }
  if (format & IS_ITALIC) {
    return 'em';
  }
  return 'span';
}

function setTextThemeClassNames(
  tag: string,
  prevFormat: number,
  nextFormat: number,
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
      prevFormat & IS_UNDERLINE && prevFormat & IS_STRIKETHROUGH;
    const nextUnderlineStrikethrough =
      nextFormat & IS_UNDERLINE && nextFormat & IS_STRIKETHROUGH;
    if (nextUnderlineStrikethrough) {
      hasUnderlineStrikethrough = true;
      if (!prevUnderlineStrikethrough) {
        domClassList.add(...classNames);
      }
    } else if (prevUnderlineStrikethrough) {
      domClassList.remove(...classNames);
    }
  }

  for (const key in TEXT_TYPE_TO_FORMAT) {
    // $FlowFixMe: expected cast here
    const format: TextFormatType = key;
    const flag = TEXT_TYPE_TO_FORMAT[format];
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
      if (nextFormat & flag) {
        if (
          hasUnderlineStrikethrough &&
          (key === 'underline' || key === 'strikethrough')
        ) {
          if (prevFormat & flag) {
            domClassList.remove(...classNames);
          }
          continue;
        }
        if ((prevFormat & flag) === 0) {
          domClassList.add(...classNames);
        }
      } else if (prevFormat & flag) {
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
  const isComposing = node.isComposing();
  // We only prefix normal nodes with the byte order mark.
  const prefix =
    isImmutableOrInertOrSegmented(node) || nextText !== '' || isComposing
      ? ''
      : ZERO_WIDTH_JOINER_CHAR;

  // Always add a suffix if we're composing a node
  const suffix = isComposing ? NO_BREAK_SPACE_CHAR : '';
  const text = prefix + nextText + suffix;

  if (firstChild == null) {
    dom.textContent = text;
  } else if (firstChild.nodeValue !== text) {
    firstChild.nodeValue = text;
  }
  let possibleLineBreak = dom.lastChild;
  if (possibleLineBreak != null) {
    const parent = node.getParent();
    const needsLineBreak =
      nextText === '' && parent !== null && parent.__children.length === 1;
    if (needsLineBreak && possibleLineBreak.nodeType === 3) {
      possibleLineBreak = document.createElement('br');
      dom.appendChild(possibleLineBreak);
    } else if (!needsLineBreak && possibleLineBreak.nodeType !== 3) {
      dom.removeChild(possibleLineBreak);
    }
  }
}

function createTextInnerDOM(
  innerDOM: HTMLElement,
  node: TextNode,
  innerTag: string,
  format: number,
  text: string,
  editorThemeClasses: EditorThemeClasses,
): void {
  setTextContent(text, innerDOM, node);
  // Apply theme class names
  const textClassNames = editorThemeClasses.text;

  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames);
  }
}

export class TextNode extends OutlineNode {
  __text: string;
  __format: number;

  static deserialize(data: $FlowFixMe): TextNode {
    return new TextNode(data.__text);
  }

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__type = 'text';
    this.__format = 0;
  }
  clone(): TextNode {
    return new TextNode(this.__text, this.__key);
  }
  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }
  isBold(): boolean {
    return (this.getFormat() & IS_BOLD) !== 0;
  }
  isItalic(): boolean {
    return (this.getFormat() & IS_ITALIC) !== 0;
  }
  isStrikethrough(): boolean {
    return (this.getFormat() & IS_STRIKETHROUGH) !== 0;
  }
  isUnderline(): boolean {
    return (this.getFormat() & IS_UNDERLINE) !== 0;
  }
  isCode(): boolean {
    return (this.getFormat() & IS_CODE) !== 0;
  }
  isOverflowed(): boolean {
    return (this.getFormat() & IS_OVERFLOWED) !== 0;
  }
  isUnmergeable(): boolean {
    return (this.getFlags() & IS_UNMERGEABLE) !== 0;
  }
  isSimpleText(): boolean {
    return (
      this.__type === 'text' &&
      !this.isImmutable() &&
      !this.isInert() &&
      !this.isSegmented()
    );
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
  getTextNodeFormat(
    type: TextFormatType,
    alignWithFormat: null | number,
  ): number {
    const self = this.getLatest<TextNode>();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const format = this.__format;
    const outerTag = getElementOuterTag(this, format);
    const innerTag = getElementInnerTag(this, format);
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
      format,
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
    const prevFormat = prevNode.__format;
    const nextFormat = this.__format;
    const prevOuterTag = getElementOuterTag(this, prevFormat);
    const nextOuterTag = getElementOuterTag(this, nextFormat);
    const prevInnerTag = getElementInnerTag(this, prevFormat);
    const nextInnerTag = getElementInnerTag(this, nextFormat);
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
        nextFormat,
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

    if (textClassNames !== undefined && prevFormat !== nextFormat) {
      setTextThemeClassNames(
        nextInnerTag,
        prevFormat,
        nextFormat,
        innerDOM,
        textClassNames,
      );
    }
    return false;
  }

  // Mutators
  setFormat(format: number): this {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(false, 'setFormat: can only be used on non-immutable nodes');
    }
    const self = this.getWritable();
    this.getWritable().__format = format;
    return self;
  }
  toggleBold(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_BOLD);
  }
  toggleItalics(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_ITALIC);
  }
  toggleStrikethrough(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_STRIKETHROUGH);
  }
  toggleUnderline(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_UNDERLINE);
  }
  toggleCode(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_CODE);
  }
  toggleOverflowed(): TextNode {
    return this.setFormat(this.getFormat() ^ IS_OVERFLOWED);
  }
  toggleUnmergeable(): TextNode {
    return this.setFlags(this.getFlags() ^ IS_UNMERGEABLE);
  }
  setTextContent(text: string): void {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(
        false,
        'setTextContent: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = this.getWritable();

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
  }
  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    errorOnReadOnly();
    if (this.isImmutable()) {
      return this.selectNext(0, 0);
    }
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this.__key;
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
      return makeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'character',
        'character',
      );
    } else {
      const compositionKey = getCompositionKey();
      if (
        compositionKey === selection.anchor.key ||
        compositionKey === selection.focus.key
      ) {
        setCompositionKey(key);
      }
      selection.setTextNodeRange(this, anchorOffset, this, focusOffset);
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
    const writableSelf = this.getWritable();
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
      selection.setTextNodeRange(
        writableSelf,
        newOffset,
        writableSelf,
        newOffset,
      );
    }

    const updatedText =
      text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf.setTextContent(updatedText);

    return writableSelf;
  }
  canInsertTextAtEnd(): boolean {
    return true;
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
    const partsLength = parts.length;
    if (partsLength === 0) {
      return [];
    } else if (parts[0] === textContent) {
      return [this];
    }
    const firstPart = parts[0];
    const parent = this.getParentOrThrow();
    const parentKey = parent.__key;
    let writableNode;
    let flags;
    let format;
    if (this.isSegmented()) {
      // Create a new TextNode
      writableNode = createTextNode(firstPart);
      writableNode.__parent = parentKey;
      flags = writableNode.__flags;
      format = writableNode.__format;
      this.remove();
    } else {
      // For the first part, update the existing node
      writableNode = this.getWritable();
      writableNode.__text = firstPart;
      flags = writableNode.__flags;
      format = writableNode.__format;
    }

    // Handle selection
    const selection = getSelection();

    // Then handle all other parts
    const splitNodes = [writableNode];
    let textSize = firstPart.length;
    for (let i = 1; i < partsLength; i++) {
      const part = parts[i];
      const partSize = part.length;
      const sibling = createTextNode(part).getWritable();
      sibling.__flags = flags;
      sibling.__format = format;
      const siblingKey = sibling.__key;
      const nextTextSize = textSize + partSize;

      if (selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;

        if (
          anchor.key === key &&
          anchor.type === 'character' &&
          anchor.offset > textSize &&
          anchor.offset <= nextTextSize
        ) {
          anchor.key = siblingKey;
          anchor.offset -= textSize;
          selection.isDirty = true;
        }
        if (
          focus.key === key &&
          focus.type === 'character' &&
          focus.offset > textSize &&
          focus.offset <= nextTextSize
        ) {
          focus.key = siblingKey;
          focus.offset -= textSize;
          selection.isDirty = true;
        }
      }
      textSize = nextTextSize;
      sibling.__parent = parentKey;
      splitNodes.push(sibling);
    }

    // Insert the nodes into the parent's children
    const writableParent = parent.getWritable();
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
