/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  E2E_BROWSER,
} from '../utils';
import {moveToEditorBeginning, moveToLineBeginning} from '../keyboardShortcuts';

function testSuite(e2e, charset: 'UTF-8' | 'UTF-16') {
  it.skipIf(e2e.isCollab, 'displays overflow on text', async () => {
    const {page} = e2e;
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('12345');
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span></p>',
    );

    await page.keyboard.type('6789');
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span></p><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6789</span></div><p></p>',
    );
    await assertSelection(page, {
      anchorPath: [0, 1, 0, 0],
      anchorOffset: 4,
      focusPath: [0, 1, 0, 0],
      focusOffset: 4,
    });

    await moveToLineBeginning(page);
    await page.keyboard.type('0');

    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">01234</span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">5</span></div><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6789</span></div></p>',
    );
    await assertSelection(page, {
      anchorPath: [0, 0, 0],
      anchorOffset: 1,
      focusPath: [0, 0, 0],
      focusOffset: 1,
    });
  });

  it.skipIf(e2e.isCollab, 'displays overflow on immutable nodes', async () => {
    // The smile emoji (S) is length 2, so for 1234S56:
    // - 1234 is non-overflow text
    // - S takes characters 5 and 6, since it's immutable and can't be split we count the whole
    //   node as overflowed
    // - 56 is overflowed
    const {page} = e2e;
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('1234:)56');
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">1234</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true">56</span></div></p>',
    );

    await repeat(3, async () => await page.keyboard.press('Backspace'));
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">1234</span></p>',
    );
  });

  it.skipIf(e2e.isCollab, 'can type new lines inside overflow', async () => {
    const {page, isRichText} = e2e;
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('123456');
    await page.keyboard.press('Enter');
    await page.keyboard.type('7');
    if (isRichText) {
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span></div></p><p class="PlaygroundEditorTheme__paragraph"><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></div></p>',
      );
    } else {
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span><br><span data-lexical-text="true">7</span></div></p>',
      );
    }

    await repeat(3, async () => await page.keyboard.press('Backspace'));
    await assertHTML(
      page,
      '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span></p>',
    );
  });

  it.skipIf(
    e2e.isCollab,
    'can delete text in front and overflow is recomputed',
    async () => {
      const {page, isRichText} = e2e;
      await page.focus('div[contenteditable="true"]');

      await page.keyboard.type('123456');
      await page.keyboard.press('Enter');
      await page.keyboard.press('7');
      await moveToEditorBeginning(page);

      await page.keyboard.press('Delete');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">23456</span></p><p class="PlaygroundEditorTheme__paragraph"><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></div></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">23456</span><div class="PlaygroundEditorTheme__characterLimit"><br><span data-lexical-text="true">7</span></div></p>',
        );
      }

      await page.keyboard.press('Delete');
      if (isRichText) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">3456</span></p><p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">7</span></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">3456</span><br><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></div></p>',
        );
      }
    },
  );

  it.skipIf(
    e2e.isCollab,
    'can delete text in front and overflow is recomputed (immutable nodes)',
    async () => {
      // See 'displays overflow on immutable nodes'
      const {page} = e2e;
      await page.focus('div[contenteditable="true"]');

      await page.keyboard.type('1234:)56');
      await moveToLineBeginning(page);

      await page.keyboard.press('Delete');
      if (charset === 'UTF-16') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">234</span><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">56</span></div></p>',
        );
      } else if (charset === 'UTF-8') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">234</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span class="emoji happysmile" data-lexical-text="true"><span class="emoji-inner">🙂</span></span><span data-lexical-text="true">56</span></div></p>',
        );
      }
    },
  );

  it.skipIf(
    e2e.isCollab || e2e.isPlainText,
    'can overflow in lists',
    async () => {
      const {page} = e2e;
      await page.focus('div[contenteditable="true"]');

      await page.keyboard.type('- 1234');
      await page.keyboard.press('Enter');
      await page.keyboard.type('56');
      await page.keyboard.press('Enter');
      await page.keyboard.type('7');
      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">5</span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span></div></li><li value="3" class="PlaygroundEditorTheme__listItem"><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></div></li></ul>',
      );

      await repeat(3, async () => await page.keyboard.press('Backspace'));
      await assertHTML(
        page,
        '<ul class="PlaygroundEditorTheme__ul"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">5</span></li></ul',
      );
    },
  );

  it.skipIf(
    e2e.isCollab || e2e.isPlainText,
    'can delete an overflowed paragraph',
    async () => {
      const {page} = e2e;
      await page.focus('div[contenteditable="true"]');

      await page.keyboard.type('12345');
      await page.keyboard.press('Enter');
      await page.keyboard.type('6');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span></p><p class="PlaygroundEditorTheme__paragraph"><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span></div></p>',
      );

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Backspace');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><span data-lexical-text="true">12345</span><div class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">6</span></div></p>',
      );
    },
  );

  it.skipIf(e2e.isCollab, 'handles accented characters', async () => {
    const {page} = e2e;
    await page.focus('div[contenteditable="true"]');

    // Worth 1 byte in UTF-16, 2 bytes in UTF-8
    await repeat(6, async () => await page.keyboard.type('à'));
    if (charset === 'UTF-16') {
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">ààààà</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">à</span></div></p>',
      );
    } else {
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">àà</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">àààà</span></div></p>',
      );
    }
  });

  it.skipIf(e2e.isCollab, 'handles graphemes', async () => {
    const {page} = e2e;
    await page.focus('div[contenteditable="true"]');

    await page.keyboard.type('👨‍👩‍👦‍👦');
    if (['chromium', 'webkit'].includes(E2E_BROWSER)) {
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">👨‍👩‍👦‍👦</span></div></p>',
      );
    } else {
      if (charset === 'UTF-16') {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">👨‍👩</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">‍👦‍👦</span></div></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">👨</span><div class="PlaygroundEditorTheme__characterLimit PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">‍👩‍👦‍👦</span></div></p>',
        );
      }
    }
  });
}

describe('CharacterLimit', () => {
  describe('UTF-16', () => {
    initializeE2E(
      (e2e) => {
        testSuite(e2e, 'UTF-16');
      },
      {appSettings: {isCharLimit: true}},
    );
  });

  describe('UTF-8', () => {
    initializeE2E(
      (e2e) => {
        testSuite(e2e, 'UTF-8');
      },
      {appSettings: {isCharLimitUtf8: true}},
    );
  });
});
