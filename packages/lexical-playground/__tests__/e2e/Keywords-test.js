/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  repeat,
  E2E_BROWSER,
  focusEditor,
  keyDownCtrlOrAlt,
  keyUpCtrlOrAlt,
  waitForSelector,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  IS_COLLAB,
} from '../utils';

const config = {appSettings: {isRichText: true}};

describe('Keywords', () => {
  initializeE2E((e2e, config) => {
    it(`Can create a decorator and move selection around it`, async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('congrats');

      await waitForSelector(page, '.keyword');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await page.keyboard.type('c');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">congratsc</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });

      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Space');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span><span data-lexical-text="true"> c</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('ongrats');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span><span data-lexical-text="true"> </span><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 8,
        focusPath: [0, 2, 0],
        focusOffset: 8,
      });

      await repeat(8, async () => {
        await page.keyboard.press('ArrowLeft');
      });
      if (E2E_BROWSER === 'firefox') {
        await assertSelection(page, {
          anchorPath: [0, 2, 0],
          anchorOffset: 0,
          focusPath: [0, 2, 0],
          focusOffset: 0,
        });
      } else {
        await assertSelection(page, {
          anchorPath: [0, 1, 0],
          anchorOffset: 1,
          focusPath: [0, 1, 0],
          focusOffset: 1,
        });
      }

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">congratscongrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await page.keyboard.press('Space');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span><span data-lexical-text="true"> </span><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });
    });

    it('Can type congrats[Team]!', async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('congrats[Team]!');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">congrats[Team]!</span></p>',
      );

      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 15,
        focusPath: [0, 0, 0],
        focusOffset: 15,
      });
    });

    it('Can type "congrats Bob!" where " Bob!" is bold', async () => {
      const {page} = e2e;

      await focusEditor(page);
      await page.keyboard.type('congrats');

      await waitForSelector(page, '.keyword');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type(' Bob!');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true"> Bob!</strong></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 5,
        focusPath: [0, 1, 0],
        focusOffset: 5,
      });

      await repeat(4, async () => {
        await page.keyboard.press('ArrowLeft');
      });

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">congrats</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Bob!</strong></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 0,
        focusPath: [0, 1, 0],
        focusOffset: 0,
      });

      await page.keyboard.press('Space');

      if (E2E_BROWSER === 'firefox' && !IS_COLLAB) {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span style="cursor: default;" class="keyword" data-lexical-text="true">congrats</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true"> Bob!</strong></p>',
        );
      } else {
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span><span data-lexical-text="true"> </span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Bob!</strong></p>',
        );
      }

      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 1,
        focusPath: [0, 1, 0],
        focusOffset: 1,
      });
    });

    it('Can type "Everyone congrats!" where "Everyone " and "!" are bold', async () => {
      const {page} = e2e;

      await focusEditor(page);

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type('Everyone ');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type('congrats');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 8,
        focusPath: [0, 1, 0],
        focusOffset: 8,
      });

      await page.keyboard.type('!');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span data-lexical-text="true">congrats!</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 9,
        focusPath: [0, 1, 0],
        focusOffset: 9,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 8,
        focusPath: [0, 1, 0],
        focusOffset: 8,
      });

      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);

      await page.keyboard.type('!');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span data-lexical-text="true">congrats</span><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">!</strong></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 1, 0],
        anchorOffset: 8,
        focusPath: [0, 1, 0],
        focusOffset: 8,
      });

      await keyDownCtrlOrAlt(page);
      await page.keyboard.press('ArrowLeft');
      await keyUpCtrlOrAlt(page);

      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone</strong><span data-lexical-text="true">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 8,
        focusPath: [0, 0, 0],
        focusOffset: 8,
      });

      await page.keyboard.press('Space');

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><strong class="PlaygroundEditorTheme__textBold" data-lexical-text="true">Everyone </strong><span class="keyword" data-lexical-text="true" style="cursor: default;">congrats</span></p>',
      );
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });
    });
  }, config);
});
