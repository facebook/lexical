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
  LexicalUpdateJSON,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  ElementNode,
  isHTMLElement,
} from 'lexical';

import {COLUMN_WIDTH, PIXEL_VALUE_REG_EXP} from './constants';

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
    colSpan?: number;
    rowSpan?: number;
    headerState: TableCellHeaderState;
    width?: number;
    backgroundColor?: null | string;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class TableCellNode extends ElementNode {
  /** @internal */
  __colSpan: number;
  /** @internal */
  __rowSpan: number;
  /** @internal */
  __headerState: TableCellHeaderState;
  /** @internal */
  __width?: number | undefined;
  /** @internal */
  __backgroundColor: null | string;

  static getType(): string {
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

  afterCloneFrom(node: this): void {
    super.afterCloneFrom(node);
    this.__rowSpan = node.__rowSpan;
    this.__backgroundColor = node.__backgroundColor;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      td: (node: Node) => ({
        conversion: $convertTableCellNodeElement,
        priority: 0,
      }),
      th: (node: Node) => ({
        conversion: $convertTableCellNodeElement,
        priority: 0,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableCellNode): TableCellNode {
    return $createTableCellNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedTableCellNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setHeaderStyles(serializedNode.headerState)
      .setColSpan(serializedNode.colSpan || 1)
      .setRowSpan(serializedNode.rowSpan || 1)
      .setWidth(serializedNode.width || undefined)
      .setBackgroundColor(serializedNode.backgroundColor || null);
  }

  constructor(
    headerState = TableCellHeaderStates.NO_STATUS,
    colSpan = 1,
    width?: number,
    key?: NodeKey,
  ) {
    super(key);
    this.__colSpan = colSpan;
    this.__rowSpan = 1;
    this.__headerState = headerState;
    this.__width = width;
    this.__backgroundColor = null;
  }

  createDOM(config: EditorConfig): HTMLTableCellElement {
    const element = document.createElement(this.getTag());

    if (this.__width) {
      element.style.width = `${this.__width}px`;
    }
    if (this.__colSpan > 1) {
      element.colSpan = this.__colSpan;
    }
    if (this.__rowSpan > 1) {
      element.rowSpan = this.__rowSpan;
    }
    if (this.__backgroundColor !== null) {
      element.style.backgroundColor = this.__backgroundColor;
    }

    addClassNamesToElement(
      element,
      config.theme.tableCell,
      this.hasHeader() && config.theme.tableCellHeader,
    );

    return element;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const output = super.exportDOM(editor);

    if (isHTMLElement(output.element)) {
      const element = output.element as HTMLTableCellElement;
      element.setAttribute(
        'data-temporary-table-cell-lexical-key',
        this.getKey(),
      );
      element.style.border = '1px solid black';
      if (this.__colSpan > 1) {
        element.colSpan = this.__colSpan;
      }
      if (this.__rowSpan > 1) {
        element.rowSpan = this.__rowSpan;
      }
      element.style.width = `${this.getWidth() || COLUMN_WIDTH}px`;

      element.style.verticalAlign = 'top';
      element.style.textAlign = 'start';
      if (this.__backgroundColor === null && this.hasHeader()) {
        element.style.backgroundColor = '#f2f3f5';
      }
    }

    return output;
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      backgroundColor: this.getBackgroundColor(),
      colSpan: this.__colSpan,
      headerState: this.__headerState,
      rowSpan: this.__rowSpan,
      width: this.getWidth(),
    };
  }

  getColSpan(): number {
    return this.getLatest().__colSpan;
  }

  setColSpan(colSpan: number): this {
    const self = this.getWritable();
    self.__colSpan = colSpan;
    return self;
  }

  getRowSpan(): number {
    return this.getLatest().__rowSpan;
  }

  setRowSpan(rowSpan: number): this {
    const self = this.getWritable();
    self.__rowSpan = rowSpan;
    return self;
  }

  getTag(): 'th' | 'td' {
    return this.hasHeader() ? 'th' : 'td';
  }

  setHeaderStyles(
    headerState: TableCellHeaderState,
    mask: TableCellHeaderState = TableCellHeaderStates.BOTH,
  ): this {
    const self = this.getWritable();
    self.__headerState = (headerState & mask) | (self.__headerState & ~mask);
    return self;
  }

  getHeaderStyles(): TableCellHeaderState {
    return this.getLatest().__headerState;
  }

  setWidth(width: number | undefined): this {
    const self = this.getWritable();
    self.__width = width;
    return self;
  }

  getWidth(): number | undefined {
    return this.getLatest().__width;
  }

  getBackgroundColor(): null | string {
    return this.getLatest().__backgroundColor;
  }

  setBackgroundColor(newBackgroundColor: null | string): this {
    const self = this.getWritable();
    self.__backgroundColor = newBackgroundColor;
    return self;
  }

  toggleHeaderStyle(headerStateToToggle: TableCellHeaderState): this {
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

  updateDOM(prevNode: this): boolean {
    return (
      prevNode.__headerState !== this.__headerState ||
      prevNode.__width !== this.__width ||
      prevNode.__colSpan !== this.__colSpan ||
      prevNode.__rowSpan !== this.__rowSpan ||
      prevNode.__backgroundColor !== this.__backgroundColor
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

export function $convertTableCellNodeElement(
  domNode: Node,
): DOMConversionOutput {
  const domNode_ = domNode as HTMLTableCellElement;
  const nodeName = domNode.nodeName.toLowerCase();

  let width: number | undefined = undefined;

  if (PIXEL_VALUE_REG_EXP.test(domNode_.style.width)) {
    width = parseFloat(domNode_.style.width);
  }

  const tableCellNode = $createTableCellNode(
    nodeName === 'th'
      ? TableCellHeaderStates.ROW
      : TableCellHeaderStates.NO_STATUS,
    domNode_.colSpan,
    width,
  );

  tableCellNode.__rowSpan = domNode_.rowSpan;
  const backgroundColor = domNode_.style.backgroundColor;
  if (backgroundColor !== '') {
    tableCellNode.__backgroundColor = backgroundColor;
  }

  const style = domNode_.style;
  const textDecoration = ((style && style.textDecoration) || '').split(' ');
  const hasBoldFontWeight =
    style.fontWeight === '700' || style.fontWeight === 'bold';
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  const hasItalicFontStyle = style.fontStyle === 'italic';
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  return {
    after: (childLexicalNodes) => {
      if (childLexicalNodes.length === 0) {
        childLexicalNodes.push($createParagraphNode());
      }
      return childLexicalNodes;
    },
    forChild: (lexicalNode, parentLexicalNode) => {
      if ($isTableCellNode(parentLexicalNode) && !$isElementNode(lexicalNode)) {
        const paragraphNode = $createParagraphNode();
        if (
          $isLineBreakNode(lexicalNode) &&
          lexicalNode.getTextContent() === '\n'
        ) {
          return null;
        }
        if ($isTextNode(lexicalNode)) {
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
  headerState: TableCellHeaderState = TableCellHeaderStates.NO_STATUS,
  colSpan = 1,
  width?: number,
): TableCellNode {
  return $applyNodeReplacement(new TableCellNode(headerState, colSpan, width));
}

export function $isTableCellNode(
  node: LexicalNode | null | undefined,
): node is TableCellNode {
  return node instanceof TableCellNode;
}
