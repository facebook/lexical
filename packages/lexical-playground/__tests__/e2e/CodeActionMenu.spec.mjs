/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {paste} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  evaluate,
  focusEditor,
  initialize,
  mouseMoveTo,
  pasteFromClipboard,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('CodeActionMenu', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('Can copy code, when click `Copy` button', async ({
    page,
    context,
    isPlainText,
    browserName,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('``` ');
    await page.keyboard.press('Space');
    await page.keyboard.type(`const a = 'Hello'`);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');
    await page.keyboard.type(`const b = 'World'`);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      `
        <code
          class=\"PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr\"
          dir=\"ltr\"
          spellcheck=\"false\"
          data-gutter=\"123\"
          data-highlight-language=\"javascript\">
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">a</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'Hello'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">b</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'World'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
        </code>
      `,
    );

    await mouseMoveTo(page, 'code.PlaygroundEditorTheme__code');

    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-write']);
      await click(page, 'button[aria-label=copy]');
      await paste(page);
      await context.clearPermissions();
    } else {
      await waitForSelector(page, 'button[aria-label=copy]');

      const copiedText = await evaluate(page, () => {
        let text = null;

        navigator.clipboard._writeText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function (data) {
          text = data;
          this._writeText(data);
        };
        document.querySelector('button[aria-label=copy]').click();

        return text;
      });

      await pasteFromClipboard(page, {
        'text/plain': copiedText,
      });
    }

    await assertHTML(
      page,
      `
          <code
          class=\"PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr\"
          dir=\"ltr\"
          spellcheck=\"false\"
          data-gutter=\"12345\"
          data-highlight-language=\"javascript\">
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">a</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'Hello'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">b</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'World'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">a</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'Hello'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenAttr\" data-lexical-text=\"true\">
            const
          </span>
          <span data-lexical-text=\"true\">b</span>
          <span class=\"PlaygroundEditorTheme__tokenOperator\" data-lexical-text=\"true\">
            =
          </span>
          <span data-lexical-text=\"true\"></span>
          <span class=\"PlaygroundEditorTheme__tokenSelector\" data-lexical-text=\"true\">
            'World'
          </span>
          <br />
          <span data-lexical-text=\"true\"></span>
        </code>
      `,
    );
  });
});
