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
import type {EditorConfig, TextNodeThemeClasses} from './OutlineEditor';

import {OutlineNode} from './OutlineNode';
import {
  getSelection,
  makeSelection,
  updateElementSelectionOnCreateDeleteNode,
  adjustPointOffsetForMergedSibling,
} from './OutlineSelection';
import {
  getCompositionKey,
  setCompositionKey,
  toggleTextFormatType,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {errorOnReadOnly} from './OutlineUpdates';
import {
  IS_CODE,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  IS_UNMERGEABLE,
  NO_BREAK_SPACE_CHAR,
  TEXT_TYPE_TO_FORMAT,
} from './OutlineConstants';

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'code';

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

function getCachedTextClassNameArray(
  textNodeClassNamesTheme: TextNodeThemeClasses,
  textNodeClassNameThemeType: string,
): Array<string> | void {
  const classNames = textNodeClassNamesTheme[textNodeClassNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = classNames.split(' ');
    textNodeClassNamesTheme[textNodeClassNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}

function setTextThemeClassNames(
  tag: string,
  prevFormat: number,
  nextFormat: number,
  dom: HTMLElement,
  textClassNames: TextNodeThemeClasses,
): void {
  const domClassList = dom.classList;
  // Firstly we handle the base theme.
  let classNames = getCachedTextClassNameArray(textClassNames, 'base');
  if (classNames !== undefined) {
    domClassList.add(...classNames);
  }
  // Secondly we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  classNames = getCachedTextClassNameArray(
    textClassNames,
    'underlineStrikethrough',
  );
  let hasUnderlineStrikethrough = false;
  const prevUnderlineStrikethrough =
    prevFormat & IS_UNDERLINE && prevFormat & IS_STRIKETHROUGH;
  const nextUnderlineStrikethrough =
    nextFormat & IS_UNDERLINE && nextFormat & IS_STRIKETHROUGH;

  if (classNames !== undefined) {
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
    classNames = getCachedTextClassNameArray(textClassNames, key);
    if (classNames !== undefined) {
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
        if (
          (prevFormat & flag) === 0 ||
          (prevUnderlineStrikethrough && key === 'underline') ||
          key === 'strikethrough'
        ) {
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
  // Always add a suffix if we're composing a node
  const suffix = isComposing ? NO_BREAK_SPACE_CHAR : '';
  const text = nextText + suffix;

  if (firstChild == null) {
    dom.textContent = text;
  } else if (firstChild.nodeValue !== text) {
    firstChild.nodeValue = text;
  }
}

function createTextInnerDOM<EditorContext>(
  innerDOM: HTMLElement,
  node: TextNode,
  innerTag: string,
  format: number,
  text: string,
  config: EditorConfig<EditorContext>,
): void {
  setTextContent(text, innerDOM, node);
  const theme = config.theme;
  // Apply theme class names
  const textClassNames = theme.text;

  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames);
  }
}

export class TextNode extends OutlineNode {
  __text: string;
  __format: number;
  __style: string;

  static getType(): string {
    return 'text';
  }

  static clone(node: $FlowFixMe): TextNode {
    return new TextNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__format = 0;
    this.__style = '';
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }
  getStyle(): string {
    const self = this.getLatest();
    return self.__style;
  }
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
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
  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest<TextNode>();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  // View

  // $FlowFixMe: Revise typings for EditorContext
  createDOM<EditorContext: Object>(
    config: EditorConfig<EditorContext>,
  ): HTMLElement {
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
    createTextInnerDOM(innerDOM, this, innerTag, format, text, config);
    const style = this.__style;
    if (style !== '') {
      dom.style.cssText = style;
    }
    return dom;
  }
  // $FlowFixMe: Revise typings for EditorContext
  updateDOM<EditorContext: Object>(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
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
        config,
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
    const theme = config.theme;
    // Apply theme class names
    const textClassNames = theme.text;

    if (textClassNames !== undefined && prevFormat !== nextFormat) {
      setTextThemeClassNames(
        nextInnerTag,
        prevFormat,
        nextFormat,
        innerDOM,
        textClassNames,
      );
    }
    const prevStyle = prevNode.__style;
    const nextStyle = this.__style;
    if (prevStyle !== nextStyle) {
      dom.style.cssText = nextStyle;
    }
    return false;
  }

  // Mutators
  selectionTransform(
    prevSelection: null | Selection,
    nextSelection: Selection,
  ): void {}
  setFormat(format: number): this {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(false, 'setFormat: can only be used on non-immutable nodes');
    }
    const self = this.getWritable();
    this.getWritable().__format = format;
    return self;
  }
  setStyle(style: string): this {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(false, 'setStyle: can only be used on non-immutable nodes');
    }
    const self = this.getWritable();
    this.getWritable().__style = style;
    return self;
  }
  toggleFormat(type: TextFormatType): TextNode {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return this.setFormat(this.getFormat() ^ formatFlag);
  }
  toggleUnmergeable(): TextNode {
    return this.setFlags(this.getFlags() ^ IS_UNMERGEABLE);
  }
  setTextContent(text: string): TextNode {
    errorOnReadOnly();
    if (this.isImmutable()) {
      invariant(
        false,
        'setTextContent: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = this.getWritable();
    writableSelf.__text = text;
    return writableSelf;
  }
  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    errorOnReadOnly();
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
      return makeSelection(key, anchorOffset, key, focusOffset, 'text', 'text');
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
    moveSelection?: boolean,
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
    const selection = getSelection();
    if (moveSelection && selection !== null) {
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
    return writableSelf.setTextContent(updatedText);
  }
  canInsertTextBefore(): boolean {
    return true;
  }
  canInsertTextAfter(): boolean {
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
    const compositionKey = getCompositionKey();
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
    const format = this.getFormat();
    const style = this.getStyle();
    let hasReplacedSelf = false;

    if (this.isSegmented()) {
      // Create a new TextNode
      writableNode = otlnCreateTextNode(firstPart);
      writableNode.__parent = parentKey;
      writableNode.__format = format;
      writableNode.__style = style;
      hasReplacedSelf = true;
    } else {
      // For the first part, update the existing node
      writableNode = this.getWritable();
      writableNode.__text = firstPart;
    }

    // Handle selection
    const selection = getSelection();

    // Then handle all other parts
    const splitNodes = [writableNode];
    let textSize = firstPart.length;
    for (let i = 1; i < partsLength; i++) {
      const part = parts[i];
      const partSize = part.length;
      const sibling = otlnCreateTextNode(part).getWritable();
      sibling.__format = format;
      sibling.__style = style;
      const siblingKey = sibling.__key;
      const nextTextSize = textSize + partSize;

      if (selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;

        if (
          anchor.key === key &&
          anchor.type === 'text' &&
          anchor.offset > textSize &&
          anchor.offset <= nextTextSize
        ) {
          anchor.key = siblingKey;
          anchor.offset -= textSize;
          selection.dirty = true;
        }
        if (
          focus.key === key &&
          focus.type === 'text' &&
          focus.offset > textSize &&
          focus.offset <= nextTextSize
        ) {
          focus.key = siblingKey;
          focus.offset -= textSize;
          selection.dirty = true;
        }
      }
      if (compositionKey === key) {
        setCompositionKey(siblingKey);
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
    if (hasReplacedSelf) {
      writableParentChildren.splice(insertionIndex, 0, ...splitNodesKeys);
      this.remove();
    } else {
      writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);
    }

    if (selection !== null) {
      updateElementSelectionOnCreateDeleteNode(
        selection,
        parent,
        insertionIndex,
        partsLength - 1,
      );
    }

    return splitNodes;
  }
  mergeWithSibling(target: TextNode): void {
    const isBefore = target === this.getPreviousSibling();
    if (!isBefore && target !== this.getNextSibling()) {
      invariant(
        false,
        'mergeWithSibling: sibling must be a previous or next sibling',
      );
    }
    const key = this.__key;
    const targetKey = target.__key;
    const text = this.__text;
    const textLength = text.length;
    const compositionKey = getCompositionKey();

    if (compositionKey === targetKey) {
      setCompositionKey(key);
    }
    const selection = getSelection();

    if (selection !== null) {
      const anchor = selection.anchor;
      const focus = selection.focus;
      if (anchor !== null && anchor.key === targetKey) {
        adjustPointOffsetForMergedSibling(
          anchor,
          isBefore,
          key,
          target,
          textLength,
        );
        selection.dirty = true;
      }
      if (focus !== null && focus.key === targetKey) {
        adjustPointOffsetForMergedSibling(
          focus,
          isBefore,
          key,
          target,
          textLength,
        );
        selection.dirty = true;
      }
    }
    this.setTextContent(text + target.__text);
    target.remove();
  }
}

export function otlnCreateTextNode(text?: string = ''): TextNode {
  return new TextNode(text);
}

export function isTextNode(node: ?OutlineNode): boolean %checks {
  return node instanceof TextNode;
}
