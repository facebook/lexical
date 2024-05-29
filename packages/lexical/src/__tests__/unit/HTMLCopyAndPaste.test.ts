/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertDataTransferForRichText} from '@lexical/clipboard';
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

describe('HTMLCopyAndPaste tests', () => {
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

      const HTML_COPY_PASTING_TESTS = [
        {
          expectedHTML: `<p dir="ltr"><span data-lexical-text="true">Hello!</span></p>`,
          name: 'plain DOM text node',
          pastedHTML: `Hello!`,
        },
        {
          expectedHTML: `<p dir="ltr"><span data-lexical-text="true">Hello!</span></p><p><br></p>`,
          name: 'a paragraph element',
          pastedHTML: `<p>Hello!<p>`,
        },
        {
          expectedHTML: `<p><span data-lexical-text="true">123</span></p><p><span data-lexical-text="true">456</span></p>`,
          name: 'a single div',
          pastedHTML: `123
            <div>
              456
            </div>`,
        },
        {
          expectedHTML: `<p dir="ltr"><span data-lexical-text="true">a</span></p><p dir="ltr"><span data-lexical-text="true">b b</span></p><p dir="ltr"><span data-lexical-text="true">c</span></p><p dir="ltr"><span data-lexical-text="true">z </span></p><p dir="ltr"><span data-lexical-text="true">d e </span></p><p dir="ltr"><span data-lexical-text="true">fg</span></p>`,
          name: 'nested divs',
          pastedHTML: `<div>
            a
            <div>
              b b
              <div>
                c
                <div>
                  <div></div>
                  z
                </div>
              </div>
              d e
            </div>
            fg
          </div>`,
        },
        {
          expectedHTML: `<p dir="ltr"><span data-lexical-text="true">a b c d e</span></p><p dir="ltr"><span data-lexical-text="true">f g h</span></p>`,
          name: 'multiple nested spans and divs',
          pastedHTML: `<div>
            a b
            <span>
              c d
              <span>e</span>
            </span>
            <div>
              f
              <span>g h</span>
            </div>
          </div>`,
        },
        {
          expectedHTML: `<p><span data-lexical-text="true">123</span></p><p><span data-lexical-text="true">456</span></p>`,
          name: 'nested span in a div',
          pastedHTML: `<div>
            <span>
              123
              <div>456</div>
            </span>
          </div>`,
        },
        {
          expectedHTML: `<p><span data-lexical-text="true">123</span></p><p><span data-lexical-text="true">456</span></p>`,
          name: 'nested div in a span',
          pastedHTML: ` <span>123<div>456</div></span>`,
        },
      ];

      HTML_COPY_PASTING_TESTS.forEach((testCase, i) => {
        test(`HTML copy paste: ${testCase.name}`, async () => {
          const {editor} = testEnv;

          const dataTransfer = new DataTransferMock();
          dataTransfer.setData('text/html', testCase.pastedHTML);
          await editor.update(() => {
            const selection = $getSelection();
            invariant(
              $isRangeSelection(selection),
              'isRangeSelection(selection)',
            );
            $insertDataTransferForRichText(dataTransfer, selection, editor);
          });
          expect(testEnv.innerHTML).toBe(testCase.expectedHTML);
        });
      });
    },
    {
      namespace: 'test',
      theme: {
        text: {
          bold: 'editor-text-bold',
          italic: 'editor-text-italic',
          underline: 'editor-text-underline',
        },
      },
    },
  );
});
