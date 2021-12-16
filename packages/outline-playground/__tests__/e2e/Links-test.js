/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  selectAll,
  selectCharacters,
  moveLeft,
  moveToLineEnd,
} from '../keyboardShortcuts';
import {
  initializeE2E,
  assertHTML,
  assertSelection,
  E2E_BROWSER,
  focusEditor,
  waitForSelector,
  click,
  focus,
} from '../utils';

describe('Links', () => {
  initializeE2E((e2e) => {
    it(`Can convert a text node into a link`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('Hello');
      await selectAll(page);

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      // link
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></a></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 5,
      });

      // This is needed for FF
      await focusEditor(page);
      await selectAll(page);

      // set url
      await waitForSelector(page, '.link-input');
      await waitForSelector(page, '.link-edit');
      await click(page, '.link-edit');
      await focus(page, '.link-input');
      await page.keyboard.type('facebook.com');
      await page.keyboard.press('Enter');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><a href="http://facebook.com" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></a></p',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0, 0],
        focusOffset: 5,
      });

      // unlink
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });

    it(`Does nothing if the selection is collapsed at the end of a text node.`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('Hello');

      await assertHTML(
        page,
        '<p class="editor-paragraph PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      // link
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="editor-paragraph PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });

    it(`Can type text before and after`, async () => {
      const {isRichText, page} = e2e;
      if (!isRichText) {
        return;
      }
      // TODO Needs fixing #893
      if (
        process.env.E2E_EVENTS_MODE === 'legacy-events' &&
        ['webkit', 'firefox'].includes(E2E_BROWSER)
      ) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('An Awesome Website');
      await selectAll(page);
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">An Awesome Website</span></p>',
      );

      await waitForSelector(page, '.link');
      await click(page, '.link');
      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">An Awesome Website</span></a></p>',
      );

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.type('Hey, check this out: ');
      await moveToLineEnd(page);
      await page.keyboard.type('!');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hey, check this out: </span><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">An Awesome Website</span></a><span data-outline-text="true">!</span></p>',
      );
    });

    it(`Can convert part of a text node into a link with forwards selection`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('Hello world');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello world</span></p>',
      );

      await moveLeft(page, 5);
      await selectCharacters(page, 'right', 5);

      // link
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello </span><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">world</span></a></p>',
      );
      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      }

      // set url
      await waitForSelector(page, '.link-input');
      await click(page, '.link-edit');
      await focus(page, '.link-input');
      await page.keyboard.type('facebook.com');
      await page.keyboard.press('Enter');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello </span><a href="http://facebook.com" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">world</span></a></p>',
      );

      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 0,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 6,
          focusPath: [0, 1, 0, 0],
          focusOffset: 5,
        });
      }

      // unlink
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello world</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 11,
      });
    });

    it(`Can convert part of a text node into a link with backwards selection`, async () => {
      const {isRichText, page} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await page.keyboard.type('Hello world');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello world</span></p>',
      );

      await selectCharacters(page, 'left', 5);

      // link
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello </span><a href="http://" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">world</span></a></p>',
      );

      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 1, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });
      }

      // set url
      await waitForSelector(page, '.link-input');
      await click(page, '.link-edit');
      await focus(page, '.link-input');
      await page.keyboard.type('facebook.com');
      await page.keyboard.press('Enter');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello </span><a href="http://facebook.com" class="PlaygroundEditorTheme__link ec0vvsmr rn8ck1ys PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">world</span></a></p>',
      );

      if (E2E_BROWSER === 'webkit') {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 1, 0, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0, 0],
          anchorOffset: 5,
          focusPath: [0, 0, 0],
          focusOffset: 6,
        });
      }

      // unlink
      await waitForSelector(page, '.link');
      await click(page, '.link');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph m8h3af8h l7ghb35v kmwttqpk mfn553m3 om3e55n1 PlaygroundEditorTheme__ltr gkum2dnh" dir="ltr"><span data-outline-text="true">Hello world</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 11,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
    });
  });
});
