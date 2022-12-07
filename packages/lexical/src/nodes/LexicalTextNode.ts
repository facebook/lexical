/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, TextNodeThemeClasses} from '../LexicalEditor';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  SerializedLexicalNode,
} from '../LexicalNode';
import type {
  GridSelection,
  NodeSelection,
  RangeSelection,
} from '../LexicalSelection';
import type {Spread} from 'lexical';

import {IS_FIREFOX} from 'shared/environment';
import invariant from 'shared/invariant';

import {
  COMPOSITION_SUFFIX,
  DETAIL_TYPE_TO_DETAIL,
  IS_BOLD,
  IS_CODE,
  IS_DIRECTIONLESS,
  IS_ITALIC,
  IS_SEGMENTED,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_TOKEN,
  IS_UNDERLINE,
  IS_UNMERGEABLE,
  TEXT_MODE_TO_TYPE,
  TEXT_TYPE_TO_FORMAT,
  TEXT_TYPE_TO_MODE,
} from '../LexicalConstants';
import {LexicalNode} from '../LexicalNode';
import {
  $getSelection,
  $isRangeSelection,
  $updateElementSelectionOnCreateDeleteNode,
  adjustPointOffsetForMergedSibling,
  internalMakeRangeSelection,
} from '../LexicalSelection';
import {errorOnReadOnly} from '../LexicalUpdates';
import {
  $applyNodeReplacement,
  $getCompositionKey,
  $setCompositionKey,
  getCachedClassNameArray,
  internalMarkSiblingsAsDirty,
  toggleTextFormatType,
} from '../LexicalUtils';

export type SerializedTextNode = Spread<
  {
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
  },
  SerializedLexicalNode
>;

export type TextDetailType = 'directionless' | 'unmergable';

export type TextFormatType =
  | 'bold'
  | 'underline'
  | 'strikethrough'
  | 'italic'
  | 'code'
  | 'subscript'
  | 'superscript';

export type TextModeType = 'normal' | 'token' | 'segmented';

export type TextMark = {end: null | number; id: string; start: null | number};

export type TextMarks = Array<TextMark>;

function getElementOuterTag(node: TextNode, format: number): string | null {
  if (format & IS_CODE) {
    return 'code';
  }
  if (format & IS_SUBSCRIPT) {
    return 'sub';
  }
  if (format & IS_SUPERSCRIPT) {
    return 'sup';
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
  textClassNames: TextNodeThemeClasses,
): void {
  const domClassList = dom.classList;
  // Firstly we handle the base theme.
  let classNames = getCachedClassNameArray(textClassNames, 'base');
  if (classNames !== undefined) {
    domClassList.add(...classNames);
  }
  // Secondly we handle the special case: underline + strikethrough.
  // We have to do this as we need a way to compose the fact that
  // the same CSS property will need to be used: text-decoration.
  // In an ideal world we shouldn't have to do this, but there's no
  // easy workaround for many atomic CSS systems today.
  classNames = getCachedClassNameArray(
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
    const format = key;
    const flag = TEXT_TYPE_TO_FORMAT[format];
    classNames = getCachedClassNameArray(textClassNames, key);
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

function diffComposedText(a: string, b: string): [number, number, string] {
  const aLength = a.length;
  const bLength = b.length;
  let left = 0;
  let right = 0;

  while (left < aLength && left < bLength && a[left] === b[left]) {
    left++;
  }
  while (
    right + left < aLength &&
    right + left < bLength &&
    a[aLength - right - 1] === b[bLength - right - 1]
  ) {
    right++;
  }

  return [left, aLength - left - right, b.slice(left, bLength - right)];
}

function setTextContent(
  nextText: string,
  dom: HTMLElement,
  node: TextNode,
): void {
  const firstChild = dom.firstChild;
  const isComposing = node.isComposing();
  // Always add a suffix if we're composing a node
  const suffix = isComposing ? COMPOSITION_SUFFIX : '';
  const text: string = nextText + suffix;

  if (firstChild == null) {
    dom.textContent = text;
  } else {
    const nodeValue = firstChild.nodeValue;
    if (nodeValue !== text) {
      if (isComposing || IS_FIREFOX) {
        // We also use the diff composed text for general text in FF to avoid
        // the spellcheck red line from flickering.
        const [index, remove, insert] = diffComposedText(
          nodeValue as string,
          text,
        );
        if (remove !== 0) {
          // @ts-expect-error
          firstChild.deleteData(index, remove);
        }
        // @ts-expect-error
        firstChild.insertData(index, insert);
      } else {
        firstChild.nodeValue = text;
      }
    }
  }
}

function createTextInnerDOM(
  innerDOM: HTMLElement,
  node: TextNode,
  innerTag: string,
  format: number,
  text: string,
  config: EditorConfig,
): void {
  setTextContent(text, innerDOM, node);
  const theme = config.theme;
  // Apply theme class names
  const textClassNames = theme.text;

  if (textClassNames !== undefined) {
    setTextThemeClassNames(innerTag, 0, format, innerDOM, textClassNames);
  }
}

/** @noInheritDoc */
export class TextNode extends LexicalNode {
  __text: string;
  /** @internal */
  __format: number;
  /** @internal */
  __style: string;
  /** @internal */
  __mode: 0 | 1 | 2 | 3;
  /** @internal */
  __detail: number;

  static getType(): string {
    return 'text';
  }

  static clone(node: TextNode): TextNode {
    return new TextNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(key);
    this.__text = text;
    this.__format = 0;
    this.__style = '';
    this.__mode = 0;
    this.__detail = 0;
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }

  getDetail(): number {
    const self = this.getLatest();
    return self.__detail;
  }

  getMode(): TextModeType {
    const self = this.getLatest();
    return TEXT_TYPE_TO_MODE[self.__mode];
  }

  getStyle(): string {
    const self = this.getLatest();
    return self.__style;
  }

  isToken(): boolean {
    const self = this.getLatest();
    return self.__mode === IS_TOKEN;
  }

  isComposing(): boolean {
    return this.__key === $getCompositionKey();
  }

  isSegmented(): boolean {
    const self = this.getLatest();
    return self.__mode === IS_SEGMENTED;
  }

  isDirectionless(): boolean {
    const self = this.getLatest();
    return (self.__detail & IS_DIRECTIONLESS) !== 0;
  }

  isUnmergeable(): boolean {
    const self = this.getLatest();
    return (self.__detail & IS_UNMERGEABLE) !== 0;
  }

  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  isSimpleText(): boolean {
    return this.__type === 'text' && this.__mode === 0;
  }

  getTextContent(): string {
    const self = this.getLatest();
    return self.__text;
  }

  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
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

  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig,
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
      // should always be an element
      const prevInnerDOM: HTMLElement = dom.firstChild as HTMLElement;
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
    let innerDOM = dom;
    if (nextOuterTag !== null) {
      if (prevOuterTag !== null) {
        innerDOM = dom.firstChild as HTMLElement;
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

  static importDOM(): DOMConversionMap | null {
    return {
      '#text': (node: Node) => ({
        conversion: convertTextDOMNode,
        priority: 0,
      }),
      b: (node: Node) => ({
        conversion: convertBringAttentionToElement,
        priority: 0,
      }),
      code: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      em: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      i: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      span: (node: HTMLSpanElement) => ({
        conversion: convertSpanElement,
        priority: 0,
      }),
      strong: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      sub: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      sup: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
      u: (node: Node) => ({
        conversion: convertTextFormatElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    const node = $createTextNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      detail: this.getDetail(),
      format: this.getFormat(),
      mode: this.getMode(),
      style: this.getStyle(),
      text: this.getTextContent(),
      type: 'text',
      version: 1,
    };
  }

  // Mutators
  selectionTransform(
    prevSelection: null | RangeSelection | NodeSelection | GridSelection,
    nextSelection: RangeSelection,
  ): void {
    return;
  }

  // TODO 0.5 This should just be a `string`.
  setFormat(format: TextFormatType | number): this {
    const self = this.getWritable();
    self.__format =
      typeof format === 'string' ? TEXT_TYPE_TO_FORMAT[format] : format;
    return self;
  }

  // TODO 0.5 This should just be a `string`.
  setDetail(detail: TextDetailType | number): this {
    const self = this.getWritable();
    self.__detail =
      typeof detail === 'string' ? DETAIL_TYPE_TO_DETAIL[detail] : detail;
    return self;
  }

  setStyle(style: string): this {
    const self = this.getWritable();
    self.__style = style;
    return self;
  }

  toggleFormat(type: TextFormatType): this {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return this.setFormat(this.getFormat() ^ formatFlag);
  }

  toggleDirectionless(): this {
    const self = this.getWritable();
    self.__detail ^= IS_DIRECTIONLESS;
    return self;
  }

  toggleUnmergeable(): this {
    const self = this.getWritable();
    self.__detail ^= IS_UNMERGEABLE;
    return self;
  }

  setMode(type: TextModeType): this {
    const mode = TEXT_MODE_TO_TYPE[type];
    if (this.__mode === mode) {
      return this;
    }
    const self = this.getWritable();
    self.__mode = mode;
    return self;
  }

  setTextContent(text: string): this {
    if (this.__text === text) {
      return this;
    }
    const self = this.getWritable();
    self.__text = text;
    return self;
  }

  select(_anchorOffset?: number, _focusOffset?: number): RangeSelection {
    errorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = $getSelection();
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
    if (!$isRangeSelection(selection)) {
      return internalMakeRangeSelection(
        key,
        anchorOffset,
        key,
        focusOffset,
        'text',
        'text',
      );
    } else {
      const compositionKey = $getCompositionKey();
      if (
        compositionKey === selection.anchor.key ||
        compositionKey === selection.focus.key
      ) {
        $setCompositionKey(key);
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
    const selection = $getSelection();
    if (moveSelection && $isRangeSelection(selection)) {
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

    writableSelf.__text = updatedText;
    return writableSelf;
  }

  canInsertTextBefore(): boolean {
    return true;
  }

  canInsertTextAfter(): boolean {
    return true;
  }

  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    errorOnReadOnly();
    const self = this.getLatest();
    const textContent = self.getTextContent();
    const key = self.__key;
    const compositionKey = $getCompositionKey();
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
      return [self];
    }
    const firstPart = parts[0];
    const parent = self.getParentOrThrow();
    let writableNode;
    const format = self.getFormat();
    const style = self.getStyle();
    const detail = self.__detail;
    let hasReplacedSelf = false;

    if (self.isSegmented()) {
      // Create a new TextNode
      writableNode = $createTextNode(firstPart);
      writableNode.__format = format;
      writableNode.__style = style;
      writableNode.__detail = detail;
      hasReplacedSelf = true;
    } else {
      // For the first part, update the existing node
      writableNode = self.getWritable();
      writableNode.__text = firstPart;
    }

    // Handle selection
    const selection = $getSelection();

    // Then handle all other parts
    const splitNodes: TextNode[] = [writableNode];
    let textSize = firstPart.length;

    for (let i = 1; i < partsLength; i++) {
      const part = parts[i];
      const partSize = part.length;
      const sibling = $createTextNode(part).getWritable();
      sibling.__format = format;
      sibling.__style = style;
      sibling.__detail = detail;
      const siblingKey = sibling.__key;
      const nextTextSize = textSize + partSize;

      if ($isRangeSelection(selection)) {
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
        $setCompositionKey(siblingKey);
      }
      textSize = nextTextSize;
      splitNodes.push(sibling);
    }

    // Insert the nodes into the parent's children
    internalMarkSiblingsAsDirty(this);
    const writableParent = parent.getWritable();
    const insertionIndex = this.getIndexWithinParent();
    if (hasReplacedSelf) {
      writableParent.splice(insertionIndex, 0, splitNodes);
      this.remove();
    } else {
      writableParent.splice(insertionIndex, 1, splitNodes);
    }

    if ($isRangeSelection(selection)) {
      $updateElementSelectionOnCreateDeleteNode(
        selection,
        parent,
        insertionIndex,
        partsLength - 1,
      );
    }

    return splitNodes;
  }

  mergeWithSibling(target: TextNode): TextNode {
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
    const compositionKey = $getCompositionKey();

    if (compositionKey === targetKey) {
      $setCompositionKey(key);
    }
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
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
    const targetText = target.__text;
    const newText = isBefore ? targetText + text : text + targetText;
    this.setTextContent(newText);
    const writableSelf = this.getWritable();
    target.remove();
    return writableSelf;
  }

  isTextEntity(): boolean {
    return false;
  }
}

function convertSpanElement(domNode: Node): DOMConversionOutput {
  // domNode is a <span> since we matched it by nodeName
  const span = domNode as HTMLSpanElement;
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = span.style.fontWeight === '700';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration =
    span.style.textDecoration === 'line-through';
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = span.style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = span.style.textDecoration === 'underline';
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = span.style.verticalAlign;

  return {
    forChild: (lexicalNode) => {
      if (!$isTextNode(lexicalNode)) {
        return lexicalNode;
      }
      if (hasBoldFontWeight) {
        lexicalNode.toggleFormat('bold');
      }
      if (hasLinethroughTextDecoration) {
        lexicalNode.toggleFormat('strikethrough');
      }
      if (hasItalicFontStyle) {
        lexicalNode.toggleFormat('italic');
      }
      if (hasUnderlineTextDecoration) {
        lexicalNode.toggleFormat('underline');
      }
      if (verticalAlign === 'sub') {
        lexicalNode.toggleFormat('subscript');
      }
      if (verticalAlign === 'super') {
        lexicalNode.toggleFormat('superscript');
      }

      return lexicalNode;
    },
    node: null,
  };
}
function convertBringAttentionToElement(domNode: Node): DOMConversionOutput {
  // domNode is a <b> since we matched it by nodeName
  const b = domNode as HTMLElement;
  // Google Docs wraps all copied HTML in a <b> with font-weight normal
  const hasNormalFontWeight = b.style.fontWeight === 'normal';
  return {
    forChild: (lexicalNode) => {
      if ($isTextNode(lexicalNode) && !hasNormalFontWeight) {
        lexicalNode.toggleFormat('bold');
      }

      return lexicalNode;
    },
    node: null,
  };
}
function convertTextDOMNode(
  domNode: Node,
  _parent?: Node,
  preformatted?: boolean,
): DOMConversionOutput {
  let textContent = domNode.textContent || '';
  if (!preformatted && /\n/.test(textContent)) {
    textContent = textContent.replace(/\r?\n/gm, ' ');
    if (textContent.trim().length === 0) {
      return {node: null};
    }
  }
  return {node: $createTextNode(textContent)};
}
const nodeNameToTextFormat: Record<string, TextFormatType> = {
  code: 'code',
  em: 'italic',
  i: 'italic',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
};
function convertTextFormatElement(domNode: Node): DOMConversionOutput {
  const format = nodeNameToTextFormat[domNode.nodeName.toLowerCase()];
  if (format === undefined) {
    return {node: null};
  }
  return {
    forChild: (lexicalNode) => {
      if ($isTextNode(lexicalNode)) {
        lexicalNode.toggleFormat(format);
      }

      return lexicalNode;
    },
    node: null,
  };
}

export function $createTextNode(text = ''): TextNode {
  return $applyNodeReplacement(new TextNode(text));
}

export function $isTextNode(
  node: LexicalNode | null | undefined,
): node is TextNode {
  return node instanceof TextNode;
}
