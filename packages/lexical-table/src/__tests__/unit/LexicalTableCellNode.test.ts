/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellHeaderStates,
  TableCellNode,
} from '@lexical/table';
import {$getRoot, DOMConversionOutput} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
  invariant,
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

    // Increased timeout as this test performs DOM parsing and HTML generation
    // which can be slow, preventing flaky test failures
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
    }, 15000);

    // Simulates the Lexical Paste Engine finding and running the converter
    const convertHTMLTag = (element: HTMLElement) => {
      const importDOMMap = TableCellNode.importDOM();

      // look up tag name (e.g., 'th') in the import map
      const handler = importDOMMap![element.tagName.toLowerCase()];
      if (!handler) {
        throw new Error(`No handler found for tag ${element.tagName}`);
      }

      const specs = handler(element);
      if (!specs) {
        throw new Error(`Handler returned null for tag ${element.tagName}`);
      }
      return specs.conversion(element);
    };

    const expectTableCellNode = (result: DOMConversionOutput | null) => {
      const node = result?.node;

      if (Array.isArray(node)) {
        throw new Error('Expected a single node, but got an array');
      }

      invariant(
        $isTableCellNode(node),
        'Expected result.node to be a TableCellNode',
      );

      return node;
    };

    test('DOM Conversion: <th> with scope="col" becomes COLUMN header', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col');

        const result = convertHTMLTag(th);

        const node = expectTableCellNode(result);

        expect(node.getHeaderStyles()).toBe(TableCellHeaderStates.COLUMN);
      });
    });

    test('DOM Conversion: <th> with scope="row" becomes ROW header', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const th = document.createElement('th');
        th.setAttribute('scope', 'row');

        const result = convertHTMLTag(th);

        const node = expectTableCellNode(result);

        expect(node.getHeaderStyles()).toBe(TableCellHeaderStates.ROW);
      });
    });

    test('DOM Conversion: <th> without scope defaults to ROW header', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const th = document.createElement('th');
        // No scope attribute set
        const result = convertHTMLTag(th);

        const node = expectTableCellNode(result);

        expect(node.getHeaderStyles()).toBe(TableCellHeaderStates.ROW);
      });
    });
  });
});
