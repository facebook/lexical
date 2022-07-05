/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToLineBeginning,
  pressBackspace,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  html,
  initialize,
  repeat,
  test,
} from '../utils/index.mjs';

function testSuite(charset) {
  test('displays overflow on text', async ({page, isCollab}) => {
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('12345');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">12345</span>
        </p>
      `,
    );

    await page.keyboard.type('6789');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">12345</span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span data-lexical-text="true">6789</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 4,
      focusPath: [0, 1, 0, 0],
    });

    await moveToLineBeginning(page);
    await page.keyboard.type('0');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">01234</span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span data-lexical-text="true">5</span>
          </span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span data-lexical-text="true">6789</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 0, 0],
      focusOffset: 1,
      focusPath: [0, 0, 0],
    });
  });

  test('displays overflow on token nodes', async ({page, isCollab}) => {
    // The smile emoji (S) is length 2, so for 1234S56:
    // - 1234 is non-overflow text
    // - S takes characters 5 and 6, since it's a token and can't be split we count the whole
    //   node as overflowed
    // - 56 is overflowed
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('1234:)56');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">1234</span>
          <span
            class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true">56</span>
          </span>
        </p>
      `,
    );

    await pressBackspace(page, 3);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">1234</span>
        </p>
      `,
    );
  });

  test('can type new lines inside overflow', async ({
    page,
    isRichText,
    isCollab,
  }) => {
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('123456');
    await page.keyboard.press('Enter');
    await page.keyboard.type('7');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">12345</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">6</span>
            </span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph">
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">7</span>
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">12345</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">6</span>
              <br />
              <span data-lexical-text="true">7</span>
            </span>
          </p>
        `,
      );
    }

    await pressBackspace(page, 3);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">12345</span>
        </p>
      `,
    );
  });

  test('can delete text in front and overflow is recomputed', async ({
    page,
    isRichText,
    isCollab,
  }) => {
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('123456');
    await page.keyboard.press('Enter');
    await page.keyboard.press('7');
    await moveToEditorBeginning(page);

    await page.keyboard.press('Delete');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">23456</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph">
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">7</span>
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">23456</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <br />
              <span data-lexical-text="true">7</span>
            </span>
          </p>
        `,
      );
    }

    await page.keyboard.press('Delete');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">3456</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">7</span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph">
            <span data-lexical-text="true">3456</span>
            <br />
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">7</span>
            </span>
          </p>
        `,
      );
    }
  });

  test('can delete text in front and overflow is recomputed (token nodes)', async ({
    page,
    isCollab,
  }) => {
    test.skip(isCollab);
    // See 'displays overflow on token nodes'
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('1234:)56');
    await moveToLineBeginning(page);

    await page.keyboard.press('Delete');
    if (charset === 'UTF-16') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">234</span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">56</span>
            </span>
          </p>
        `,
      );
    } else if (charset === 'UTF-8') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">234</span>
            <span
              class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span class="emoji happysmile" data-lexical-text="true">
                <span class="emoji-inner">🙂</span>
              </span>
              <span data-lexical-text="true">56</span>
            </span>
          </p>
        `,
      );
    }
  });

  test('can overflow in lists', async ({page, isCollab, isPlainText}) => {
    test.skip(isCollab || isPlainText);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('- 1234');
    await page.keyboard.press('Enter');
    await page.keyboard.type('56');
    await page.keyboard.press('Enter');
    await page.keyboard.type('7');
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">5</span><span class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span></span></li><li value="3" class="PlaygroundEditorTheme__listItem"><span class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></span></li></ul>',
    );

    await pressBackspace(page, 3);
    await assertHTML(
      page,
      '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">5</span></li></ul>',
    );
  });

  test('can delete an overflowed paragraph', async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.skip(isCollab || isPlainText);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('12345');
    await page.keyboard.press('Enter');
    await page.keyboard.type('6');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">12345</span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <span class="PlaygroundEditorTheme__characterLimit">
            <span data-lexical-text="true">6</span>
          </span>
        </p>
      `,
    );

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true">12345</span>
          <span class="PlaygroundEditorTheme__characterLimit">
            <span data-lexical-text="true">6</span>
          </span>
        </p>
      `,
    );
  });

  test('handles accented characters', async ({page, isCollab}) => {
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    // Worth 1 byte in UTF-16, 2 bytes in UTF-8
    await repeat(6, async () => await page.keyboard.type('à'));
    if (charset === 'UTF-16') {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">ààààà</span>
            <span
              class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">à</span>
            </span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">àà</span>
            <span
              class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">àààà</span>
            </span>
          </p>
        `,
      );
    }
  });

  test('handles graphemes', async ({page, isCollab, browserName}) => {
    test.skip(isCollab);
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('👨‍👩‍👦‍👦');
    if (['chromium', 'webkit'].includes(browserName)) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span
              class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">👨‍👩‍👦‍👦</span>
            </span>
          </p>
        `,
      );
    } else {
      if (charset === 'UTF-16') {
        await assertHTML(
          page,
          html`
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">👨‍👩</span>
              <span
                class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">‍👦‍👦</span>
              </span>
            </p>
          `,
        );
      } else {
        await assertHTML(
          page,
          html`
            <p
              class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
              dir="ltr">
              <span data-lexical-text="true">👨</span>
              <span
                class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr"
                dir="ltr">
                <span data-lexical-text="true">‍👩‍👦‍👦</span>
              </span>
            </p>
          `,
        );
      }
    }
  });
}

test.describe('CharacterLimit', () => {
  test.describe('UTF-16', () => {
    test.use({isCharLimit: true});
    test.beforeEach(({isCollab, page, isCharLimit, isCharLimitUtf8}) =>
      initialize({isCharLimit, isCharLimitUtf8, isCollab, page}),
    );
    testSuite('UTF-16');
  });

  test.describe('UTF-8', () => {
    test.use({isCharLimitUtf8: true});
    test.beforeEach(({isCollab, page, isCharLimit, isCharLimitUtf8}) =>
      initialize({isCharLimit, isCharLimitUtf8, isCollab, page}),
    );
    testSuite('UTF-8');
  });
});
