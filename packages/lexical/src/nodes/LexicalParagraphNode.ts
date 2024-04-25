/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  KlassConstructor,
  LexicalEditor,
  Spread,
} from '../LexicalEditor';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
} from '../LexicalNode';
import type {
  ElementFormatType,
  SerializedElementNode,
} from './LexicalElementNode';
import type {RangeSelection} from 'lexical';

import {TEXT_TYPE_TO_FORMAT} from '../LexicalConstants';
import {
  $applyNodeReplacement,
  getCachedClassNameArray,
  isHTMLElement,
} from '../LexicalUtils';
import {ElementNode} from './LexicalElementNode';
import {$isTextNode, TextFormatType} from './LexicalTextNode';

export type SerializedParagraphNode = Spread<
  {
    textFormat: number;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class ParagraphNode extends ElementNode {
  ['constructor']!: KlassConstructor<typeof ParagraphNode>;
  /** @internal */
  __textFormat: number;

  constructor(key?: NodeKey) {
    super(key);
    this.__textFormat = 0;
  }

  static getType(): string {
    return 'paragraph';
  }

  getTextFormat(): number {
    const self = this.getLatest();
    return self.__textFormat;
  }

  setTextFormat(type: number): this {
    const self = this.getWritable();
    self.__textFormat = type;
    return self;
  }

  hasTextFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getTextFormat() & formatFlag) !== 0;
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new ParagraphNode(node.__key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('p');
    const classNames = getCachedClassNameArray(config.theme, 'paragraph');
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }
  updateDOM(
    prevNode: ParagraphNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      p: (node: Node) => ({
        conversion: convertParagraphElement,
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);

    if (element && isHTMLElement(element)) {
      if (this.isEmpty()) {
        element.append(document.createElement('br'));
      }

      const formatType = this.getFormatType();
      element.style.textAlign = formatType;

      const direction = this.getDirection();
      if (direction) {
        element.dir = direction;
      }
      const indent = this.getIndent();
      if (indent > 0) {
        // padding-inline-start is not widely supported in email HTML, but
        // Lexical Reconciler uses padding-inline-start. Using text-indent instead.
        element.style.textIndent = `${indent * 20}px`;
      }
    }

    return {
      element,
    };
  }

  static importJSON(serializedNode: SerializedParagraphNode): ParagraphNode {
    const node = $createParagraphNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    node.setTextFormat(serializedNode.textFormat);
    return node;
  }

  exportJSON(): SerializedParagraphNode {
    return {
      ...super.exportJSON(),
      textFormat: this.getTextFormat(),
      type: 'paragraph',
      version: 1,
    };
  }

  // Mutation

  insertNewAfter(
    rangeSelection: RangeSelection,
    restoreSelection: boolean,
  ): ParagraphNode {
    const newElement = $createParagraphNode();
    newElement.setTextFormat(rangeSelection.format);
    const direction = this.getDirection();
    newElement.setDirection(direction);
    newElement.setFormat(this.getFormatType());
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }

  collapseAtStart(): boolean {
    const children = this.getChildren();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      children.length === 0 ||
      ($isTextNode(children[0]) && children[0].getTextContent().trim() === '')
    ) {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}

function convertParagraphElement(element: HTMLElement): DOMConversionOutput {
  const node = $createParagraphNode();
  if (element.style) {
    node.setFormat(element.style.textAlign as ElementFormatType);
    const indent = parseInt(element.style.textIndent, 10) / 20;
    if (indent > 0) {
      node.setIndent(indent);
    }
  }
  return {node};
}

export function $createParagraphNode(): ParagraphNode {
  return $applyNodeReplacement(new ParagraphNode());
}

export function $isParagraphNode(
  node: LexicalNode | null | undefined,
): node is ParagraphNode {
  return node instanceof ParagraphNode;
}
