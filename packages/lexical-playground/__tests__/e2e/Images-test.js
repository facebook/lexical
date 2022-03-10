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
  focusEditor,
  waitForSelector,
  click,
} from '../utils';

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
          '<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });

        await focusEditor(page);
        await page.keyboard.press('ArrowLeft');
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.press('ArrowRight');
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });

        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Backspace');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await click(page, 'button .image');

        await waitForSelector(page, '.editor-image img');

        await click(page, '.editor-image img');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;" class="focused"><button class="image-caption-button">Add Caption</button><div class="image-resizer-ne"></div><div class="image-resizer-se"></div><div class="image-resizer-sw"></div><div class="image-resizer-nw"></div></span><br></p>',
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
          '<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 1,
          focusPath: [0],
          focusOffset: 1,
        });

        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Delete');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );

        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
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
          '<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0],
          anchorOffset: 0,
          focusPath: [0],
          focusOffset: 0,
        });

        await page.keyboard.type('Test');
        await click(page, 'button .image');
        await click(page, 'button .image');

        await focusEditor(page);
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');

        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 4,
          focusPath: [0, 0, 0],
          focusOffset: 4,
        });
        await page.keyboard.press('Delete');
        await assertHTML(
          page,
          '<p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Test</span><span class="editor-image" data-lexical-decorator="true" contenteditable="false"><img src="/static/media/yellow-flower.95d22651.jpg" alt="Yellow flower in tilt shift lens" style="width: inherit; height: inherit; max-width: 500px;"></span><br></p>',
        );
        await assertSelection(page, {
          anchorPath: [0, 0, 0],
          anchorOffset: 4,
          focusPath: [0, 0, 0],
          focusOffset: 4,
        });
      },
    );
  });
});
