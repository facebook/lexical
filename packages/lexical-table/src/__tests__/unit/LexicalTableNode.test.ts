/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {$createTableNode} from '@lexical/table';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {
  DataTransferMock,
  initializeUnitTest,
  invariant,
} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    table: 'test-table-class',
  },
});

describe('LexicalTableNode tests', () => {
  initializeUnitTest((testEnv) => {
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

        expect(tableNode.createDOM(editorConfig).outerHTML).toBe(
          `<table class="${editorConfig.theme.table}"></table>`,
        );
      });
    });

    test('Copy table from an external source', async () => {
      const {editor} = testEnv;

      const dataTransfer = new DataTransferMock();
      dataTransfer.setData(
        'text/html',
        '<html><body><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-16a69100-7fff-6cb9-b829-cb1def16a58d"><div dir="ltr" style="margin-left:0pt;" align="left"><table style="border:none;border-collapse:collapse;table-layout:fixed;width:468pt"><colgroup><col /><col /></colgroup><tbody><tr style="height:22.015pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hello there</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">General Kenobi!</span></p></td></tr><tr style="height:22.015pt"><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><p dir="ltr" style="line-height:1.2;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lexical is nice</span></p></td><td style="border-left:solid #000000 1pt;border-right:solid #000000 1pt;border-bottom:solid #000000 1pt;border-top:solid #000000 1pt;vertical-align:top;padding:5pt 5pt 5pt 5pt;overflow:hidden;overflow-wrap:break-word;"><br /></td></tr></tbody></table></div></b><!--EndFragment--></body></html>',
      );
      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'isRangeSelection(selection)');
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      });
      // Make sure paragraph is inserted inside empty cells
      const emptyCell = '<td><p><br></p></td>';
      expect(testEnv.innerHTML).toBe(
        `<table><tr><td><p dir="ltr"><span data-lexical-text="true">Hello there</span></p></td><td><p dir="ltr"><span data-lexical-text="true">General Kenobi!</span></p></td></tr><tr><td><p dir="ltr"><span data-lexical-text="true">Lexical is nice</span></p></td>${emptyCell}</tr></table>`,
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
        invariant($isRangeSelection(selection), 'isRangeSelection(selection)');
        $insertDataTransferForRichText(dataTransfer, selection, editor);
      });
      expect(testEnv.innerHTML).toBe(
        `<table><tr style="height: 21px;"><td><p dir="ltr"><strong data-lexical-text="true">Surface</strong></p></td><td><p dir="ltr"><em data-lexical-text="true">MWP_WORK_LS_COMPOSER</em></p></td><td><p style="text-align: right;"><span data-lexical-text="true">77349</span></p></td></tr><tr style="height: 21px;"><td><p dir="ltr"><span data-lexical-text="true">Lexical</span></p></td><td><p dir="ltr"><span data-lexical-text="true">XDS_RICH_TEXT_AREA</span></p></td><td><p dir="ltr"><span data-lexical-text="true">sdvd </span><strong data-lexical-text="true">sdfvsfs</strong></p></td></tr></table>`,
      );
    });
  });
});
