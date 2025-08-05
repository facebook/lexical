/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  EditorThemeClasses,
  ElementFormatType,
  KlassConstructor,
  LexicalEditor,
  RangeSelection,
  SerializedParagraphNode,
} from 'lexical';

import {
  $applyNodeReplacement,
  $createParagraphNode,
  $isTextNode,
  ElementNode,
} from 'lexical';
import normalizeClassNames from 'shared/normalizeClassNames';

export const DOM_ELEMENT_TYPE = 1;

export function setNodeIndentFromDOM(
  elementDom: HTMLElement,
  elementNode: ElementNode,
) {
  const indentSize = parseInt(elementDom.style.paddingInlineStart, 10) || 0;
  const indent = Math.round(indentSize / 40);
  elementNode.setIndent(indent);
}

export function getCachedClassNameArray(
  classNamesTheme: EditorThemeClasses,
  classNameThemeType: string,
): Array<string> {
  if (classNamesTheme.__lexicalClassNameCache === undefined) {
    classNamesTheme.__lexicalClassNameCache = {};
  }
  const classNamesCache = classNamesTheme.__lexicalClassNameCache;
  const cachedClassNames = classNamesCache[classNameThemeType];
  if (cachedClassNames !== undefined) {
    return cachedClassNames;
  }
  const classNames = classNamesTheme[classNameThemeType];
  // As we're using classList, we need
  // to handle className tokens that have spaces.
  // The easiest way to do this to convert the
  // className tokens to an array that can be
  // applied to classList.add()/remove().
  if (typeof classNames === 'string') {
    const classNamesArr = normalizeClassNames(classNames);
    classNamesCache[classNameThemeType] = classNamesArr;
    return classNamesArr;
  }
  return classNames;
}

export function isDOMNode(x: unknown): x is Node {
  return (
    typeof x === 'object' &&
    x !== null &&
    'nodeType' in x &&
    typeof x.nodeType === 'number'
  );
}

export function isHTMLElement(x: unknown): x is HTMLElement {
  return isDOMNode(x) && x.nodeType === DOM_ELEMENT_TYPE;
}

export class InlineParagraphNode extends ElementNode {
  ['constructor']!: KlassConstructor<typeof InlineParagraphNode>;

  static getType(): string {
    return 'inline-paragraph';
  }

  static clone(node: InlineParagraphNode): InlineParagraphNode {
    return new InlineParagraphNode(node.__key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('p');
    const classNames = getCachedClassNameArray(config.theme, 'paragraph');
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    // Apply inline styles for width, minWidth, and display
    dom.style.width = 'auto';
    dom.style.minWidth = '1px';
    dom.style.display = 'inline-flex';
    return dom;
  }

  updateDOM(
    prevNode: InlineParagraphNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      p: (node: Node) => ({
        conversion: $convertParagraphElement,
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);

    if (isHTMLElement(element)) {
      if (this.isEmpty()) {
        element.append(document.createElement('br'));
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

  static importJSON(
    serializedNode: SerializedParagraphNode,
  ): InlineParagraphNode {
    return $createInlineParagraphNode().updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedParagraphNode {
    return {
      ...super.exportJSON(),
      // These are included explicitly for backwards compatibility
      textFormat: this.getTextFormat(),
      textStyle: this.getTextStyle(),
      type: 'inline-paragraph',
    };
  }

  // Mutation

  insertNewAfter(
    rangeSelection: RangeSelection,
    restoreSelection: boolean,
  ): InlineParagraphNode {
    const newElement = $createInlineParagraphNode();
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
  if (element.style) {
    node.setFormat(element.style.textAlign as ElementFormatType);
    setNodeIndentFromDOM(element, node);
  }
  return {node};
}

export function $createInlineParagraphNode(): InlineParagraphNode {
  return $applyNodeReplacement(new InlineParagraphNode());
}
