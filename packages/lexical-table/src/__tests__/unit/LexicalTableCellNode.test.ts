/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$createTableCellNode, TableCellHeaderStates} from '@lexical/table';
import {$getRoot} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    tableCell: 'test-table-cell-class',
  },
});

describe('LexicalTableCellNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('TableCellNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);

        expect(cellNode).not.toBe(null);
      });

      expect(() =>
        $createTableCellNode(TableCellHeaderStates.NO_STATUS),
      ).toThrow();
    });

    test('TableCellNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
        expect(cellNode.createDOM(editorConfig).outerHTML).toBe(
          `<td class="${editorConfig.theme.tableCell}"></td>`,
        );

        const headerCellNode = $createTableCellNode(TableCellHeaderStates.ROW);
        expect(headerCellNode.createDOM(editorConfig).outerHTML).toBe(
          `<th class="${editorConfig.theme.tableCell}"></th>`,
        );

        const colSpan = 2;
        const cellWithRowSpanNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
          colSpan,
        );
        expect(cellWithRowSpanNode.createDOM(editorConfig).outerHTML).toBe(
          `<td colspan="${colSpan}" class="${editorConfig.theme.tableCell}"></td>`,
        );

        const cellWidth = 200;
        const cellWithCustomWidthNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
          undefined,
          cellWidth,
        );
        expect(cellWithCustomWidthNode.createDOM(editorConfig).outerHTML).toBe(
          `<td style="width: ${cellWidth}px;" class="${editorConfig.theme.tableCell}"></td>`,
        );
        const ignoredVerticalAlign = 'top';
        const cellWithIgnoredVerticalAlignNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
        );
        cellWithIgnoredVerticalAlignNode.setVerticalAlign(ignoredVerticalAlign);
        expect(
          cellWithIgnoredVerticalAlignNode.createDOM(editorConfig).outerHTML,
        ).toBe(`<td class="${editorConfig.theme.tableCell}"></td>`);
        const validVerticalAlign = 'middle';
        const cellWithValidVerticalAlignNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
        );
        cellWithValidVerticalAlignNode.setVerticalAlign(validVerticalAlign);
        expect(
          cellWithValidVerticalAlignNode.createDOM(editorConfig).outerHTML,
        ).toBe(
          `<td style="vertical-align: ${validVerticalAlign};" class="${editorConfig.theme.tableCell}"></td>`,
        );
      });
    });

    test('TableCellNode.importDOM', async () => {
      const {editor} = testEnv;
      const parser = new DOMParser();

      const cases: Array<[string, string]> = [
        [
          html`
            <table>
              <tr>
                <td>
                  <test-decorator></test-decorator>
                  1
                </td>
              </tr>
            </table>
          `,
          html`
            <table>
              <colgroup><col /></colgroup>
              <tbody>
                <tr>
                  <td
                    style="border: 1px solid black; width: 75px; vertical-align: top; text-align: start;">
                    <p>
                      <test-decorator></test-decorator>
                      <span style="white-space: pre-wrap;">1</span>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        ],
        [
          html`
            <table>
              <tr>
                <td>
                  1
                  <br />
                  <br />
                  <br />
                  <br />
                  2
                </td>
              </tr>
            </table>
          `,
          html`
            <table>
              <colgroup><col /></colgroup>
              <tbody>
                <tr>
                  <td
                    style="border: 1px solid black; width: 75px; vertical-align: top; text-align: start;">
                    <p>
                      <span style="white-space: pre-wrap;">1</span>
                      <br />
                      <br />
                      <br />
                      <br />
                      <span style="white-space: pre-wrap;">2</span>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        ],
        [
          html`
            <table>
              <tr>
                <td>
                  <p>1</p>
                  <br />
                  <p>2</p>
                </td>
              </tr>
            </table>
          `,
          html`
            <table>
              <colgroup><col /></colgroup>
              <tbody>
                <tr>
                  <td
                    style="border: 1px solid black; width: 75px; vertical-align: top; text-align: start;">
                    <p>
                      <span style="white-space: pre-wrap;">1</span>
                    </p>
                    <p>
                      <br />
                    </p>
                    <p>
                      <span style="white-space: pre-wrap;">2</span>
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          `,
        ],
      ];

      await editor.update(() => {
        const root = $getRoot();

        for (const [input, output] of cases) {
          root.clear();

          const dom = parser.parseFromString(input, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);

          expectHtmlToBeEqual($generateHtmlFromNodes(editor), output);
        }
      });
    });
  });
});
