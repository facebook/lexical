/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  TextFormatType,
} from 'lexical';
import type {JSX} from 'react';

import {
  $applyNodeReplacement,
  DecoratorNode,
  TEXT_TYPE_TO_FORMAT,
  toggleTextFormatType,
} from 'lexical';

export type SerializedDecoratorTextNode = Spread<
  {
    format: number;
  },
  SerializedLexicalNode
>;

export class DecoratorTextNode extends DecoratorNode<JSX.Element> {
  __format: number;

  constructor(key?: NodeKey) {
    super(key);
    this.__format = 0;
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }

  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  setFormat(type: number): this {
    const self = this.getWritable();
    self.__format = type;
    return self;
  }

  toggleFormat(type: TextFormatType): this {
    const format = this.getFormat();
    const newFormat = toggleTextFormatType(format, type, null);
    return this.setFormat(newFormat);
  }

  isInline(): true {
    return true;
  }

  exportJSON(): SerializedDecoratorTextNode {
    return {
      ...super.exportJSON(),
      format: this.__format || 0,
    };
  }

  static importJSON(serializedNode: SerializedDecoratorTextNode) {
    return $createDecoratorTextNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedDecoratorTextNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setFormat(serializedNode.format || 0);
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__format = prevNode.__format;
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }
}

export function $createDecoratorTextNode() {
  return $applyNodeReplacement(new DecoratorTextNode());
}

export function $isDecoratorTextNode(
  node: LexicalNode | null | undefined,
): node is DecoratorTextNode {
  return node instanceof DecoratorTextNode;
}

/**
 * Applies formatting to the node based on the properties in the passed style object.
 * By default, properties are checked according to the values set
 * when importing content from Google Docs.
 * This algorithm is identical to the TextNode import.
 *
 * @param lexicalNode The node to which the format will apply
 * @param style CSS style object
 * @param shouldApply format to apply if it is not in style
 * @returns lexicalNode
 */
export function applyFormatFromStyle(
  lexicalNode: DecoratorTextNode,
  style: CSSStyleDeclaration,
  shouldApply?: TextFormatType,
) {
  const fontWeight = style.fontWeight;
  const textDecoration = style.textDecoration.split(' ');
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = fontWeight === '700' || fontWeight === 'bold';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = style.verticalAlign;

  if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
    lexicalNode.toggleFormat('bold');
  }
  if (hasLinethroughTextDecoration && !lexicalNode.hasFormat('strikethrough')) {
    lexicalNode.toggleFormat('strikethrough');
  }
  if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
    lexicalNode.toggleFormat('italic');
  }
  if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
    lexicalNode.toggleFormat('underline');
  }
  if (verticalAlign === 'sub' && !lexicalNode.hasFormat('subscript')) {
    lexicalNode.toggleFormat('subscript');
  }
  if (verticalAlign === 'super' && !lexicalNode.hasFormat('superscript')) {
    lexicalNode.toggleFormat('superscript');
  }
  if (shouldApply && !lexicalNode.hasFormat(shouldApply)) {
    lexicalNode.toggleFormat(shouldApply);
  }

  return lexicalNode;
}

/**
 * The function wraps the passed DOM node in semantic tags depending on the node format.
 *
 * @param lexicalNode The node where the format is checked
 * @param domNode DOM that will be wrapped in tags
 * @param tagNameToFormat Tag name and format mapping
 * @returns domNode
 */
export function applyFormatToDom(
  lexicalNode: DecoratorTextNode,
  domNode: Text | HTMLElement,
  tagNameToFormat = DEFAULT_TAG_NAME_TO_FORMAT,
) {
  for (const [tag, format] of Object.entries(tagNameToFormat)) {
    if (lexicalNode.hasFormat(format)) {
      domNode = wrapElementWith(domNode, tag);
    }
  }
  return domNode;
}

function wrapElementWith(
  element: HTMLElement | Text,
  tag: string,
): HTMLElement {
  const el = document.createElement(tag);
  el.appendChild(element);
  return el;
}

const DEFAULT_TAG_NAME_TO_FORMAT: {[key: string]: TextFormatType} = {
  b: 'bold',
  code: 'code',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
};
