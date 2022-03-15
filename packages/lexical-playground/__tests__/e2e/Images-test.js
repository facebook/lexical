/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  assertSelection,
  click,
  E2E_PORT,
  focusEditor,
  initializeE2E,
  waitForSelector,
} from '../utils';

const IMAGE_URL = E2E_PORT === 3000 ? '/src/images/yellow-flower.jpg' : '/assets/yellow-flower.bf6d0400.jpg';

describe('Images', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText,
      `Can create a decorator and move selection around it`,
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await waitForSelector(page, 'button .image');

        await click(page, 'button .image');

        await waitForSelector(page, '.editor-image img');

        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [0],
          focusOffset: 1,
          focusPath: [0],
        });

        await focusEditor(page);
        await page.keyboard.press('ArrowLeft');
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        await page.keyboard.press('ArrowRight');
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [0],
          focusOffset: 1,
          focusPath: [0],
        });

        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        await click(page, 'button .image');

        await waitForSelector(page, '.editor-image img');

        await click(page, '.editor-image img');

        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;" class="focused"><button class="image-caption-button">Add Caption</button><div class="image-resizer-ne"></div><div class="image-resizer-se"></div><div class="image-resizer-sw"></div><div class="image-resizer-nw"></div></span><br></p>`,
          true,
        );

        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await click(page, 'div[contenteditable="true"]');

        await click(page, 'button .image');

        await waitForSelector(page, '.editor-image img');

        await focusEditor(page);

        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 1,
          anchorPath: [0],
          focusOffset: 1,
          focusPath: [0],
        });

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Delete');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });
      },
    );

    it.skipIf(
      e2e.isPlainText,
      'Can add images and delete them correctly',
      async () => {
        const {page} = e2e;

        await focusEditor(page);

        await waitForSelector(page, 'button .image');

        await click(page, 'button .image');

        await waitForSelector(page, '.editor-image img');

        await click(page, 'button .image');

        await focusEditor(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0],
          focusOffset: 0,
          focusPath: [0],
        });

        await page.keyboard.type('Test');
        await click(page, 'button .image');
        await click(page, 'button .image');

        await focusEditor(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 0, 0],
          focusOffset: 4,
          focusPath: [0, 0, 0],
        });
        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          `<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="${IMAGE_URL}" alt="Yellow flower in tilt shift lens" style="height: inherit; max-width: 500px; width: inherit;"></span><br></p>`,
        );
        await assertSelection(page, {
          anchorOffset: 4,
          anchorPath: [0, 0, 0],
          focusOffset: 4,
          focusPath: [0, 0, 0],
        });
      },
    );
  });
});
