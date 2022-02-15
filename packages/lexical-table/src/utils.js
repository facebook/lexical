/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {$createParagraphNode, $createTextNode} from 'lexical';

import {$createTableCellNode} from './LexicalTableCellNode';
import {$createTableNode, TableNode} from './LexicalTableNode';
import {$createTableRowNode} from './LexicalTableRowNode';

export function $createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeader?: boolean = true,
): TableNode {
  const tableNode = $createTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRowNode = $createTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      const tableCellNode = $createTableCellNode(iRow === 0 && includeHeader);
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createTextNode());

      tableCellNode.append(paragraphNode);
      tableRowNode.append(tableCellNode);
    }

    tableNode.append(tableRowNode);
  }

  return tableNode;
}
