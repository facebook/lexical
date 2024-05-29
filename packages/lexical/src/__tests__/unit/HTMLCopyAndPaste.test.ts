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
        {
          expectedHTML: `<ul><li role="checkbox" tabindex="-1" aria-checked="true" value="1" dir="ltr"><span data-lexical-text="true">done</span></li><li role="checkbox" tabindex="-1" aria-checked="false" value="2" dir="ltr"><span data-lexical-text="true">todo</span></li><li value="3"><ul><li role="checkbox" tabindex="-1" aria-checked="true" value="1" dir="ltr"><span data-lexical-text="true">done</span></li><li role="checkbox" tabindex="-1" aria-checked="false" value="2" dir="ltr"><span data-lexical-text="true">todo</span></li></ul></li><li role="checkbox" tabindex="-1" aria-checked="false" value="3" dir="ltr"><span data-lexical-text="true">todo</span></li></ul>`,
          name: 'google doc checklist',
          pastedHTML: `<meta charset='utf-8'><meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1980f960-7fff-f4df-4ba3-26c6e1508542"><ul style="margin-top:0;margin-bottom:0;padding-inline-start:28px;"><li dir="ltr" role="checkbox" aria-checked="true" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAABbElEQVR4Ae3bsU4CYRDEcRsxodZE8Q0BbS258l5MwESJNL6HOfrPKdhyxeBcwk5mkn9F98sGIOSuPM/zPM/zPI+xG/SEtuiAWpEOaIOWaDIWziP6RK14OzSjX44ITvTBvqRn1MRaMIHeBIE2TKBBEGhgArWkKmtJBjKQgQxkIANd/Aw0NVC+O7RHvYFynHasN1COE/UGynGiXgOIjxOtdIH4OGJAfBwxID6OGBAfRwiIjyMARMCpCjRF5+72Dzhd5R+rHfpC92NeTlWgLl5PkQg4RYBynBSJgFMGKMNJkQg4lYFeUDuFRMCpBXQOEgGnDtA/kPg4xT7m2y/tCd9zKgOdviTC5RQEIiAFjh4QASlw9IAISIEjCURAWvmf1UDKcQwUSDmOgWLdMcxA7BnIQAYykIEM5EcRvplAW0GgNRNoKQg0ZwJN0E4I5x1dI+pmgSSA84BG2QQt0LrYG/eAXtGccjme53me53me9wPjPWZWjhktAQAAAABJRU5ErkJggg==" width="18.4px" height="18.4px" alt="checked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">done</span></p></li><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li><ul style="margin-top:0;margin-bottom:0;padding-inline-start:28px;"><li dir="ltr" role="checkbox" aria-checked="true" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;" aria-level="2"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAABbElEQVR4Ae3bsU4CYRDEcRsxodZE8Q0BbS258l5MwESJNL6HOfrPKdhyxeBcwk5mkn9F98sGIOSuPM/zPM/zPI+xG/SEtuiAWpEOaIOWaDIWziP6RK14OzSjX44ITvTBvqRn1MRaMIHeBIE2TKBBEGhgArWkKmtJBjKQgQxkIANd/Aw0NVC+O7RHvYFynHasN1COE/UGynGiXgOIjxOtdIH4OGJAfBwxID6OGBAfRwiIjyMARMCpCjRF5+72Dzhd5R+rHfpC92NeTlWgLl5PkQg4RYBynBSJgFMGKMNJkQg4lYFeUDuFRMCpBXQOEgGnDtA/kPg4xT7m2y/tCd9zKgOdviTC5RQEIiAFjh4QASlw9IAISIEjCURAWvmf1UDKcQwUSDmOgWLdMcxA7BnIQAYykIEM5EcRvplAW0GgNRNoKQg0ZwJN0E4I5x1dI+pmgSSA84BG2QQt0LrYG/eAXtGccjme53me53me9wPjPWZWjhktAQAAAABJRU5ErkJggg==" width="18.4px" height="18.4px" alt="checked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:line-through;-webkit-text-decoration-skip:none;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">done</span></p></li><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="2"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li></ul><li dir="ltr" role="checkbox" aria-checked="false" style="list-style-type:none;font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAA1ElEQVR4Ae3bMQ4BURSFYY2xBuwQ7BIkTGxFRj9Oo9RdkXn5TvL3L19u+2ZmZmZmZhVbpH26pFcaJ9IrndMudb/CWadHGiden1bll9MIzqd79SUd0thY20qga4NA50qgoUGgoRJo/NL/V/N+QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIEyFeEZyXQpUGgUyXQrkGgTSVQl/qGcG5pnkq3Sn0jOMv0k3Vpm05pmNjfsGPalFyOmZmZmdkbSS9cKbtzhxMAAAAASUVORK5CYII=" width="18.4px" height="18.4px" alt="unchecked" aria-roledescription="checkbox" style="margin-right:3px;" /><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;display:inline-block;vertical-align:top;margin-top:0;" role="presentation"><span style="font-size:11.5pt;font-family:'Optimistic Text',sans-serif;color:#000000;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">todo</span></p></li></ul></b>`,
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
