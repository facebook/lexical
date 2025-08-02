/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  sleepInsertImage,
  test,
} from '../../../utils/index.mjs';

test.describe('HTML Image srcset CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Copy + paste image with srcset (width descriptors)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img 
          src="https://picsum.photos/300/200" 
          srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" 
          alt="Responsive image with width descriptors"
          width="300"
          height="200"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Responsive image with width descriptors"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste image with srcset (density descriptors)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img 
          src="https://picsum.photos/300/200" 
          srcset="https://picsum.photos/300/200 1x, https://picsum.photos/600/400 2x" 
          alt="Responsive image with density descriptors"
          width="300"
          height="200"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Responsive image with density descriptors"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste image with srcset (no descriptors)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img 
          src="https://picsum.photos/300/200" 
          srcset="https://picsum.photos/300/200, https://picsum.photos/600/400" 
          alt="Responsive image without descriptors"
          width="300"
          height="200"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Responsive image without descriptors"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste image with malformed srcset (falls back to src)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img 
          src="https://picsum.photos/300/200" 
          srcset="invalid, srcset, format" 
          alt="Image with malformed srcset"
          width="300"
          height="200"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Image with malformed srcset"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste image with only srcset (no src fallback)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img 
          srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" 
          alt="Image with only srcset"
          width="300"
          height="200"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Image with only srcset"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste image with data URL in srcset', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const clipboard = {
      'text/html': `
        <img 
          src="${dataUrl}" 
          srcset="${dataUrl} 1x, ${dataUrl} 2x" 
          alt="Image with data URL in srcset"
          width="1"
          height="1"
        />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Image with data URL in srcset"
                draggable="false"
                src="${dataUrl}"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });

  test('Copy + paste multiple images with different srcset formats', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    const clipboard = {
      'text/html': `
        <img src="https://picsum.photos/300/200" srcset="https://picsum.photos/300/200 300w, https://picsum.photos/600/400 600w" alt="Width descriptors" />
        <img src="https://picsum.photos/400/300" srcset="https://picsum.photos/400/300 1x, https://picsum.photos/800/600 2x" alt="Density descriptors" />
        <img src="https://picsum.photos/500/400" srcset="https://picsum.photos/500/400, https://picsum.photos/1000/800" alt="No descriptors" />
      `,
    };

    await pasteFromClipboard(page, clipboard);
    await sleepInsertImage(3);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Width descriptors"
                draggable="false"
                src="https://picsum.photos/300/200"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="Density descriptors"
                draggable="false"
                src="https://picsum.photos/400/300"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <span
            class="editor-image"
            contenteditable="false"
            data-lexical-decorator="true">
            <div draggable="false">
              <img
                alt="No descriptors"
                draggable="false"
                src="https://picsum.photos/500/400"
                style="height: inherit; max-width: 500px; width: inherit" />
            </div>
          </span>
          <br />
        </p>
      `,
    );
  });
}); 