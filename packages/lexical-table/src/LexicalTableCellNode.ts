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
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedGridCellNode,
  Spread,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $isElementNode,
  $isLineBreakNode,
  DEPRECATED_GridCellNode,
} from 'lexical';

export const TableCellHeaderStates = {
  BOTH: 3,
  COLUMN: 2,
  NO_STATUS: 0,
  ROW: 1,
};

export type TableCellHeaderState =
  typeof TableCellHeaderStates[keyof typeof TableCellHeaderStates];

export type SerializedTableCellNode = Spread<
  {
    headerState: TableCellHeaderState;
    type: 'tablecell';
    width?: number;
  },
  SerializedGridCellNode
>;

/** @noInheritDoc */
export class TableCellNode extends DEPRECATED_GridCellNode {
  /** @internal */
  __headerState: TableCellHeaderState;
  /** @internal */
  __width?: number;

  static getType(): 'tablecell' {
    return 'tablecell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(
      node.__headerState,
      node.__colSpan,
      node.__width,
      node.__key,
    );
  }

  static importDOM(): DOMConversionMap | null {
    return {
      td: (node: Node) => ({
        conversion: convertTableCellNodeElement,
        priority: 0,
      }),
      th: (node: Node) => ({
        conversion: convertTableCellNodeElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableCellNode): TableCellNode {
    return $createTableCellNode(
      serializedNode.headerState,
      serializedNode.colSpan,
      serializedNode.width || undefined,
    );
  }

  constructor(
    headerState = TableCellHeaderStates.NO_STATUS,
    colSpan = 1,
    width?: number,
    key?: NodeKey,
  ) {
    super(colSpan, key);
    this.__headerState = headerState;
    this.__width = width;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement(this.getTag());

    if (this.__width) {
      element.style.width = `${this.__width}px`;
    }

    addClassNamesToElement(
      element,
      config.theme.tableCell,
      this.hasHeader() && config.theme.tableCellHeader,
    );

    return element;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);

    if (element) {
      const maxWidth = 700;
      const colCount = this.getParentOrThrow().getChildrenSize();
      element.style.border = '1px solid black';
      element.style.width = `${
        this.getWidth() || Math.max(90, maxWidth / colCount)
      }px`;

      element.style.verticalAlign = 'top';
      element.style.textAlign = 'start';

      if (this.hasHeader()) {
        element.style.backgroundColor = '#f2f3f5';
      }
    }

    return {
      element,
    };
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      colSpan: super.__colSpan,
      headerState: this.__headerState,
      type: 'tablecell',
      width: this.getWidth(),
    };
  }

  getTag(): string {
    return this.hasHeader() ? 'th' : 'td';
  }

  setHeaderStyles(headerState: TableCellHeaderState): TableCellHeaderState {
    const self = this.getWritable();
    self.__headerState = headerState;
    return this.__headerState;
  }

  getHeaderStyles(): TableCellHeaderState {
    return this.getLatest().__headerState;
  }

  setWidth(width: number): number | null | undefined {
    const self = this.getWritable();
    self.__width = width;
    return this.__width;
  }

  getWidth(): number | undefined {
    return this.getLatest().__width;
  }

  toggleHeaderStyle(headerStateToToggle: TableCellHeaderState): TableCellNode {
    const self = this.getWritable();

    if ((self.__headerState & headerStateToToggle) === headerStateToToggle) {
      self.__headerState -= headerStateToToggle;
    } else {
      self.__headerState += headerStateToToggle;
    }

    return self;
  }

  hasHeaderState(headerState: TableCellHeaderState): boolean {
    return (this.getHeaderStyles() & headerState) === headerState;
  }

  hasHeader(): boolean {
    return this.getLatest().__headerState !== TableCellHeaderStates.NO_STATUS;
  }

  updateDOM(prevNode: TableCellNode): boolean {
    return (
      prevNode.__headerState !== this.__headerState ||
      prevNode.__width !== this.__width
    );
  }

  isShadowRoot(): boolean {
    return true;
  }

  collapseAtStart(): true {
    return true;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export function convertTableCellNodeElement(
  domNode: Node,
): DOMConversionOutput {
  const nodeName = domNode.nodeName.toLowerCase();

  const tableCellNode = $createTableCellNode(
    nodeName === 'th'
      ? TableCellHeaderStates.ROW
      : TableCellHeaderStates.NO_STATUS,
  );

  return {
    forChild: (lexicalNode, parentLexicalNode) => {
      if ($isTableCellNode(parentLexicalNode) && !$isElementNode(lexicalNode)) {
        const paragraphNode = $createParagraphNode();
        if (
          $isLineBreakNode(lexicalNode) &&
          lexicalNode.getTextContent() === '\n'
        ) {
          return null;
        }
        paragraphNode.append(lexicalNode);
        return paragraphNode;
      }

      return lexicalNode;
    },
    node: tableCellNode,
  };
}

export function $createTableCellNode(
  headerState: TableCellHeaderState,
  colSpan = 1,
  width?: number,
): TableCellNode {
  return new TableCellNode(headerState, colSpan, width);
}

export function $isTableCellNode(
  node: LexicalNode | null | undefined,
): node is TableCellNode {
  return node instanceof TableCellNode;
}
