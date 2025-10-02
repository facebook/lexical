/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect} from '@playwright/test';
import {promises as fs} from 'fs';
import {join} from 'path';

import {
  assertHTML,
  click,
  evaluate,
  focusEditor,
  html,
  initialize,
  insertAttachment,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Attachment', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can insert attachment via toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(process.cwd(), 'test-attachment.txt');
    const testFileContent = `This is a test attachment file for the Lexical playground.
It contains some sample text to verify the attachment functionality.

Test content:
- Line 1
- Line 2
- Line 3

End of test file.`;

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Click Insert button to open dropdown
      await click(
        page,
        '.toolbar-item.spaced[aria-label="Insert specialized editor node"]',
      );

      // Wait for dropdown to appear
      await waitForSelector(page, '.dropdown');

      // Click Attachment option in dropdown
      await click(page, '.dropdown .item:has(.icon.attachment)');

      // Wait for attachment dialog to appear
      await waitForSelector(page, '[role="dialog"]');
      await expect(page.locator('[role="dialog"] h2')).toHaveText(
        'Add Attachment',
      );

      // Verify confirm button is initially disabled
      await expect(
        page.locator('[data-test-id="attachment-modal-file-upload-btn"]'),
      ).toBeDisabled();

      // Upload file
      const fileInput = page.locator(
        '[data-test-id="attachment-modal-file-upload"]',
      );
      await fileInput.setInputFiles(testFilePath);

      // Wait for file preview to appear
      await waitForSelector(page, '.FilePreview__container');

      // Verify file preview shows correct information
      await expect(page.locator('.FilePreview__container')).toContainText(
        'test-attachment.txt',
      );
      await expect(page.locator('.FilePreview__container')).toContainText(
        '188 Bytes',
      );
      await expect(page.locator('.FilePreview__container')).toContainText(
        'text/plain',
      );

      // Verify confirm button is now enabled
      await expect(
        page.locator('[data-test-id="attachment-modal-file-upload-btn"]'),
      ).toBeEnabled();

      // Click confirm to insert attachment
      await click(page, '[data-test-id="attachment-modal-file-upload-btn"]');

      // Wait for dialog to close and attachment to appear in editor
      await page.waitForSelector('[role="dialog"]', {state: 'detached'});
      await waitForSelector(page, '.AttachmentNode__container');

      // Verify attachment appears in editor
      await expect(page.locator('.AttachmentNode__container')).toBeVisible();
      await expect(page.locator('.AttachmentNode__filename')).toHaveText(
        'test-attachment.txt',
      );
      await expect(page.locator('.AttachmentNode__filesize')).toHaveText(
        '188 Bytes',
      );

      // Verify editor HTML structure
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span
              class="PlaygroundEditorTheme__attachment"
              contenteditable="false"
              data-lexical-decorator="true">
              <div
                class="AttachmentNode__container draggable"
                draggable="false">
                <div class="AttachmentNode__icon">📄</div>
                <div class="AttachmentNode__content">
                  <div
                    class="AttachmentNode__filename"
                    title="test-attachment.txt">
                    test-attachment.txt
                  </div>
                  <div class="AttachmentNode__filesize">188 Bytes</div>
                </div>
              </div>
            </span>
            <br />
          </p>
        `,
        undefined,
        {ignoreClasses: false},
      );

      // Verify editor state contains attachment node
      const editorState = await evaluate(page, () => {
        return window.lexicalEditor.getEditorState().toJSON();
      });

      expect(editorState.root.children[0].children[0].type).toBe('attachment');
      expect(editorState.root.children[0].children[0].fileName).toBe(
        'test-attachment.txt',
      );
      expect(editorState.root.children[0].children[0].fileSize).toBe(188);
      expect(editorState.root.children[0].children[0].fileType).toBe(
        'text/plain',
      );
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can show and interact with attachment floating toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(process.cwd(), 'test-attachment-toolbar.txt');
    const testFileContent = 'Test file for toolbar interaction';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Verify floating toolbar is not visible initially
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).not.toBeVisible();

      // Click on attachment to select it and show floating toolbar
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Verify toolbar buttons are present and visible
      await expect(
        page.locator(
          '.AttachmentNode__toolbarButton[title="download attachment"]',
        ),
      ).toBeVisible();
      await expect(
        page.locator(
          '.AttachmentNode__toolbarButton[title="delete attachment"]',
        ),
      ).toBeVisible();

      // Verify toolbar has correct structure
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).toContainText('');
      await expect(page.locator('.AttachmentNode__toolbarButton')).toHaveCount(
        2,
      );

      // Click elsewhere to hide toolbar
      await click(page, '.ContentEditable__root');
      await page.waitForTimeout(500); // Wait for toolbar to hide
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).not.toBeVisible();
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can download attachment using floating toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file with specific content
    const testFilePath = join(process.cwd(), 'test-download-attachment.txt');
    const testFileContent =
      'This is a test file for download functionality.\nLine 2\nLine 3';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Click on attachment to select it and show floating toolbar
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Set up download promise before clicking download button
      const downloadPromise = page.waitForEvent('download');

      // Click download button
      await click(
        page,
        '.AttachmentNode__toolbarButton[title="download attachment"]',
      );

      // Wait for download to start
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toBe('test-download-attachment.txt');

      // Verify the download was triggered (we can't easily verify the actual file content in e2e tests)
      expect(download).toBeTruthy();

      // Verify attachment is still in editor after download
      await expect(page.locator('.AttachmentNode__container')).toBeVisible();
      await expect(page.locator('.AttachmentNode__filename')).toHaveText(
        'test-download-attachment.txt',
      );
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can delete attachment using floating toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(process.cwd(), 'test-delete-attachment.txt');
    const testFileContent = 'This file will be deleted via floating toolbar';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Verify attachment is present
      await expect(page.locator('.AttachmentNode__container')).toBeVisible();
      await expect(page.locator('.AttachmentNode__filename')).toHaveText(
        'test-delete-attachment.txt',
      );

      // Click on attachment to select it and show floating toolbar
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Verify delete button is present
      await expect(
        page.locator(
          '.AttachmentNode__toolbarButton[title="delete attachment"]',
        ),
      ).toBeVisible();

      // Click delete button
      await click(
        page,
        '.AttachmentNode__toolbarButton[title="delete attachment"]',
      );

      // Verify attachment is removed from editor
      await page.waitForSelector('.AttachmentNode__container', {
        state: 'detached',
      });

      // Verify floating toolbar is also gone
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).not.toBeVisible();

      // Verify editor is empty
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
        `,
      );

      // Verify editor state is clean
      const editorState = await evaluate(page, () => {
        return window.lexicalEditor.getEditorState().toJSON();
      });

      expect(editorState.root.children).toHaveLength(1);
      expect(editorState.root.children[0].children).toHaveLength(0);
      expect(editorState.root.children[0].type).toBe('paragraph');
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can handle multiple attachments with floating toolbar', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create multiple test files
    const testFile1Path = join(process.cwd(), 'test-multi-attachment-1.txt');
    const testFile2Path = join(process.cwd(), 'test-multi-attachment-2.txt');
    const testFile1Content = 'First attachment file';
    const testFile2Content = 'Second attachment file';

    await fs.writeFile(testFile1Path, testFile1Content);
    await fs.writeFile(testFile2Path, testFile2Content);

    try {
      // Insert first attachment
      await insertAttachment(page, testFile1Path);

      // Move cursor to end and add new line
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');

      // Insert second attachment
      await insertAttachment(page, testFile2Path);

      // Verify both attachments are present
      await expect(page.locator('.AttachmentNode__container')).toHaveCount(2);

      // Click on first attachment
      await page.locator('.AttachmentNode__container').first().click();
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Delete first attachment
      await click(
        page,
        '.AttachmentNode__toolbarButton[title="delete attachment"]',
      );
      await page.waitForTimeout(500); // Wait for deletion to complete

      // Verify only one attachment remains
      await expect(page.locator('.AttachmentNode__container')).toHaveCount(1);
      await expect(page.locator('.AttachmentNode__filename')).toHaveText(
        'test-multi-attachment-2.txt',
      );

      // Click on remaining attachment
      await click(page, '.AttachmentNode__container');
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Test download on remaining attachment
      const downloadPromise = page.waitForEvent('download');
      await click(
        page,
        '.AttachmentNode__toolbarButton[title="download attachment"]',
      );
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('test-multi-attachment-2.txt');

      // Verify attachment is still there after download
      await expect(page.locator('.AttachmentNode__container')).toHaveCount(1);
    } finally {
      // Clean up test files
      try {
        await fs.unlink(testFile1Path);
        await fs.unlink(testFile2Path);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can delete attachment using keyboard shortcut', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(
      process.cwd(),
      'test-keyboard-delete-attachment.txt',
    );
    const testFileContent = 'This file will be deleted via keyboard';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Verify attachment is present
      await expect(page.locator('.AttachmentNode__container')).toBeVisible();

      // Click on attachment to select it
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear (indicates selection)
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Press Delete key to delete attachment
      await page.keyboard.press('Delete');

      // Verify attachment is removed from editor
      await page.waitForSelector('.AttachmentNode__container', {
        state: 'detached',
      });

      // Verify editor is empty
      await assertHTML(
        page,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
        `,
      );
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can download attachment using Enter key', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(
      process.cwd(),
      'test-enter-download-attachment.txt',
    );
    const testFileContent = 'This file will be downloaded via Enter key';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Click on attachment to select it
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear (indicates selection)
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Set up download promise before pressing Enter
      const downloadPromise = page.waitForEvent('download');

      // Press Enter key to download attachment
      await page.keyboard.press('Enter');

      // Wait for download to start
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toBe(
        'test-enter-download-attachment.txt',
      );

      // Verify attachment is still in editor after download
      await expect(page.locator('.AttachmentNode__container')).toBeVisible();
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Floating toolbar positioning and behavior', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a test file
    const testFilePath = join(process.cwd(), 'test-toolbar-positioning.txt');
    const testFileContent = 'Test file for toolbar positioning';

    await fs.writeFile(testFilePath, testFileContent);

    try {
      // Insert attachment using utility function
      await insertAttachment(page, testFilePath);

      // Click on attachment to select it
      await click(page, '.AttachmentNode__container');

      // Wait for floating toolbar to appear
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Get attachment and toolbar positions
      const attachmentBox = await page
        .locator('.AttachmentNode__container')
        .boundingBox();
      const toolbarBox = await page
        .locator('.AttachmentNode__floatingToolbar')
        .boundingBox();

      // Verify toolbar is positioned below the attachment
      expect(toolbarBox.y).toBeGreaterThan(
        attachmentBox.y + attachmentBox.height,
      );

      // Verify toolbar is horizontally aligned with attachment (allow more tolerance for floating UI)
      expect(Math.abs(toolbarBox.x - attachmentBox.x)).toBeLessThan(100); // Allow more tolerance

      // Test toolbar hide/show behavior
      await click(page, '.ContentEditable__root'); // Click outside
      await page.waitForTimeout(500); // Wait for toolbar to hide
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).not.toBeVisible();

      // Click attachment again
      await click(page, '.AttachmentNode__container');
      await waitForSelector(page, '.AttachmentNode__floatingToolbar');

      // Verify toolbar appears again
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).toBeVisible();

      // Test clicking elsewhere again to hide toolbar (more reliable than Escape)
      await click(page, '.ContentEditable__root');
      await page.waitForTimeout(500);
      await expect(
        page.locator('.AttachmentNode__floatingToolbar'),
      ).not.toBeVisible();
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Validates file size and type restrictions', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    // Create a large test file (over 3MB limit)
    const testFilePath = join(process.cwd(), 'large-test-file.txt');
    const largeContent = 'A'.repeat(4 * 1024 * 1024); // 4MB file

    await fs.writeFile(testFilePath, largeContent);

    try {
      // Open attachment dialog
      await click(
        page,
        '.toolbar-item.spaced[aria-label="Insert specialized editor node"]',
      );
      await waitForSelector(page, '.dropdown');
      await click(page, '.dropdown .item:has(.icon.attachment)');
      await waitForSelector(page, '[role="dialog"]');

      // Try to upload large file
      const fileInput = page.locator(
        '[data-test-id="attachment-modal-file-upload"]',
      );
      await fileInput.setInputFiles(testFilePath);

      // Verify file is rejected (no preview should appear)
      await page.waitForTimeout(1000); // Wait a bit for processing
      await expect(page.locator('.FilePreview__container')).not.toBeVisible();

      // Verify confirm button remains disabled
      await expect(
        page.locator('[data-test-id="attachment-modal-file-upload-btn"]'),
      ).toBeDisabled();
    } finally {
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test('Can handle different file types with appropriate icons', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const testCases = [
      {extension: 'pdf', icon: '📄', mimeType: 'application/pdf'},
      {extension: 'jpg', icon: '🖼️', mimeType: 'image/jpeg'},
      {extension: 'mp4', icon: '🎥', mimeType: 'video/mp4'},
      {extension: 'mp3', icon: '🎵', mimeType: 'audio/mpeg'},
    ];

    for (const testCase of testCases) {
      const testFilePath = join(
        process.cwd(),
        `test-file.${testCase.extension}`,
      );

      // Create minimal file content based on type
      let content = 'test content';
      if (testCase.extension === 'pdf') {
        content =
          '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<\n/Size 1\n/Root 1 0 R\n>>\nstartxref\n9\n%%EOF';
      }

      await fs.writeFile(testFilePath, content);

      try {
        // Insert attachment using utility function
        await insertAttachment(page, testFilePath);

        // Verify correct icon is displayed
        await expect(page.locator('.AttachmentNode__icon')).toHaveText(
          testCase.icon,
        );

        // Clean up for next iteration
        await click(page, '.AttachmentNode__container');
        await waitForSelector(page, '.AttachmentNode__floatingToolbar');
        await click(
          page,
          '.AttachmentNode__toolbarButton[title="delete attachment"]',
        );
        await page.waitForSelector('.AttachmentNode__container', {
          state: 'detached',
        });
      } finally {
        // Clean up test file
        try {
          await fs.unlink(testFilePath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });
});
