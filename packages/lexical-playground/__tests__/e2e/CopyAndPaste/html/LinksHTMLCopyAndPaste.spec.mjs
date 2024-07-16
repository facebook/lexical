/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  extendToNextWord,
  moveLeft,
  moveRight,
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineBeginning,
  moveToNextWord,
  selectAll,
} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  copyToClipboard,
  expect,
  focusEditor,
  html,
  initialize,
  locate,
  pasteFromClipboard,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML Links CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste an anchor element', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': '<a href="https://facebook.com">Facebook!</a>',
    };

    await pasteFromClipboard(page, clipboard);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://facebook.com">
            <span data-lexical-text="true">Facebook!</span>
          </a>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 9,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 9,
      focusPath: [0, 0, 0, 0],
    });

    await selectAll(page);

    // unlink
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">Facebook!</span>
        </p>
      `,
    );

    await click(page, '.link');
    await expect(locate(page, '.link-input')).toBeFocused();
    await page.keyboard.type('facebook.com');
    await click(page, '.link-confirm');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://facebook.com"
            rel="noreferrer">
            <span data-lexical-text="true">Facebook!</span>
          </a>
        </p>
      `,
    );
  });

  test('Copy + paste in front of or after a link', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/html': `text<a href="https://test.com/1">link</a>text`,
    });
    await moveToEditorBeginning(page);
    await pasteFromClipboard(page, {
      'text/html': 'before',
    });
    await moveToEditorEnd(page);
    await pasteFromClipboard(page, {
      'text/html': 'after',
    });
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">beforetext</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://test.com/1">
            <span data-lexical-text="true">link</span>
          </a>
          <span data-lexical-text="true">textafter</span>
        </p>
      `,
    );
  });

  test('Copy + paste link by selecting its (partial) content', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/html': `text<a href="https://test.com/">link</a>text`,
    });
    await moveLeft(page, 5);
    await page.keyboard.down('Shift');
    await moveLeft(page, 2);
    await page.keyboard.up('Shift');
    const clipboard = await copyToClipboard(page);
    await moveToEditorEnd(page);
    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">text</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://test.com/">
            <span data-lexical-text="true">link</span>
          </a>
          <span data-lexical-text="true">text</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://test.com/">
            <span data-lexical-text="true">in</span>
          </a>
        </p>
      `,
    );
  });

  test('Copy + paste empty link #3193', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      // eslint-disable-next-line no-irregular-whitespace
      'text/html': `<meta charset='utf-8'><div class="xisnujt x1e56ztr" style="margin-bottom: 8px; min-height: 20px; font-family: system-ui, -apple-system, &quot;system-ui&quot;, &quot;.SFNSText-Regular&quot;, sans-serif; color: rgb(5, 5, 5); font-size: 15px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><span class="x193iq5w xeuugli x13faqbe x1vvkbs xlh3980 xvmahel x1n0sxbx x6prxxf xvq8zen xo1l8bm xzsf02u" style="word-break: break-word; max-width: 100%; font-family: inherit; overflow-wrap: break-word; font-size: 0.9375rem; min-width: 0px; font-weight: 400; -webkit-font-smoothing: antialiased; line-height: 1.3333; color: var(--primary-text);">Line 0</span></div><ul class="x1e56ztr x1xmf6yo x1xfsgkm xrylv2j" style="list-style-type: circle; margin: 8px 0px; padding: 0px 0px 0px 32px; color: rgb(5, 5, 5); font-family: system-ui, -apple-system, &quot;system-ui&quot;, &quot;.SFNSText-Regular&quot;, sans-serif; font-size: 15px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: left; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;"><li><div class="xisnujt x1e56ztr" style="margin-bottom: 8px; min-height: 20px; font-family: inherit;"><span class="x193iq5w xeuugli x13faqbe x1vvkbs xlh3980 xvmahel x1n0sxbx x6prxxf xvq8zen xo1l8bm xzsf02u" style="word-break: break-word; max-width: 100%; font-family: inherit; overflow-wrap: break-word; font-size: 0.9375rem; min-width: 0px; font-weight: 400; -webkit-font-smoothing: antialiased; line-height: 1.3333; color: var(--primary-text);"><span class="xiy17q3 x1tbiz1a x1rg5ohu x1j61x8r x1fcty0u xdj266r xhhsvwb xat24cr xgzva0m x6ikm8r x10wlt62 xxymvpz xlup9mm x1kky2od" style="overflow: hidden; font-weight: normal; font-style: normal; width: 16px; display: inline-block; background-size: contain; margin: 0px 1px; background-repeat: no-repeat; height: 16px; vertical-align: middle; font-family: inherit; background-image: url(&quot;https://static.xx.fbcdn.net/images/emoji.php/v9/t14/1.5/16/2611.png&quot;);"><span class="xidgzdc xbyyjgo xt0psk2 x19co3pv" style="color: transparent; opacity: 0.5; display: inline; font-family: inherit;">â..ï¸.</span></span><span>Â </span>Line 1<span>Â </span><span style="font-family: inherit;"><a class="x1i10hfl xjbqb8w x6umtig x1b1mbwd xaqea5y xav7gou x9f619 x1ypdohk xt0psk2 xe8uvvx xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x4uap5 x18d9i69 xkhd6sd x16tdsg8 x1hl2dhg xggy1nq x1a2a7pz x1fey0fg" href="https://www.internalfb.com/removed?entry_point=20" rel="nofollow noreferrer" role="link" tabindex="0" target="_blank" style="color: var(--blue-link); cursor: pointer; text-decoration: none; outline: none; list-style: none; border-width: 0px; border-style: initial; border-color: initial; margin: 0px; text-align: inherit; padding: 0px; -webkit-tap-highlight-color: transparent; box-sizing: border-box; touch-action: manipulation; background-color: transparent; display: inline; font-family: inherit;"><span class="xt0psk2" style="display: inline; font-family: inherit;"><span style="font-family: inherit;">Some link</span></span></a></span>.</span></div></li><li><div class="xisnujt x1e56ztr" style="margin-bottom: 8px; min-height: 20px; font-family: inherit;"><span class="x193iq5w xeuugli x13faqbe x1vvkbs xlh3980 xvmahel x1n0sxbx x6prxxf xvq8zen xo1l8bm xzsf02u" style="word-break: break-word; max-width: 100%; font-family: inherit; overflow-wrap: break-word; font-size: 0.9375rem; min-width: 0px; font-weight: 400; -webkit-font-smoothing: antialiased; line-height: 1.3333; color: var(--primary-text);"><span class="xiy17q3 x1tbiz1a x1rg5ohu x1j61x8r x1fcty0u xdj266r xhhsvwb xat24cr xgzva0m x6ikm8r x10wlt62 xxymvpz xlup9mm x1kky2od" style="overflow: hidden; font-weight: normal; font-style: normal; width: 16px; display: inline-block; background-size: contain; margin: 0px 1px; background-repeat: no-repeat; height: 16px; vertical-align: middle; font-family: inherit; background-image: url(&quot;https://static.xx.fbcdn.net/images/emoji.php/v9/t14/1.5/16/2611.png&quot;);"><span class="xidgzdc xbyyjgo xt0psk2 x19co3pv" style="color: transparent; opacity: 0.5; display: inline; font-family: inherit;">â..ï¸.</span></span><span>Â </span>Line 2.</span></div></li></ul>`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="text-align: left">
          <span data-lexical-text="true">Line 0</span>
        </p>
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            style="text-align: left"
            value="1">
            <span data-lexical-text="true">â..ï¸.Â&nbsp;Line 1Â&nbsp;</span>
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
              dir="ltr"
              href="https://www.internalfb.com/removed?entry_point=20"
              rel="nofollow noreferrer"
              target="_blank">
              <span data-lexical-text="true">Some link</span>
            </a>
            <span data-lexical-text="true">.</span>
          </li>
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            style="text-align: left"
            value="2">
            <span data-lexical-text="true">â..ï¸.Â&nbsp;Line 2.</span>
          </li>
        </ul>
      `,
    );
  });

  test('Paste a link into text', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('A Lexical in the wild');
    await page.pause();
    await moveToLineBeginning(page);
    await moveToNextWord(page);
    await extendToNextWord(page);

    const clipboard = {
      text: `https://lexical.dev`,
    };

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">A</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://lexical.dev"
            rel="noreferrer">
            <span data-lexical-text="true">Lexical</span>
          </a>
          <span data-lexical-text="true">in the wild</span>
        </p>
      `,
    );
  });

  test('Paste text into a link', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Link text');
    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');
    await moveRight(page, 1);
    await moveLeft(page, 4);

    await pasteFromClipboard(page, {
      'text/html': 'normal text',
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Link</span>
          </a>
          <span data-lexical-text="true">normal text</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">text</span>
          </a>
        </p>
      `,
    );
  });

  test('Paste formatted text into a link', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Link text');
    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');
    await moveRight(page, 1);
    await moveLeft(page, 4);

    await pasteFromClipboard(page, {
      'text/html': '<b>bold</b> text',
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Link</span>
          </a>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            bold
          </strong>
          <span data-lexical-text="true">text</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">text</span>
          </a>
        </p>
      `,
    );
  });

  test('Paste a link into a link', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Link text');
    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');
    await moveRight(page, 1);
    await moveLeft(page, 4);

    await pasteFromClipboard(page, {
      'text/html': 'text with <a href="https://lexical.dev">link</b>',
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Link</span>
          </a>
          <span data-lexical-text="true">text with</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://lexical.dev">
            <span data-lexical-text="true">link</span>
          </a>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">text</span>
          </a>
        </p>
      `,
    );
  });

  test('Paste multiple blocks into a link', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Link text');
    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');
    await moveRight(page, 1);
    await moveLeft(page, 4);

    await pasteFromClipboard(page, {
      'text/html': '<p>para 1</p><p>para 2</p>',
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Link</span>
          </a>
          <span data-lexical-text="true">para 1</span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">para 2</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">text</span>
          </a>
        </p>
      `,
    );
  });
});
