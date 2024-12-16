/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {$generateHtmlFromNodes} from '@lexical/html';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableSelection,
  $insertTableColumn__EXPERIMENTAL,
  $isTableCellNode,
} from '@lexical/table';
import {$dfs} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $selectAll,
  $setSelection,
  CUT_COMMAND,
  ParagraphNode,
} from 'lexical';
import {
  DataTransferMock,
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
  invariant,
  polyfillContentEditable,
} from 'lexical/src/__tests__/utils';

import {$getElementForTableNode, TableNode} from '../../LexicalTableNode';

export class ClipboardDataMock {
  getData: jest.Mock<string, [string]>;
  setData: jest.Mock<void, [string, string]>;

  constructor() {
    this.getData = jest.fn();
    this.setData = jest.fn();
  }
}

export class ClipboardEventMock extends Event {
  clipboardData: ClipboardDataMock;

  constructor(type: string, options?: EventInit) {
    super(type, options);
    this.clipboardData = new ClipboardDataMock();
  }
}

global.document.execCommand = function execCommandMock(
  commandId: string,
  showUI?: boolean,
  value?: string,
): boolean {
  return true;
};
Object.defineProperty(window, 'ClipboardEvent', {
  value: new ClipboardEventMock('cut'),
});

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    table: 'test-table-class',
    tableRowStriping: 'test-table-row-striping-class',
    tableScrollableWrapper: 'table-scrollable-wrapper',
  },
});

function wrapTableHtml(expected: string): string {
  return expected
    .replace(/<table/g, `<div class="table-scrollable-wrapper"><table`)
    .replace(/<\/table>/g, '</table></div>');
}

polyfillContentEditable();

describe('LexicalTableNode tests', () => {
  [false, true].forEach((hasHorizontalScroll) => {
    describe(`hasHorizontalScroll={${hasHorizontalScroll}}`, () => {
      function expectTableHtmlToBeEqual(
        actual: string,
        expected: string,
      ): void {
        return expectHtmlToBeEqual(
          actual,
          hasHorizontalScroll ? wrapTableHtml(expected) : expected,
        );
      }
      initializeUnitTest(
        (testEnv) => {
          beforeEach(async () => {
            const {editor} = testEnv;
            await editor.update(() => {
              const root = $getRoot();
              const paragraph = $createParagraphNode();
              root.append(paragraph);
              paragraph.select();
            });
          });

          test('TableNode.constructor', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const tableNode = $createTableNode();

              expect(tableNode).not.toBe(null);
            });

            expect(() => $createTableNode()).toThrow();
          });

          test('TableNode.createDOM()', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const tableNode = $createTableNode();

              expectTableHtmlToBeEqual(
                tableNode.createDOM(editorConfig).outerHTML,
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup></colgroup>
                  </table>
                `,
              );
            });
          });

          test('TableNode.exportDOM() with range selection', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const tableNode = $createTableNodeWithDimensions(
                2,
                2,
              ).setColWidths([100, 200]);
              tableNode
                .getAllTextNodes()
                .forEach((node, i) => node.setTextContent(String(i)));
              $getRoot().clear().append(tableNode);
              expectHtmlToBeEqual(
                $generateHtmlFromNodes(editor, $getRoot().select(0)),
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup>
                      <col style="width: 100px" />
                      <col style="width: 200px" />
                    </colgroup>
                    <tbody>
                      <tr>
                        <th
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                            background-color: rgb(242, 243, 245);
                          ">
                          <p><span style="white-space: pre-wrap">0</span></p>
                        </th>
                        <th
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                            background-color: rgb(242, 243, 245);
                          ">
                          <p><span style="white-space: pre-wrap">1</span></p>
                        </th>
                      </tr>
                      <tr>
                        <th
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                            background-color: rgb(242, 243, 245);
                          ">
                          <p><span style="white-space: pre-wrap">2</span></p>
                        </th>
                        <td
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                          ">
                          <p><span style="white-space: pre-wrap">3</span></p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                `,
              );
            });
          });

          test('TableNode.exportDOM() with partial table selection', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const tableNode = $createTableNodeWithDimensions(
                2,
                2,
              ).setColWidths([100, 200]);
              tableNode
                .getAllTextNodes()
                .forEach((node, i) => node.setTextContent(String(i)));
              $getRoot().append(tableNode);
              const tableSelection = $createTableSelection();
              tableSelection.tableKey = tableNode.getKey();
              const cells = $dfs(tableNode).flatMap(({node}) =>
                $isTableCellNode(node) ? [node] : [],
              );
              // second column
              tableSelection.anchor.set(cells[1].getKey(), 0, 'element');
              tableSelection.focus.set(cells[3].getKey(), 0, 'element');
              expectHtmlToBeEqual(
                $generateHtmlFromNodes(editor, tableSelection),
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup><col style="width: 200px" /></colgroup>
                    <tbody>
                      <tr>
                        <th
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                            background-color: rgb(242, 243, 245);
                          ">
                          <p><span style="white-space: pre-wrap">1</span></p>
                        </th>
                      </tr>
                      <tr>
                        <td
                          style="
                            border: 1px solid black;
                            width: 75px;
                            vertical-align: top;
                            text-align: start;
                          ">
                          <p><span style="white-space: pre-wrap">3</span></p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                `,
              );
            });
          });

          test('Copy table from an external source', async () => {
            const {editor} = testEnv;

            const dataTransfer = new DataTransferMock();
            dataTransfer.setData(
              'text/html',
              '<html><body><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-16a69100-7fff-6cb9-b829-cb1def16a58d"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:100px"/><col style="width:200px"/></colgroup><tbody><tr style="height:22.015pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hello there</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">General Kenobi!</span></p></td></tr><tr style="height:22.015pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lexical is nice</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><br /></td></tr></tbody></table></div></b><!--EndFragment--></body></html>',
            );
            await editor.update(() => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'isRangeSelection(selection)',
              );
              $insertDataTransferForRichText(dataTransfer, selection, editor);
            });
            // Make sure paragraph is inserted inside empty cells
            const emptyCell = '<td><p><br></p></td>';
            expectTableHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <table class="test-table-class">
                  <colgroup>
                    <col style="width: 100px;" />
                    <col style="width: 200px;" />
                  </colgroup>
                  <tr>
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">Hello there</span>
                      </p>
                    </td>
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">General Kenobi!</span>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">Lexical is nice</span>
                      </p>
                    </td>
                    ${emptyCell}
                  </tr>
                </table>
              `,
            );
          });

          test('Copy table with caption/tbody/thead/tfoot from an external source', async () => {
            const {editor} = testEnv;

            const dataTransfer = new DataTransferMock();
            dataTransfer.setData(
              'text/html',
              // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead
              html`
                <meta charset="utf-8" />
                <table
                  style="box-sizing: border-box; border-collapse: collapse; border: 2px solid rgb(140, 140, 140); font-family: sans-serif; font-size: 0.8rem; letter-spacing: 1px; color: rgb(21, 20, 26); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; orphans: 2; text-align: start; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">
                  <caption
                    style="box-sizing: border-box; caption-side: bottom; padding: 10px;">
                    Council budget (in £) 2018
                  </caption>
                  <thead
                    style="box-sizing: border-box; background-color: rgb(44, 94, 119); color: rgb(255, 255, 255);">
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="col"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px;">
                        Items
                      </th>
                      <th
                        scope="col"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px;">
                        Expenditure
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    style="box-sizing: border-box; background-color: rgb(228, 240, 245);">
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px;">
                        Donuts
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center;">
                        3,000
                      </td>
                    </tr>
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px;">
                        Stationery
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center;">
                        18,000
                      </td>
                    </tr>
                  </tbody>
                  <tfoot
                    style="box-sizing: border-box; background-color: rgb(44, 94, 119); color: rgb(255, 255, 255);">
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px;">
                        Totals
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center;">
                        21,000
                      </td>
                    </tr>
                  </tfoot>
                </table>
              `,
            );
            await editor.update(() => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'isRangeSelection(selection)',
              );
              $insertDataTransferForRichText(dataTransfer, selection, editor);
            });
            // Here we are testing the createDOM, not the exportDOM, so the tbody is not there
            expectTableHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <table class="test-table-class">
                  <colgroup>
                    <col />
                    <col />
                  </colgroup>
                  <tr style="text-align: start">
                    <th>
                      <p dir="ltr">
                        <span data-lexical-text="true">Items</span>
                      </p>
                    </th>
                    <th>
                      <p dir="ltr">
                        <span data-lexical-text="true">Expenditure</span>
                      </p>
                    </th>
                  </tr>
                  <tr style="text-align: start">
                    <th>
                      <p dir="ltr">
                        <span data-lexical-text="true">Donuts</span>
                      </p>
                    </th>
                    <td>
                      <p style="text-align: center;">
                        <span data-lexical-text="true">3,000</span>
                      </p>
                    </td>
                  </tr>
                  <tr style="text-align: start">
                    <th>
                      <p dir="ltr">
                        <span data-lexical-text="true">Stationery</span>
                      </p>
                    </th>
                    <td>
                      <p style="text-align: center;">
                        <span data-lexical-text="true">18,000</span>
                      </p>
                    </td>
                  </tr>
                  <tr style="text-align: start">
                    <th>
                      <p dir="ltr">
                        <span data-lexical-text="true">Totals</span>
                      </p>
                    </th>
                    <td>
                      <p style="text-align: center;">
                        <span data-lexical-text="true">21,000</span>
                      </p>
                    </td>
                  </tr>
                </table>
              `,
            );
          });

          test('Copy table with caption from an external source', async () => {
            const {editor} = testEnv;

            const dataTransfer = new DataTransferMock();
            dataTransfer.setData(
              'text/html',
              // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption
              html`
                <meta charset="utf-8" />
                <table
                  style="box-sizing: border-box; border-collapse: collapse; border: 2px solid rgb(140, 140, 140); font-family: sans-serif; font-size: 0.8rem; letter-spacing: 1px; color: rgb(21, 20, 26); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; orphans: 2; text-align: start; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">
                  <caption
                    style="box-sizing: border-box; caption-side: bottom; padding: 10px; font-weight: bold;">
                    He-Man and Skeletor facts
                  </caption>
                  <tbody style="box-sizing: border-box;">
                    <tr style="box-sizing: border-box;">
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(240, 240, 240);"></td>
                      <th
                        class="heman"
                        scope="col"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; background-color: rgb(230, 230, 230); font: 1.4rem molot; text-shadow: rgb(255, 255, 255) 1px 1px 1px, rgb(0, 0, 0) 2px 2px 1px;">
                        He-Man
                      </th>
                      <th
                        class="skeletor"
                        scope="col"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; background-color: rgb(230, 230, 230); font: 1.7rem rapscallion; letter-spacing: 3px; text-shadow: rgb(255, 255, 255) 1px 1px 0px, rgb(0, 0, 0) 0px 0px 9px;">
                        Skeletor
                      </th>
                    </tr>
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; background-color: rgb(230, 230, 230);">
                        Role
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(250, 250, 250);">
                        Hero
                      </td>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(250, 250, 250);">
                        Villain
                      </td>
                    </tr>
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; background-color: rgb(230, 230, 230);">
                        Weapon
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(240, 240, 240);">
                        Power Sword
                      </td>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(240, 240, 240);">
                        Havoc Staff
                      </td>
                    </tr>
                    <tr style="box-sizing: border-box;">
                      <th
                        scope="row"
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; background-color: rgb(230, 230, 230);">
                        Dark secret
                      </th>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(250, 250, 250);">
                        Expert florist
                      </td>
                      <td
                        style="box-sizing: border-box; border: 1px solid rgb(160, 160, 160); padding: 8px 10px; text-align: center; background-color: rgb(250, 250, 250);">
                        Cries at romcoms
                      </td>
                    </tr>
                  </tbody>
                </table>
              `,
            );
            await editor.update(() => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'isRangeSelection(selection)',
              );
              $insertDataTransferForRichText(dataTransfer, selection, editor);
            });
            // Here we are testing the createDOM, not the exportDOM, so the tbody is not there
            expectTableHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <table class="test-table-class">
                  <colgroup>
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <tr style="text-align: start">
                    <td style="background-color: rgb(240, 240, 240)">
                      <p style="text-align: center"><br /></p>
                    </td>
                    <th style="background-color: rgb(230, 230, 230)">
                      <p dir="ltr">
                        <span data-lexical-text="true">He-Man</span>
                      </p>
                    </th>
                    <th style="background-color: rgb(230, 230, 230)">
                      <p dir="ltr">
                        <span data-lexical-text="true">Skeletor</span>
                      </p>
                    </th>
                  </tr>
                  <tr style="text-align: start">
                    <th style="background-color: rgb(230, 230, 230)">
                      <p dir="ltr">
                        <span data-lexical-text="true">Role</span>
                      </p>
                    </th>
                    <td style="background-color: rgb(250, 250, 250)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Hero</span>
                      </p>
                    </td>
                    <td style="background-color: rgb(250, 250, 250)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Villain</span>
                      </p>
                    </td>
                  </tr>
                  <tr style="text-align: start">
                    <th style="background-color: rgb(230, 230, 230)">
                      <p dir="ltr">
                        <span data-lexical-text="true">Weapon</span>
                      </p>
                    </th>
                    <td style="background-color: rgb(240, 240, 240)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Power Sword</span>
                      </p>
                    </td>
                    <td style="background-color: rgb(240, 240, 240)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Havoc Staff</span>
                      </p>
                    </td>
                  </tr>
                  <tr style="text-align: start">
                    <th style="background-color: rgb(230, 230, 230)">
                      <p dir="ltr">
                        <span data-lexical-text="true">Dark secret</span>
                      </p>
                    </th>
                    <td style="background-color: rgb(250, 250, 250)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Expert florist</span>
                      </p>
                    </td>
                    <td style="background-color: rgb(250, 250, 250)">
                      <p dir="ltr" style="text-align: center">
                        <span data-lexical-text="true">Cries at romcoms</span>
                      </p>
                    </td>
                  </tr>
                </table>
              `,
            );
          });

          test('Copy table from an external source like gdoc with formatting', async () => {
            const {editor} = testEnv;

            const dataTransfer = new DataTransferMock();
            dataTransfer.setData(
              'text/html',
              '<google-sheets-html-origin><style type="text/css"><!--td {border: 1px solid #cccccc;}br {mso-data-placement:same-cell;}--></style><table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr" border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;width:0px;border-collapse:collapse;border:none" data-sheets-root="1"><colgroup><col width="100"/><col width="189"/><col width="171"/></colgroup><tbody><tr style="height:21px;"><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;font-weight:bold;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;Surface&quot;}">Surface</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;font-style:italic;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;MWP_WORK_LS_COMPOSER&quot;}">MWP_WORK_LS_COMPOSER</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;text-decoration:underline;text-align:right;" data-sheets-value="{&quot;1&quot;:3,&quot;3&quot;:77349}">77349</td></tr><tr style="height:21px;"><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;Lexical&quot;}">Lexical</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;text-decoration:line-through;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;XDS_RICH_TEXT_AREA&quot;}">XDS_RICH_TEXT_AREA</td><td style="overflow:hidden;padding:2px 3px 2px 3px;vertical-align:bottom;" data-sheets-value="{&quot;1&quot;:2,&quot;2&quot;:&quot;sdvd sdfvsfs&quot;}" data-sheets-textstyleruns="{&quot;1&quot;:0}{&quot;1&quot;:5,&quot;2&quot;:{&quot;5&quot;:1}}"><span style="font-size:10pt;font-family:Arial;font-style:normal;">sdvd </span><span style="font-size:10pt;font-family:Arial;font-weight:bold;font-style:normal;">sdfvsfs</span></td></tr></tbody></table>',
            );
            await editor.update(() => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'isRangeSelection(selection)',
              );
              $insertDataTransferForRichText(dataTransfer, selection, editor);
            });
            expectTableHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <table class="test-table-class">
                  <colgroup>
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <tr style="height: 21px;">
                    <td>
                      <p dir="ltr">
                        <strong data-lexical-text="true">Surface</strong>
                      </p>
                    </td>
                    <td>
                      <p dir="ltr">
                        <em data-lexical-text="true">MWP_WORK_LS_COMPOSER</em>
                      </p>
                    </td>
                    <td>
                      <p style="text-align: right;">
                        <span data-lexical-text="true">77349</span>
                      </p>
                    </td>
                  </tr>
                  <tr style="height: 21px;">
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">Lexical</span>
                      </p>
                    </td>
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">XDS_RICH_TEXT_AREA</span>
                      </p>
                    </td>
                    <td>
                      <p dir="ltr">
                        <span data-lexical-text="true">sdvd</span>
                        <strong data-lexical-text="true">sdfvsfs</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              `,
            );
          });

          test('Cut table in the middle of a range selection', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const paragraph = root.getFirstChild<ParagraphNode>();
              const beforeText = $createTextNode('text before the table');
              const table = $createTableNodeWithDimensions(4, 4, true);
              const afterText = $createTextNode('text after the table');

              paragraph?.append(beforeText);
              paragraph?.append(table);
              paragraph?.append(afterText);
            });
            await editor.update(() => {
              editor.focus();
              $selectAll();
            });
            await editor.update(() => {
              editor.dispatchCommand(CUT_COMMAND, {} as ClipboardEvent);
            });

            expectHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <p><br /></p>
              `,
            );
          });

          test('Cut table as last node in range selection ', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const paragraph = root.getFirstChild<ParagraphNode>();
              const beforeText = $createTextNode('text before the table');
              const table = $createTableNodeWithDimensions(4, 4, true);

              paragraph?.append(beforeText);
              paragraph?.append(table);
            });
            await editor.update(() => {
              editor.focus();
              $selectAll();
            });
            await editor.update(() => {
              editor.dispatchCommand(CUT_COMMAND, {} as ClipboardEvent);
            });

            expectHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <p><br /></p>
              `,
            );
          });

          test('Cut table as first node in range selection ', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const paragraph = root.getFirstChild<ParagraphNode>();
              const table = $createTableNodeWithDimensions(4, 4, true);
              const afterText = $createTextNode('text after the table');

              paragraph?.append(table);
              paragraph?.append(afterText);
            });
            await editor.update(() => {
              editor.focus();
              $selectAll();
            });
            await editor.update(() => {
              editor.dispatchCommand(CUT_COMMAND, {} as ClipboardEvent);
            });

            expectHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <p><br /></p>
              `,
            );
          });

          test('Cut table is whole selection, should remove it', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const table = $createTableNodeWithDimensions(4, 4, true);
              root.append(table);
            });
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              if (table) {
                const DOMTable = $getElementForTableNode(editor, table);
                if (DOMTable) {
                  table
                    ?.getCellNodeFromCords(0, 0, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('some text'));
                  const selection = $createTableSelection();
                  selection.set(
                    table.__key,
                    table?.getCellNodeFromCords(0, 0, DOMTable)?.__key || '',
                    table?.getCellNodeFromCords(3, 3, DOMTable)?.__key || '',
                  );
                  $setSelection(selection);
                  editor.dispatchCommand(CUT_COMMAND, {
                    preventDefault: () => {},
                    stopPropagation: () => {},
                  } as ClipboardEvent);
                }
              }
            });

            expectHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <p><br /></p>
              `,
            );
          });

          test('Cut subsection of table cells, should just clear contents', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const table = $createTableNodeWithDimensions(4, 4, true);
              root.append(table);
            });
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              if (table) {
                const DOMTable = $getElementForTableNode(editor, table);
                if (DOMTable) {
                  table
                    ?.getCellNodeFromCords(0, 0, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('some text'));
                  const selection = $createTableSelection();
                  selection.set(
                    table.__key,
                    table?.getCellNodeFromCords(0, 0, DOMTable)?.__key || '',
                    table?.getCellNodeFromCords(2, 2, DOMTable)?.__key || '',
                  );
                  $setSelection(selection);
                  editor.dispatchCommand(CUT_COMMAND, {
                    preventDefault: () => {},
                    stopPropagation: () => {},
                  } as ClipboardEvent);
                }
              }
            });

            expectTableHtmlToBeEqual(
              testEnv.innerHTML,
              html`
                <p><br /></p>
                <table class="test-table-class">
                  <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <tr>
                    <th>
                      <p><br /></p>
                    </th>
                    <th>
                      <p><br /></p>
                    </th>
                    <th>
                      <p><br /></p>
                    </th>
                    <th>
                      <p><br /></p>
                    </th>
                  </tr>
                  <tr>
                    <th>
                      <p><br /></p>
                    </th>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <p><br /></p>
                    </th>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <p><br /></p>
                    </th>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                    <td>
                      <p><br /></p>
                    </td>
                  </tr>
                </table>
              `,
            );
          });

          test('Table plain text output validation', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const table = $createTableNodeWithDimensions(4, 4, true);
              root.append(table);
            });
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              if (table) {
                const DOMTable = $getElementForTableNode(editor, table);
                if (DOMTable) {
                  table
                    ?.getCellNodeFromCords(0, 0, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('1'));
                  table
                    ?.getCellNodeFromCords(1, 0, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode(''));
                  table
                    ?.getCellNodeFromCords(2, 0, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('2'));
                  table
                    ?.getCellNodeFromCords(0, 1, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('3'));
                  table
                    ?.getCellNodeFromCords(1, 1, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode('4'));
                  table
                    ?.getCellNodeFromCords(2, 1, DOMTable)
                    ?.getLastChild<ParagraphNode>()
                    ?.append($createTextNode(''));
                  const selection = $createTableSelection();
                  selection.set(
                    table.__key,
                    table?.getCellNodeFromCords(0, 0, DOMTable)?.__key || '',
                    table?.getCellNodeFromCords(2, 1, DOMTable)?.__key || '',
                  );
                  expect(selection.getTextContent()).toBe(`1\t\t2\n3\t4\t\n`);
                }
              }
            });
          });

          test('Toggle row striping ON/OFF', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const table = $createTableNodeWithDimensions(4, 4, true);
              root.append(table);
            });
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              if (table) {
                table.setRowStriping(true);
              }
            });

            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              expectTableHtmlToBeEqual(
                table!.createDOM(editorConfig).outerHTML,
                html`
                  <table
                    class="${editorConfig.theme.table} ${editorConfig.theme
                      .tableRowStriping}"
                    data-lexical-row-striping="true">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                  </table>
                `,
              );
            });

            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              if (table) {
                table.setRowStriping(false);
              }
            });

            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              expectTableHtmlToBeEqual(
                table!.createDOM(editorConfig).outerHTML,
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup>
                      <col />
                      <col />
                      <col />
                      <col />
                    </colgroup>
                  </table>
                `,
              );
            });
          });

          test('Update column widths', async () => {
            const {editor} = testEnv;

            await editor.update(() => {
              const root = $getRoot();
              const table = $createTableNodeWithDimensions(4, 2, true);
              root.append(table);
            });

            // Set widths
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              table!.setColWidths([50, 50]);
            });

            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              expectTableHtmlToBeEqual(
                table!.createDOM(editorConfig).outerHTML,
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup>
                      <col style="width: 50px;" />
                      <col style="width: 50px;" />
                    </colgroup>
                  </table>
                `,
              );
              const colWidths = table!.getColWidths();

              // colwidths should be immutable in DEV
              expect(() => {
                (colWidths as number[]).push(100);
              }).toThrow();
              expect(table!.getColWidths()).toStrictEqual([50, 50]);
              expect(table!.getColumnCount()).toBe(2);
            });

            // Add a column
            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              const DOMTable = $getElementForTableNode(editor, table!);
              const selection = $createTableSelection();
              selection.set(
                table!.__key,
                table!.getCellNodeFromCords(0, 0, DOMTable)?.__key || '',
                table!.getCellNodeFromCords(0, 0, DOMTable)?.__key || '',
              );
              $setSelection(selection);
              $insertTableColumn__EXPERIMENTAL();
              table!.setColWidths([50, 50, 100]);
            });

            await editor.update(() => {
              const root = $getRoot();
              const table = root.getLastChild<TableNode>();
              expectTableHtmlToBeEqual(
                table!.createDOM(editorConfig).outerHTML,
                html`
                  <table class="${editorConfig.theme.table}">
                    <colgroup>
                      <col style="width: 50px;" />
                      <col style="width: 50px;" />
                      <col style="width: 100px;" />
                    </colgroup>
                  </table>
                `,
              );
              expect(table!.getColWidths()).toStrictEqual([50, 50, 100]);
              expect(table!.getColumnCount()).toBe(3);
            });
          });
        },
        {theme: editorConfig.theme},
        <TablePlugin hasHorizontalScroll={hasHorizontalScroll} />,
      );
    });
  });
});
