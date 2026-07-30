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
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
} from '../LexicalNode';
import type {RangeSelection} from '../LexicalSelection';

import {ELEMENT_TYPE_TO_FORMAT} from '../LexicalConstants';
import {
  $applyNodeReplacement,
  $getDocument,
  $setDirectionFromDOM,
  $setFormatFromDOM,
  getCachedClassNameArray,
  isHTMLElement,
  setNodeIndentFromDOM,
} from '../LexicalUtils';
import {
  type ElementFormatType,
  ElementNode,
  type SerializedElementNode,
} from './LexicalElementNode';
import {$isTextNode} from './LexicalTextNode';

export type SerializedParagraphNode = Spread<
  {
    textFormat: number;
    textStyle: string;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class ParagraphNode extends ElementNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof ParagraphNode>;

  $config() {
    return this.config('paragraph', {
      extends: ElementNode,
      importDOM: {
        p: () => ({
          conversion: $convertParagraphElement,
          priority: 0,
        }),
      },
    });
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const dom = $getDocument().createElement('p');
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

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);

    if (isHTMLElement(element)) {
      if (this.isEmpty()) {
        element.append($getDocument().createElement('br'));
      }

      const formatType = this.getFormatType();
      if (formatType) {
        element.style.textAlign = formatType;
      }
    }

    return {
      element,
    };
  }

  exportJSON(): SerializedParagraphNode {
    const json = super.exportJSON();
    // Provide backwards compatible values, see #7971
    if (json.textFormat === undefined || json.textStyle === undefined) {
      // Compute the same value that the reconciler would
      const firstTextNode = this.getChildren().find($isTextNode);
      if (firstTextNode) {
        json.textFormat = firstTextNode.getFormat();
        json.textStyle = firstTextNode.getStyle();
      } else {
        json.textFormat = this.getTextFormat();
        json.textStyle = this.getTextStyle();
      }
    }
    return json as SerializedParagraphNode;
  }

  // Mutation

  insertNewAfter(
    rangeSelection: RangeSelection,
    restoreSelection: boolean,
  ): ParagraphNode {
    const newElement = $createParagraphNode();
    newElement.setTextFormat(rangeSelection.format);
    newElement.setTextStyle(rangeSelection.style);
    const direction = this.getDirection();
    newElement.setDirection(direction);
    newElement.setFormat(this.getFormatType());
    newElement.setStyle(this.getStyle());
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

function $convertParagraphElement(element: HTMLElement): DOMConversionOutput {
  const node = $createParagraphNode();
  $setFormatFromDOM(node, element);
  setNodeIndentFromDOM(element, node);

  // Check legacy 'align' attribute
  // Only use this if no format was set by CSS
  if (node.getFormatType() === '') {
    const align = element.getAttribute('align');
    if (align) {
      if (align && align in ELEMENT_TYPE_TO_FORMAT) {
        node.setFormat(align as ElementFormatType);
      }
    }
  }
  $setDirectionFromDOM(node, element);
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
