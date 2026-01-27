/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';

import {moveLeft, selectAll} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  copyToClipboard,
  focusEditor,
  getPageOrFrame,
  html,
  initialize,
  pasteFromClipboard,
  selectFromInsertDropdown,
  test,
  waitForSelector,
  withExclusiveClipboardAccess,
} from '../utils/index.mjs';

const SAMPLE_ATTACHMENT_PATH =
  'packages/lexical-playground/__tests__/e2e/fixtures/sample.txt';

async function insertAttachment(page, filePath) {
  await selectFromInsertDropdown(page, '.attachment');

  const frame = getPageOrFrame(page);
  await frame.setInputFiles(
    'input[data-test-id="attachment-modal-file-upload"]',
    filePath,
  );

  await click(page, 'button[data-test-id="attachment-modal-file-upload-btn"]');
}

test.describe('Attachments', () => {
  test.use({acceptDownloads: true});
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can insert attachment via toolbar and see it rendered', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span contenteditable="false" data-lexical-decorator="true">
            <div class="AttachmentNode__container draggable" draggable="false">
              <div class="AttachmentNode__icon">📄</div>
              <div class="AttachmentNode__content">
                <div class="AttachmentNode__filename" title="sample.txt">
                  sample.txt
                </div>
                <div class="AttachmentNode__filesize">40 Bytes</div>
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });
  });

  test('Can select attachment by clicking and shows selected class', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    // Skip collab for selection/focus tests due to frame issues
    test.skip(isCollab);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Click on the attachment to select it
    await click(page, '.AttachmentNode__container');

    // Verify the selected class is applied
    await waitForSelector(page, '.AttachmentNode__container.selected');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span contenteditable="false" data-lexical-decorator="true">
            <div
              class="AttachmentNode__container draggable hovered selected"
              draggable="true">
              <div class="AttachmentNode__icon">📄</div>
              <div class="AttachmentNode__content">
                <div class="AttachmentNode__filename" title="sample.txt">
                  sample.txt
                </div>
                <div class="AttachmentNode__filesize">40 Bytes</div>
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Floating toolbar appears when attachment is selected', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    // Skip collab for selection/focus tests due to frame issues
    test.skip(isCollab);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Click on the attachment to select it
    await click(page, '.AttachmentNode__container');

    // Wait for the floating toolbar to appear
    await waitForSelector(page, '.AttachmentNode__floatingToolbar');

    // Verify toolbar buttons are present
    const frame = getPageOrFrame(page);
    const downloadButton = frame.locator(
      '.AttachmentNode__toolbarButton[aria-label="download attachment"]',
    );
    const deleteButton = frame.locator(
      '.AttachmentNode__toolbarButton--delete[aria-label="delete attachment"]',
    );

    await expect(downloadButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
  });

  test('Can download attachment via floating toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    // Skip collab for selection/focus tests due to frame issues
    test.skip(isCollab);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Click on the attachment to select it
    await click(page, '.AttachmentNode__container');

    // Wait for the floating toolbar to appear
    await waitForSelector(page, '.AttachmentNode__floatingToolbar');

    // Set up download listener before clicking download button
    const downloadPromise = page.waitForEvent('download');

    // Click the download button
    await click(
      page,
      '.AttachmentNode__toolbarButton[aria-label="download attachment"]',
    );

    // Wait for the download to trigger
    const download = await downloadPromise;

    // Verify the download has the correct filename
    expect(download.suggestedFilename()).toBe('sample.txt');
  });

  test('Can navigate around attachment with arrow keys', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('Before');
    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);
    await waitForSelector(page, '.AttachmentNode__container');
    await page.keyboard.type('After');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Before</span>
          <span contenteditable="false" data-lexical-decorator="true">
            <div class="AttachmentNode__container draggable" draggable="false">
              <div class="AttachmentNode__icon">📄</div>
              <div class="AttachmentNode__content">
                <div class="AttachmentNode__filename" title="sample.txt">
                  sample.txt
                </div>
                <div class="AttachmentNode__filesize">40 Bytes</div>
              </div>
            </div>
          </span>
          <span data-lexical-text="true">After</span>
        </p>
      `,
    );

    // Navigate backwards with ArrowLeft
    await moveLeft(page, 7); // 5 for "After" + 2 (to cross attachment)

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });

    // Navigate forward again
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    // Should be at the beginning of "After"
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 2, 0],
      focusOffset: 0,
      focusPath: [0, 2, 0],
    });
  });

  test('Can delete attachment with Delete key when cursor is before it', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Move cursor to before the attachment
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });

    // Delete the attachment
    await page.keyboard.press('Delete');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });

  test('Can delete attachment with Backspace when cursor is after it', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Cursor should be after the attachment
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0],
      focusOffset: 1,
      focusPath: [0],
    });

    // Delete the attachment with Backspace
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });

  test('Can delete attachment via floating toolbar delete button', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    // Skip collab for selection/focus tests due to frame issues
    test.skip(isCollab);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Click on the attachment to select it and show toolbar
    await click(page, '.AttachmentNode__container');

    // Wait for the floating toolbar to appear
    await waitForSelector(page, '.AttachmentNode__floatingToolbar');

    // Click the delete button
    await click(
      page,
      '.AttachmentNode__toolbarButton--delete[aria-label="delete attachment"]',
    );

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });

  test('Can add multiple attachments and delete them individually', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Insert first attachment
    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);
    await waitForSelector(page, '.AttachmentNode__container');

    // Insert second attachment
    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    // Verify we have two attachments
    const frame = getPageOrFrame(page);
    const attachments = frame.locator('.AttachmentNode__container');
    await expect(attachments).toHaveCount(2);

    // Delete the second attachment using backspace (cursor is after it)
    await page.keyboard.press('Backspace');

    // Should have one attachment remaining
    await expect(attachments).toHaveCount(1);

    // Delete the remaining attachment
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });

  test('Can copy and paste attachment', async ({page, isPlainText}) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Select all content
    await selectAll(page);

    await withExclusiveClipboardAccess(async () => {
      // Copy
      const clipboard = await copyToClipboard(page);

      // Clear editor
      await page.keyboard.press('Backspace');

      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
        `,
      );

      // Paste
      await pasteFromClipboard(page, clipboard);
    });

    // Verify attachment is restored
    await waitForSelector(page, '.AttachmentNode__container');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span contenteditable="false" data-lexical-decorator="true">
            <div class="AttachmentNode__container draggable" draggable="false">
              <div class="AttachmentNode__icon">📄</div>
              <div class="AttachmentNode__content">
                <div class="AttachmentNode__filename" title="sample.txt">
                  sample.txt
                </div>
                <div class="AttachmentNode__filesize">40 Bytes</div>
              </div>
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Can insert attachment after text and before text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await page.keyboard.type('Hello');

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    await page.keyboard.type('World');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">Hello</span>
          <span contenteditable="false" data-lexical-decorator="true">
            <div class="AttachmentNode__container draggable" draggable="false">
              <div class="AttachmentNode__icon">📄</div>
              <div class="AttachmentNode__content">
                <div class="AttachmentNode__filename" title="sample.txt">
                  sample.txt
                </div>
                <div class="AttachmentNode__filesize">40 Bytes</div>
              </div>
            </div>
          </span>
          <span data-lexical-text="true">World</span>
        </p>
      `,
    );
  });

  test('Attachment has correct data-lexical-decorator attribute', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container');

    // Check the decorator attribute exists
    const frame = getPageOrFrame(page);
    const decorator = frame.locator('[data-lexical-decorator="true"]');
    await expect(decorator).toHaveCount(1);

    // Verify the attachment container is inside the decorator span
    const attachmentInDecorator = frame.locator(
      '[data-lexical-decorator="true"] .AttachmentNode__container',
    );
    await expect(attachmentInDecorator).toHaveCount(1);
  });

  test('Attachment shows draggable class when editable', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertAttachment(page, SAMPLE_ATTACHMENT_PATH);

    await waitForSelector(page, '.AttachmentNode__container.draggable');

    const frame = getPageOrFrame(page);
    const draggableAttachment = frame.locator(
      '.AttachmentNode__container.draggable',
    );
    await expect(draggableAttachment).toHaveCount(1);
  });
});
