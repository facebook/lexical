// @flow strict

import type {Selection} from './OutlineSelection';
import type {NodeKey} from './OutlineNode';

import {Node} from './OutlineNode';
import {
  getWritableNode,
  IS_IMMUTABLE,
  IS_SEGMENTED,
  HAS_DIRECTION,
} from './OutlineNode';
import {getSelection, makeSelection} from './OutlineSelection';
import {invariant} from './OutlineUtils';
import {shouldErrorOnReadOnly} from './OutlineView';

const IS_BOLD = 1 << 3;
const IS_ITALIC = 1 << 4;
const IS_STRIKETHROUGH = 1 << 5;
const IS_UNDERLINE = 1 << 6;
const IS_CODE = 1 << 7;
const IS_LINK = 1 << 8;

// Do not import these from shared, otherwise we will bundle
// all of shared too.
const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;
const FORMAT_CODE = 4;
const FORMAT_LINK = 5;

const zeroWidthString = '\uFEFF';

export type SelectionFragment = {
  root: Node,
  nodeMap: {[string]: Node},
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
  const key = node._key;
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
  const parentKey = writableNode._parent;
  const firstPart = parts[0];
  const flags = writableNode._flags;
  writableNode._text = firstPart;

  // Handle selection
  const selection = getSelection();

  // Then handle all other parts
  const splitNodes = [writableNode];
  let textSize = firstPart.length;
  for (let i = 1; i < partsLength; i++) {
    const part = parts[i];
    const partSize = part.length;
    const sibling = getWritableNode(createTextNode(part));
    sibling._flags = flags;
    const siblingKey = sibling._key;
    const nextTextSize = textLength + partSize;

    if (selection !== null) {
      const anchorOffset = selection.anchorOffset;
      const focusOffset = selection.focusOffset;

      if (
        selection !== null &&
        selection.anchorKey === key &&
        anchorOffset > textSize &&
        anchorOffset < nextTextSize
      ) {
        selection.anchorKey = siblingKey;
        selection.anchorOffset = anchorOffset - textSize;
        selection.isDirty = true;
      }
      if (
        selection.focusKey === key &&
        focusOffset > textSize &&
        focusOffset < nextTextSize
      ) {
        selection.focusKey = siblingKey;
        selection.focusOffset = focusOffset - textSize;
        selection.isDirty = true;
      }
    }
    textSize = nextTextSize;
    sibling._parent = parentKey;
    splitNodes.push(sibling);
  }

  // Insert the nodes into the parent's children
  const parent = node.getParentOrThrow();
  const writableParent = getWritableNode(parent);
  const writableParentChildren = writableParent._children;
  const insertionIndex = writableParentChildren.indexOf(key);
  const splitNodesKeys = splitNodes.map((splitNode) => splitNode._key);
  writableParentChildren.splice(insertionIndex, 1, ...splitNodesKeys);

  return splitNodes;
}

function setTextStyling(tag, prevFlags, nextFlags, domStyle) {
  if (tag === 'strong') {
    if (nextFlags & IS_ITALIC) {
      // When prev is not italic, but next is
      if ((prevFlags & IS_ITALIC) === 0) {
        domStyle.setProperty('font-style', 'italic');
      }
    } else if (prevFlags & IS_ITALIC) {
      // When prev was italic, but the next is not
      domStyle.setProperty('font-style', 'normal');
    }
  }
  const prevIsNotStrikeThrough = (prevFlags & IS_STRIKETHROUGH) === 0;
  const prevIsNotUnderline = (prevFlags & IS_UNDERLINE) === 0;
  const nextIsStrikeThrough = nextFlags & IS_STRIKETHROUGH;
  const nextIsUnderline = nextFlags & IS_UNDERLINE;

  if (nextIsStrikeThrough && nextIsUnderline) {
    if (prevIsNotStrikeThrough || prevIsNotUnderline) {
      domStyle.setProperty('text-decoration', 'underline line-through');
    }
  } else if (nextIsStrikeThrough) {
    if (prevIsNotStrikeThrough) {
      domStyle.setProperty('text-decoration', 'line-through');
    }
  } else if (nextIsUnderline) {
    if (prevIsNotUnderline) {
      domStyle.setProperty('text-decoration', 'underline');
    }
  } else if (!prevIsNotStrikeThrough || !prevIsNotUnderline) {
    domStyle.setProperty('text-decoration', 'initial');
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
  if (parent !== null && parent._children.length === 1) {
    if (nextText === '') {
      if (firstChild == null) {
        // We use a zero width string so that the browser moves
        // the cursor into the text node. It won't move the cursor
        // in if it's empty. This trick makes it seem empty, so
        // the browser plays along nicely. We use the <br>
        // to ensure we take up a full line, as we don't have any
        // characters taking up the full height yet.
        dom.appendChild(document.createTextNode(zeroWidthString));
        dom.appendChild(document.createElement('br'));
      } else if (!hasBreakNode) {
        firstChild.nodeValue = zeroWidthString;
        dom.appendChild(document.createElement('br'));
      }
      return;
    }
  }
  if (nextText === '') {
    nextText = zeroWidthString;
  } else if (nextText.endsWith('\n')) {
    nextText += '\n';
  }
  if (firstChild == null || hasBreakNode) {
    dom.textContent = nextText;
  } else if (prevText !== nextText) {
    firstChild.nodeValue = nextText;
  }
}

export class TextNode extends Node {
  _text: string;
  _type: 'text';
  _url: null | string;

  constructor(text: string, key?: NodeKey) {
    super(key);
    this._text = text;
    this._type = 'text';
    this._flags = HAS_DIRECTION;
    this._url = null;
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): TextNode {
    const textNode = new TextNode(data._text);
    textNode._flags = data._flags;
    textNode._url = data._url;
    return textNode;
  }
  clone(): TextNode {
    const clone = new TextNode(this._text, this._key);
    clone._parent = this._parent;
    clone._flags = this._flags;
    clone._url = this._url;
    return clone;
  }
  isBold(): boolean {
    return (this.getLatest()._flags & IS_BOLD) !== 0;
  }
  isItalic(): boolean {
    return (this.getLatest()._flags & IS_ITALIC) !== 0;
  }
  isStrikethrough(): boolean {
    return (this.getLatest()._flags & IS_STRIKETHROUGH) !== 0;
  }
  isUnderline(): boolean {
    return (this.getLatest()._flags & IS_UNDERLINE) !== 0;
  }
  isCode(): boolean {
    return (this.getLatest()._flags & IS_CODE) !== 0;
  }
  isLink(): boolean {
    return (this.getLatest()._flags & IS_LINK) !== 0;
  }
  getURL(): null | string {
    return this._url;
  }
  getTextContent(): string {
    const self = this.getLatest();
    return self._text;
  }
  getTextNodeFormatFlags(
    type: 0 | 1 | 2 | 3 | 4 | 5,
    alignWithFlags: null | number,
    force?: boolean,
  ): number {
    const self = this.getLatest();
    const nodeFlags = self._flags;
    let newFlags = nodeFlags;

    switch (type) {
      case FORMAT_BOLD:
        if (nodeFlags & IS_BOLD && !force) {
          if (alignWithFlags === null || (alignWithFlags & IS_BOLD) === 0) {
            newFlags ^= IS_BOLD;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_BOLD) {
            newFlags |= IS_BOLD;
          }
        }
        break;
      case FORMAT_ITALIC:
        if (nodeFlags & IS_ITALIC && !force) {
          if (alignWithFlags === null || (alignWithFlags & IS_ITALIC) === 0) {
            newFlags ^= IS_ITALIC;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_ITALIC) {
            newFlags |= IS_ITALIC;
          }
        }
        break;
      case FORMAT_STRIKETHROUGH:
        if (nodeFlags & IS_STRIKETHROUGH && !force) {
          if (
            alignWithFlags === null ||
            (alignWithFlags & IS_STRIKETHROUGH) === 0
          ) {
            newFlags ^= IS_STRIKETHROUGH;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_STRIKETHROUGH) {
            newFlags |= IS_STRIKETHROUGH;
          }
        }
        break;
      case FORMAT_UNDERLINE:
        if (nodeFlags & IS_UNDERLINE && !force) {
          if (
            alignWithFlags === null ||
            (alignWithFlags & IS_UNDERLINE) === 0
          ) {
            newFlags ^= IS_UNDERLINE;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_UNDERLINE) {
            newFlags |= IS_UNDERLINE;
          }
        }
        break;
      case FORMAT_CODE:
        if (nodeFlags & IS_CODE && !force) {
          if (alignWithFlags === null || (alignWithFlags & IS_CODE) === 0) {
            newFlags ^= IS_CODE;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_CODE) {
            newFlags |= IS_CODE;
          }
        }
        break;
      case FORMAT_LINK:
        if (nodeFlags & IS_LINK && !force) {
          if (alignWithFlags === null || (alignWithFlags & IS_LINK) === 0) {
            newFlags ^= IS_LINK;
          }
        } else {
          if (alignWithFlags === null || alignWithFlags & IS_LINK) {
            newFlags |= IS_LINK;
          }
        }
        break;
      default:
    }

    return newFlags;
  }

  // View

  _create(): HTMLElement {
    const flags = this._flags;
    const outerTag = getElementOuterTag(this, flags);
    const innerTag = getElementInnerTag(this, flags);
    const tag = outerTag === null ? innerTag : outerTag;
    const dom = document.createElement(tag);
    let innerDOM = dom;
    if (outerTag !== null) {
      innerDOM = document.createElement(innerTag);
      dom.appendChild(innerDOM);
    }
    const domStyle = innerDOM.style;
    const text = this._text;

    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED) {
      dom.contentEditable = 'false';
    }

    setTextStyling(innerTag, 0, flags, domStyle);
    setTextContent(null, text, innerDOM, this);
    // add data-text attribute
    innerDOM.setAttribute('data-text', 'true');
    if (flags & IS_SEGMENTED) {
      innerDOM.setAttribute('spellcheck', 'false');
    }
    if (flags & IS_LINK) {
      innerDOM.setAttribute('data-link', 'true');
    }
    return dom;
  }
  // $FlowFixMe: fix the type for prevNode
  _update(prevNode: TextNode, dom: HTMLElement): boolean {
    const prevText = prevNode._text;
    const nextText = this._text;
    const prevFlags = prevNode._flags;
    const nextFlags = this._flags;
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
        // TODO ensure we can remove this and simpify this block's logic
        invariant(false, 'Should never happen');
      }
    } else {
      if (prevOuterTag !== null) {
        // TODO ensure we can remove this and simpify this block's logic
        invariant(false, 'Should never happen');
      }
    }
    const domStyle = innerDOM.style;

    setTextStyling(nextInnerTag, prevFlags, nextFlags, domStyle);
    // $FlowFixMe: prevNode is always a TextNode
    setTextContent(prevText, nextText, innerDOM, this);
    if (nextFlags & IS_SEGMENTED) {
      if ((prevFlags & IS_SEGMENTED) === 0) {
        innerDOM.setAttribute('spellcheck', 'false');
      }
    } else {
      if (prevFlags & IS_SEGMENTED) {
        innerDOM.removeAttribute('spellcheck');
      }
    }
    if (nextFlags & IS_LINK) {
      if ((prevFlags & IS_LINK) === 0) {
        innerDOM.setAttribute('data-link', 'true');
      }
    } else {
      if (prevFlags & IS_LINK) {
        innerDOM.removeAttribute('data-link');
      }
    }
    return false;
  }

  // Mutators

  setURL(url: string | null): TextNode {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error('setURL: can only be used on non-immutable text nodes');
    }
    const writableSelf = getWritableNode(this);
    writableSelf._url = url;
    return writableSelf;
  }
  setTextContent(text: string): TextNode {
    shouldErrorOnReadOnly();
    if (this.isImmutable()) {
      throw new Error(
        'spliceText: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = getWritableNode(this);
    writableSelf._text = text;
    return writableSelf;
  }
  selectAfter(anchorOffset?: number, focusOffset?: number): void {
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
    nextSibling.select(anchorOffset, focusOffset);
  }
  select(_anchorOffset?: number, _focusOffset?: number): Selection {
    shouldErrorOnReadOnly();
    let anchorOffset = _anchorOffset;
    let focusOffset = _focusOffset;
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this._key;
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
    const writableSelf = getWritableNode(this);
    const text = writableSelf._text;
    const newTextLength = newText.length;
    let index = offset;
    if (index < 0) {
      index = newTextLength + index;
      if (index < 0) {
        index = 0;
      }
    }
    const updatedText =
      text.slice(0, index) + newText + text.slice(index + delCount);
    writableSelf._text = updatedText;
    if (restoreSelection) {
      const event = window.event;
      const inCompositionMode = event && event.type === 'compositionend';
      const key = writableSelf._key;
      if (key === null) {
        throw new Error('TODO: validate nodes have keys in a more generic way');
      }
      const selection = getSelection();
      invariant(selection !== null, 'spliceText: selection not found');
      const newOffset =
        !inCompositionMode || offset === 0 ? offset + newTextLength : offset;
      selection.setRange(key, newOffset, key, newOffset);
    }
    return writableSelf;
  }
  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    shouldErrorOnReadOnly();
    return splitText(this, splitOffsets);
  }
}

export function createTextNode(text: string = ''): TextNode {
  return new TextNode(text);
}
