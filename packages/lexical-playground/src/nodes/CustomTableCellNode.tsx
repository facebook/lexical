/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isCodeNode} from '@lexical/code';
import {$isListNode} from '@lexical/list';
import {$isQuoteNode} from '@lexical/rich-text';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellNode,
} from '@lexical/table';
import {
  type LexicalNode,
  $createParagraphNode,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

export const TableCellHeaderStates = {
  BOTH: 3,
  COLUMN: 2,
  NO_STATUS: 0,
  ROW: 1,
};

const needWrapperWithParagragh = (node: LexicalNode) => {
  if (
    $isParagraphNode(node) ||
    $isListNode(node) ||
    $isCodeNode(node) ||
    $isQuoteNode(node)
  ) {
    return false;
  }
  return true;
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

const CustomTableCell = 'customTableCell';
const PIXEL_VALUE_REG_EXP = /^(\d+(?:\.\d+)?)px$/;

export class CustomTableCellNode extends TableCellNode {
  /** @internal */
  __colSpan: number;
  /** @internal */
  __rowSpan: number;
  /** @internal */
  __headerState: TableCellHeaderState;
  /** @internal */
  __width?: number;
  /** @internal */
  __backgroundColor: null | string;

  static getType(): string {
    return CustomTableCell;
  }

  static clone(node: TableCellNode): TableCellNode {
    return super.clone(node);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      td: (node: Node) => ({
        conversion: convertTableCellNodeElement,
        priority: 1,
      }),
      th: (node: Node) => ({
        conversion: convertTableCellNodeElement,
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTableCellNode): TableCellNode {
    return super.importJSON(serializedNode);
  }

  constructor(
    headerState = TableCellHeaderStates.NO_STATUS,
    colSpan = 1,
    width?: number,
    key?: NodeKey,
  ) {
    super(headerState, colSpan, width, key);
    this.__colSpan = colSpan;
    this.__rowSpan = 1;
    this.__headerState = headerState;
    this.__width = width;
    this.__backgroundColor = null;
  }

  createDOM(config: EditorConfig): HTMLElement {
    return super.createDOM(config);
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    return super.exportDOM(editor);
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      type: CustomTableCell,
    };
  }
}

export function convertTableCellNodeElement(
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

  return {
    after: (childLexicalNodes) => {
      if (childLexicalNodes.length === 0) {
        childLexicalNodes.push($createParagraphNode());
        return childLexicalNodes;
      } else {
        const checkedChildLexicalNodes = childLexicalNodes.map((node) => {
          if (needWrapperWithParagragh(node)) {
            const paragraph = $createParagraphNode();
            paragraph.append(node);
            return paragraph;
          }
          return node;
        });

        return checkedChildLexicalNodes;
      }
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
        paragraphNode.append(lexicalNode);
        return paragraphNode;
      }

      return lexicalNode;
    },
    node: tableCellNode,
  };
}
