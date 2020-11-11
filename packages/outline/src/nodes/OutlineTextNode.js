// @flow

import type {NodeKey} from '../OutlineNode'
import type {Selection} from '../OutlineSelection';

import {IS_IMMUTABLE} from '../OutlineNode'
import {getWritableNode, IS_SEGMENTED, Node} from '../OutlineNode';
import {getSelection} from '../OutlineSelection';
import { BlockNode } from './OutlineBlockNode';

const IS_BOLD = 1 << 2;
const IS_ITALIC = 1 << 3;
const IS_STRIKETHROUGH = 1 << 4;
const IS_UNDERLINE = 1 << 5;

// Do not import these from shared, otherwise we will bundle
// all of shared too.
const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_UNDERLINE = 3;

const zeroWidthString = '\uFEFF';

function getElementTag(node: TextNode, flags: number) {
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
  if (!node.isText() || node.isImmutable()) {
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
  const {anchorKey, anchorOffset, focusKey, focusOffset} = selection;

  // Then handle all other parts
  const splitNodes = [writableNode];
  let textSize = firstPart.length;
  for (let i = 1; i < partsLength; i++) {
    const part = parts[i];
    const partSize = part.length;
    const sibling = getWritableNode(createTextNode(part));
    sibling._flags = flags;
    const siblingKey = ((sibling._key: any): NodeKey);
    const nextTextSize = textLength + partSize;

    if (
      anchorKey === key &&
      anchorOffset > textSize &&
      anchorOffset < nextTextSize
    ) {
      selection.anchorKey = siblingKey;
      selection.anchorOffset = anchorOffset - textSize;
      selection.markDirty();
    }
    if (
      focusKey === key &&
      focusOffset > textSize &&
      focusOffset < nextTextSize
    ) {
      selection.focusKey = siblingKey;
      selection.focusOffset = focusOffset - textSize;
      selection.markDirty();
    }
    textSize = nextTextSize;
    sibling._parent = parentKey;
    splitNodes.push(sibling);
  }

  // Insert the nodes into the parent's children
  const parent = node.getParent(); // $FlowFixMeThisCanBeNull
  const writableParent = getWritableNode(parent); // $FlowFixMeThisCanBeNull
  const writableParentChildren = writableParent._children;
  const insertionIndex = writableParentChildren.indexOf(key);
  const splitNodesKeys = splitNodes.map((splitNode) => splitNode._key);
  // $FlowFixMeThisCanBeNull
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
    } else {
      domStyle.setProperty('text-decoration', 'initial');
    }
  } else if (nextIsStrikeThrough) {
    if (prevIsNotStrikeThrough) {
      domStyle.setProperty('text-decoration', 'line-through');
    } else {
      domStyle.setProperty('text-decoration', 'initial');
    }
  } else if (nextIsUnderline) {
    if (prevIsNotUnderline) {
      domStyle.setProperty('text-decoration', 'underline');
    } else {
      domStyle.setProperty('text-decoration', 'initial');
    }
  }
}

function setTextContent(
  prevText: null | string,
  nextText: string,
  dom: HTMLElement,
  node: TextNode,
): void {
  const firstChild = dom.firstChild;
  const hasBreakNode = firstChild && firstChild.nextSibling;
  const parent = ((node.getParent(): any): BlockNode);
  // Check if we are on an empty line
  if (parent._children.length === 1) {
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
    } else if (nextText.endsWith('\n')) {
      nextText += '\n';
    }
  }
  if (firstChild == null || hasBreakNode) {
    dom.textContent = nextText === '' ? zeroWidthString : nextText;
  } else if (prevText !== nextText) {
    firstChild.nodeValue = nextText;
  }
}

export class TextNode extends Node {
  _text: string;

  constructor(text: string) {
    super();
    this._text = text;
    this._type = 'text';
  }
  clone(): TextNode {
    const clone = new TextNode(this._text);
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
  isText(): true {
    return true;
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
  getTextContent(): string {
    const self = this.getLatest();
    return self._text;
  }
  getTextNodeFormatFlags(type: 0 | 1 | 2 | 3, alignWithFlags: null | number): number {
    const self = this.getLatest();
    const nodeFlags = self._flags;
    let newFlags = nodeFlags;

    switch (type) {
      case FORMAT_BOLD:
        if (nodeFlags & IS_BOLD) {
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
        if (nodeFlags & IS_ITALIC) {
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
        if (nodeFlags & IS_STRIKETHROUGH) {
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
        if (nodeFlags & IS_UNDERLINE) {
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
      default:
    }

    return newFlags;
  }

  // View

  _create(): HTMLElement {
    const flags = this._flags;
    const tag = getElementTag(this, flags);
    const dom = document.createElement(tag);
    const domStyle = dom.style;
    const text = this._text;

    if (flags & IS_IMMUTABLE || flags & IS_SEGMENTED) {
      dom.contentEditable = 'false';
    }

    setTextStyling(tag, 0, flags, domStyle);
    setTextContent(null, text, dom, this);
    // add data-text attribute
    dom.setAttribute('data-text', 'true');
    if (flags & IS_SEGMENTED) {
      dom.setAttribute('spellcheck', 'false');
    }
    return dom;
  }
  _update(prevNode: Node, dom: HTMLElement): boolean {
    const domStyle = dom.style;
    const prevText = ((prevNode: any): TextNode)._text;
    const nextText = this._text;
    const prevFlags = prevNode._flags;
    const nextFlags = this._flags;
    const prevTag = getElementTag(this, prevFlags);
    const nextTag = getElementTag(this, nextFlags);

    if (prevTag !== nextTag) {
      return true;
    }

    setTextStyling(nextTag, prevFlags, nextFlags, domStyle);
    setTextContent(prevText, nextText, dom, this);
    if (nextFlags & IS_SEGMENTED) {
      if ((prevFlags & IS_SEGMENTED) === 0) {
        dom.setAttribute('spellcheck', 'false');
      }
    } else {
      if (prevFlags & IS_SEGMENTED) {
        dom.removeAttribute('spellcheck');
      }
    }
    return false;
  }

  // Mutators

  setTextContent(text: string): TextNode {
    if (this.isImmutable()) {
      throw new Error(
        'spliceText: can only be used on non-immutable text nodes',
      );
    }
    const writableSelf = getWritableNode(this);
    writableSelf._text = text;
    return writableSelf;
  }
  selectAfter(
    anchorOffset?: number,
    focusOffset?: number,
    isCollapsed?: boolean,
  ): void {
    const nextSibling = this.getNextSibling();
    if (
      nextSibling === null ||
      !nextSibling.isText() ||
      nextSibling.isImmutable() ||
      nextSibling.isSegmented()
    ) {
      throw new Error('This needs to be fixed');
    }
    ((nextSibling: any): TextNode).select(anchorOffset, focusOffset, isCollapsed);
  }
  select(
    anchorOffset?: number,
    focusOffset?: number,
    isCollapsed?: boolean = false,
  ): Selection {
    const selection = getSelection();
    const text = this.getTextContent();
    const key = this._key;
    if (key === null) {
      throw new Error('TODO: validate nodes have keys in a more generic way')
    }
    selection.anchorKey = key;
    selection.focusKey = key;
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
    selection.anchorOffset = anchorOffset;
    selection.focusOffset = focusOffset;
    selection.isCollapsed = isCollapsed;
    selection.markDirty();
    return selection;
  }
  spliceText(
    offset: number,
    delCount: number,
    newText: string,
    restoreSelection?: boolean,
  ): TextNode {
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
        throw new Error('TODO: validate nodes have keys in a more generic way')
      }
      const selection = getSelection();
      const newOffset =
        !inCompositionMode || offset === 0 ? offset + newTextLength : offset;
      selection.anchorKey = key;
      selection.anchorOffset = newOffset;
      selection.focusKey = key;
      selection.focusOffset = newOffset;
      selection.markDirty();
    }
    return writableSelf;
  }
  splitText(...splitOffsets: Array<number>): Array<TextNode> {
    return splitText(this, splitOffsets);
  }
  makeBold(): TextNode {
    if (this.isImmutable()) {
      throw new Error('makeBold: can only be used on non-immutable text nodes');
    }
    const self = getWritableNode(this);
    self._flags |= IS_BOLD;
    return self;
  }
  makeNormal(): TextNode {
    if (this.isImmutable()) {
      throw new Error('select: can only be used on non-immutable text nodes');
    }
    const self = getWritableNode(this);
    self._flags = 0;
    return self;
  }
}

export function createTextNode(text: string = ''): TextNode {
  return new TextNode(text);
}
