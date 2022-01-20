/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  selectOption,
  focusEditor,
} from '../utils';
import {moveToEditorBeginning} from '../keyboardShortcuts';

describe('CodeBlock', () => {
  initializeE2E((e2e) => {
    it('Can create code block with markdown', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('``` alert(1);');
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 4, 0],
          anchorOffset: 1,
          focusPath: [0, 4, 0],
          focusOffset: 1,
        });
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>',
        );

        // Remove code block (back to a normal paragraph) and check that highlights are converted into regular text
        await moveToEditorBeginning(page);
        await page.keyboard.press('Backspace');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">alert(1);</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` alert(1);</span></p>',
        );
      }
    });

    it('Can create code block with markdown and wrap existing text', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('alert(1);');
      await moveToEditorBeginning(page);
      await page.keyboard.type('``` ');
      if (isRichText) {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 0, 0],
          focusOffset: 0,
        });
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span></code>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` alert(1);</span></p>',
        );
      }
    });

    it('Can switch highlighting language in a toolbar', async () => {
      const {page, isRichText} = e2e;
      await focusEditor(page);
      await page.keyboard.type('``` select * from users');
      if (isRichText) {
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span data-lexical-text="true">select </span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">*</span><span data-lexical-text="true"> from users</span></code>',
        );
        await selectOption(page, '.code-language', {value: 'sql'});
        await assertHTML(
          page,
          '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">select</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenOperator lonyqbdx" data-lexical-text="true">*</span><span data-lexical-text="true"> </span><span class="PlaygroundEditorTheme__tokenAttr f7xs5s0g" data-lexical-text="true">from</span><span data-lexical-text="true"> users</span></code>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-lexical-text="true">``` select * from users</span></p>',
        );
      }
    });

    it('Can maintain indent when creating new lines', async () => {
      const {page, isRichText} = e2e;
      if (!isRichText) {
        return;
      }
      await focusEditor(page);
      await page.keyboard.type('``` alert(1);');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Tab');
      await page.keyboard.type('alert(2);');
      await page.keyboard.press('Enter');
      await assertHTML(
        page,
        '<code class="PlaygroundEditorTheme__code igcfgt1w ne4oaoub b6ax4al1 q46jt4gp b0eko5f3 r5g9zsuq fwlpnqze l9mvetk9 f6xnxolp l7ghb35v kmwttqpk th51lws0 mfn553m3 fxyi2ncp PlaygroundEditorTheme__ltr gkum2dnh" spellcheck="false" dir="ltr"><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span data-lexical-text="true">	</span><span class="PlaygroundEditorTheme__tokenFunction jloxbjlh" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty hteo0ag1" data-lexical-text="true">2</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation mudd945w" data-lexical-text="true">;</span><br><span data-lexical-text="true">	</span></code>',
      );
    });
  });
});
