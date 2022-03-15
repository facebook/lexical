/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
} from 'lexical';
import type {CodeHighlightNode} from 'lexical/CodeHighlightNode';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $isLineBreakNode,
  ElementNode,
} from 'lexical';
import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
} from 'lexical/CodeHighlightNode';

export class CodeNode extends ElementNode {
  __language: string | void;

  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__key);
  }

  constructor(language?: string, key?: NodeKey): void {
    super(key);
    this.__language = language;
  }

  // View
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('code');
    addClassNamesToElement(element, config.theme.code);
    element.setAttribute('spellcheck', 'false');
    return element;
  }
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean {
    return false;
  }

  static convertDOM(): DOMConversionMap | null {
    return {
      div: (node: Node) => ({
        conversion: convertDivElement,
        priority: 1,
      }),
      pre: (node: Node) => ({
        conversion: convertPreElement,
        priority: 0,
      }),
      table: (node: Node) => {
        // $FlowFixMe[incompatible-type] domNode is a <table> since we matched it by nodeName
        const table: HTMLTableElement = node;
        if (isGitHubCodeTable(table)) {
          return {
            conversion: convertTableElement,
            priority: 1,
          };
        }
        return null;
      },
      td: (node: Node) => {
        // $FlowFixMe[incompatible-type] element is a <td> since we matched it by nodeName
        const td: HTMLTableCellElement = node;
        if (isGitHubCodeCell(td)) {
          return {
            conversion: convertTableCellElement,
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  // Mutation
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | CodeHighlightNode {
    const children = this.getChildren();
    const childrenLength = children.length;

    if (
      childrenLength >= 2 &&
      children[childrenLength - 1].getTextContent() === '\n' &&
      children[childrenLength - 2].getTextContent() === '\n' &&
      selection.isCollapsed() &&
      selection.anchor.key === this.__key &&
      selection.anchor.offset === childrenLength
    ) {
      children[childrenLength - 1].remove();
      children[childrenLength - 2].remove();
      const newElement = $createParagraphNode();
      this.insertAfter(newElement);
      return newElement;
    }

    // If the selection is within the codeblock, find all leading tabs and
    // spaces of the current line. Create a new line that has all those
    // tabs and spaces, such that leading indentation is preserved.
    const anchor = selection.anchor.getNode();
    const firstNode = getFirstCodeHighlightNodeOfLine(anchor);
    if (firstNode != null) {
      let leadingWhitespace = 0;
      const firstNodeText = firstNode.getTextContent();
      while (
        leadingWhitespace < firstNodeText.length &&
        /[\t ]/.test(firstNodeText[leadingWhitespace])
      ) {
        leadingWhitespace += 1;
      }
      if (leadingWhitespace > 0) {
        const whitespace = firstNodeText.substring(0, leadingWhitespace);
        const indentedChild = $createCodeHighlightNode(whitespace);
        anchor.insertAfter(indentedChild);
        selection.insertNodes([$createLineBreakNode()]);
        indentedChild.select();
        return indentedChild;
      }
    }

    return null;
  }

  canInsertTab(): true {
    return true;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }

  setLanguage(language: string): void {
    const writable = this.getWritable();
    writable.__language = language;
  }

  getLanguage(): string | void {
    return this.getLatest().__language;
  }
}

export function $createCodeNode(language?: string): CodeNode {
  return new CodeNode(language);
}

export function $isCodeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeNode;
}

export function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode {
  let currentNode = null;
  const previousSiblings = anchor.getPreviousSiblings();
  previousSiblings.push(anchor);
  while (previousSiblings.length > 0) {
    const node = previousSiblings.pop();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

export function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode {
  let currentNode = null;
  const nextSiblings = anchor.getNextSiblings();
  nextSiblings.unshift(anchor);
  while (nextSiblings.length > 0) {
    const node = nextSiblings.shift();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

function convertPreElement(domNode: Node): DOMConversionOutput {
  return {node: $createCodeNode()};
}

function convertDivElement(domNode: Node): DOMConversionOutput {
  // $FlowFixMe[incompatible-type] domNode is a <div> since we matched it by nodeName
  const div: HTMLDivElement = domNode;
  return {
    after: (childLexicalNodes) => {
      const domParent = domNode.parentNode;
      if (domParent != null && domNode !== domParent.lastChild) {
        childLexicalNodes.push($createLineBreakNode());
      }
      return childLexicalNodes;
    },
    node: isCodeElement(div) ? $createCodeNode() : null,
  };
}

function convertTableElement(): DOMConversionOutput {
  return {node: $createCodeNode()};
}

function convertTableCellElement(domNode: Node): DOMConversionOutput {
  // $FlowFixMe[incompatible-type] domNode is a <td> since we matched it by nodeName
  const cell: HTMLTableCellElement = domNode;
  return {
    after: (childLexicalNodes) => {
      if (cell.parentNode && cell.parentNode.nextSibling) {
        // Append newline between code lines
        childLexicalNodes.push($createLineBreakNode());
      }
      return childLexicalNodes;
    },
    node: null,
  };
}

function isCodeElement(div: HTMLDivElement): boolean {
  return div.style.fontFamily.match('monospace') !== null;
}

function isGitHubCodeCell(cell: HTMLTableCellElement): boolean %checks {
  return cell.classList.contains('js-file-line');
}

function isGitHubCodeTable(table: HTMLTableElement): boolean %checks {
  return table.classList.contains('js-file-line-container');
}
