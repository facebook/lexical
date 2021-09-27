/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import {initializeE2E, assertHTML, assertSelection, repeat} from '../utils';
import {moveToEditorBeginning, moveToLineBeginning} from '../keyboardShortcuts';

describe('CharacterLimit', () => {
  initializeE2E(
    (e2e) => {
      it('displays overflow on text', async () => {
        const {page} = e2e;
        await page.focus('div.editor');

        await page.keyboard.type('12345');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">12345</span></p>',
        );

        await page.keyboard.type('6789');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">12345</span></p><div class="editor-character-limit"><span data-outline-text="true">6789</span></div><p></p>',
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
          '<p class="editor-paragraph"><span data-outline-text="true">01234</span><div class="editor-character-limit"><span data-outline-text="true">5</span></div><div class="editor-character-limit"><span data-outline-text="true">6789</span></div></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 1,
          focusPath: [0, 0, 0],
          focusOffset: 1,
        });
      });

      it('displays overflow on immutable nodes', async () => {
        // The smile emoji (S) is length 2, so for 1234S56:
        // - 1234 is non-overflow text
        // - S takes characters 5 and 6, since it's immutable and can't be split we count the whole
        //   node as overflowed
        // - 56 is overflowed
        const {page} = e2e;
        await page.focus('div.editor');

        await page.keyboard.type('1234:)56');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">1234</span><div class="editor-character-limit"><span class="emoji happysmile" data-outline-text="true">🙂</span><span data-outline-text="true">56</span></div></p>',
        );

        await repeat(3, async () => await page.keyboard.press('Backspace'));
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">1234</span></p>',
        );
      });

      it('can type new lines inside overflow', async () => {
        const {page, isRichText} = e2e;
        await page.focus('div.editor');

        await page.keyboard.type('123456');
        await page.keyboard.press('Enter');
        await page.keyboard.type('7');
        if (isRichText) {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">12345</span><div class="editor-character-limit"><span data-outline-text="true">6</span></div></p><p class="editor-paragraph"><div class="editor-character-limit"><span data-outline-text="true">7</span></div></p>',
          );
        } else {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">12345</span><div class="editor-character-limit"><span data-outline-text="true">6</span><br><span data-outline-text="true">7</span></div></p>',
          );
        }

        await repeat(3, async () => await page.keyboard.press('Backspace'));
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">12345</span></p>',
        );
      });

      it('can delete text in front and overflow is recomputed', async () => {
        const {page, isRichText} = e2e;
        await page.focus('div.editor');

        await page.keyboard.type('123456');
        await page.keyboard.press('Enter');
        await page.keyboard.press('7');
        await moveToEditorBeginning(page);

        await page.keyboard.press('Delete');
        if (isRichText) {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">23456</span></p><p class="editor-paragraph"><div class="editor-character-limit"><span data-outline-text="true">7</span></div></p>',
          );
        } else {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">23456</span><div class="editor-character-limit"><br><span data-outline-text="true">7</span></div></p>',
          );
        }

        await page.keyboard.press('Delete');
        if (isRichText) {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">3456</span></p><p class="editor-paragraph"><span data-outline-text="true">7</span></p>',
          );
        } else {
          await assertHTML(
            page,
            '<p class="editor-paragraph"><span data-outline-text="true">3456</span><br><div class="editor-character-limit"><span data-outline-text="true">7</span></div></p>',
          );
        }
      });

      it('can delete text in front and overflow is recomputed (immutable nodes)', async () => {
        // See 'displays overflow on immutable nodes'
        const {page} = e2e;
        await page.focus('div.editor');

        await page.keyboard.type('1234:)56');
        await moveToLineBeginning(page);

        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">234</span><span class="emoji happysmile" data-outline-text="true">🙂</span><div class="editor-character-limit"><span data-outline-text="true">56</span></div></p>',
        );
      });

      it('can overflow in lists', async () => {
        const {page, isRichText} = e2e;
        if (!isRichText) {
          return;
        }
        await page.focus('div.editor');

        await page.keyboard.type('- 1234');
        await page.keyboard.press('Enter');
        await page.keyboard.type('56');
        await page.keyboard.press('Enter');
        await page.keyboard.type('7');
        await assertHTML(
          page,
          '<ul class="editor-list-ul"><li class="editor-listitem"><span data-outline-text="true">1234</span></li><li class="editor-listitem"><span data-outline-text="true">5</span><div class="editor-character-limit"><span data-outline-text="true">6</span></div></li><li class="editor-listitem"><div class="editor-character-limit"><span data-outline-text="true">7</span></div></li></ul>',
        );

        await repeat(3, async () => await page.keyboard.press('Backspace'));
        await assertHTML(
          page,
          '<ul class="editor-list-ul"><li class="editor-listitem"><span data-outline-text="true">1234</span></li><li class="editor-listitem"><span data-outline-text="true">5</span></li></ul>',
        );
      });

      it('can delete an overflowed paragraph', async () => {
        const {page, isRichText} = e2e;
        if (!isRichText) {
          return;
        }
        await page.focus('div.editor');

        await page.keyboard.type('12345');
        await page.keyboard.press('Enter');
        await page.keyboard.type('6');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">12345</span></p><p class="editor-paragraph"><div class="editor-character-limit"><span data-outline-text="true">6</span></div></p>',
        );

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Backspace');
        await assertHTML(
          page,
          '<p class="editor-paragraph"><span data-outline-text="true">12345</span><div class="editor-character-limit"><span data-outline-text="true">6</span></div></p>',
        );
      });
    },
    {appSettings: {isCharLimit: true}},
  );
});
