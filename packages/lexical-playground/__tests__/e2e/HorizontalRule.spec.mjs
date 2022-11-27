/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveToLineBeginning,
  pressBackspace,
  selectAll,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  copyToClipboard,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  selectFromInsertDropdown,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('HorizontalRule', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('Can create a horizontal rule and move selection around it', async ({
    page,
    isCollab,
    isPlainText,
    browserName,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await selectFromInsertDropdown(page, '.horizontal-rule');

    await waitForSelector(page, 'hr');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    await page.keyboard.press('ArrowUp');

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    await page.keyboard.type('Some text');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    await page.keyboard.type('Some more text');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some text</span>
        </p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some more text</span>
        </p>
      `,
    );

    await moveToLineBeginning(page);

    await page.keyboard.press('ArrowLeft');

    await page.keyboard.press('ArrowLeft');

    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 9,
        anchorPath: [0, 0, 0],
        focusOffset: 9,
        focusPath: [0, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [0],
        focusOffset: 1,
        focusPath: [0],
      });
    }

    await pressBackspace(page, 10);

    // Collab doesn't process the cursor correctly
    if (!isCollab) {
      await assertHTML(
        page,
        '<div class="PlaygroundEditorTheme__blockCursor" contenteditable="false" data-lexical-cursor="true"></div><hr class="" data-lexical-decorator="true" contenteditable="false"><p class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr" dir="ltr"><span data-lexical-text="true">Some more text</span></p>',
      );
    }

    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [],
        focusOffset: 1,
        focusPath: [],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [],
        focusOffset: 0,
        focusPath: [],
      });
    }
  });

  test('Will add a horizontal rule at the end of a current TextNode and move selection to the new ParagraphNode.', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('Test');

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Test</span>
        </p>
      `,
    );

    await selectFromInsertDropdown(page, '.horizontal-rule');

    await waitForSelector(page, 'hr');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Test</span>
        </p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });
  });

  test('Will add a horizontal rule and split a TextNode across 2 paragraphs if the carat is in the middle of the TextNode, moving selection to the start of the new ParagraphNode.', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Test');

    await assertSelection(page, {
      anchorOffset: 4,
      anchorPath: [0, 0, 0],
      focusOffset: 4,
      focusPath: [0, 0, 0],
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Test</span>
        </p>
      `,
    );

    await moveLeft(page, 2);

    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 0, 0],
      focusOffset: 2,
      focusPath: [0, 0, 0],
    });

    await selectFromInsertDropdown(page, '.horizontal-rule');

    await waitForSelector(page, 'hr');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Te</span>
        </p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">st</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2, 0, 0],
      focusOffset: 0,
      focusPath: [2, 0, 0],
    });
  });

  test('Can copy and paste a horizontal rule', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await selectFromInsertDropdown(page, '.horizontal-rule');

    await waitForSelector(page, 'hr');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    // Select all the text
    await selectAll(page);

    // Copy all the text
    const clipboard = await copyToClipboard(page);

    // Delete content
    await page.keyboard.press('Backspace');

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Backspace');

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });
  });

  test('Can delete remove paragraph after a horizontal rule without deleting a horizontal rule', async ({
    page,
    browserName,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);

    await focusEditor(page);

    await selectFromInsertDropdown(page, '.horizontal-rule');

    await waitForSelector(page, 'hr');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr class="" contenteditable="false" data-lexical-decorator="true" />
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [2],
      focusOffset: 0,
      focusPath: [2],
    });

    // Delete content
    await page.keyboard.press('Backspace');

    await focusEditor(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <hr
          class="selected"
          contenteditable="false"
          data-lexical-decorator="true" />
      `,
    );

    if (browserName === 'webkit' || browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [],
        focusOffset: 0,
        focusPath: [],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0],
        focusOffset: 0,
        focusPath: [0],
      });
    }

    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Delete');

    await assertHTML(
      page,
      html`
        <hr
          class="selected"
          contenteditable="false"
          data-lexical-decorator="true" />
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [],
      focusOffset: 0,
      focusPath: [],
    });
  });
});
