/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

describe('LexicalHTML tests', () => {
  initializeUnitTest((testEnv) => {
    test('$generateHtmlFromNodes and $generateNodesFromDOM', async () => {
      const {editor} = testEnv;

      const html =
        '<p dir="ltr"><span>lexical</span></p><p dir="ltr"><span>facebook</span></p><p dir="rtl"><span>شسيبشسيب</span></p><p style="text-align: left;" dir="rtl"><span>شسيبشسيب</span></p>';

      await editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(html, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear().append(...nodes);

        const htmlNodes = $generateHtmlFromNodes(editor, null);
        expect(htmlNodes).toBe(html);
      });

      expect(testEnv.outerHTML).toBe(
        `<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true" dir="rtl"><p dir="ltr"><span data-lexical-text="true">lexical</span></p><p dir="ltr"><span data-lexical-text="true">facebook</span></p><p dir="rtl"><span data-lexical-text="true">شسيبشسيب</span></p><p dir="rtl" style="text-align: left;"><span data-lexical-text="true">شسيبشسيب</span></p></div>`,
      );
    });
  });
});
