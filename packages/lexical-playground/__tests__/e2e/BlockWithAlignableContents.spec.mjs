/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectAll} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  insertYouTubeEmbed,
  selectFromAlignDropdown,
  test,
  YOUTUBE_SAMPLE_URL,
} from '../utils/index.mjs';

test.describe('BlockWithAlignableContents', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('Can create full width blocks for YouTube videos', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </p>
      `,
    );
    await insertYouTubeEmbed(page, YOUTUBE_SAMPLE_URL);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </p>
        <div contenteditable="false" data-lexical-decorator="true">
          <div class="PlaygroundEditorTheme__embedBlock">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen=""
              frameborder="0"
              height="315"
              src="${YOUTUBE_SAMPLE_URL}"
              title="YouTube video"
              width="560"></iframe>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });

  test('Can align contents within full width blocks', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await insertYouTubeEmbed(page, YOUTUBE_SAMPLE_URL);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </p>
        <div contenteditable="false" data-lexical-decorator="true">
          <div class="PlaygroundEditorTheme__embedBlock">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen=""
              frameborder="0"
              height="315"
              src="${YOUTUBE_SAMPLE_URL}"
              title="YouTube video"
              width="560"></iframe>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await selectAll(page);
    await selectFromAlignDropdown(page, '.center-align');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="text-align: center">
          <span data-lexical-text="true">Hello world</span>
        </p>
        <div contenteditable="false" data-lexical-decorator="true">
          <div
            class="PlaygroundEditorTheme__embedBlock PlaygroundEditorTheme__embedBlockFocus"
            style="text-align: center">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen=""
              frameborder="0"
              height="315"
              src="${YOUTUBE_SAMPLE_URL}"
              title="YouTube video"
              width="560"></iframe>
          </div>
        </div>
        <p class="PlaygroundEditorTheme__paragraph" style="text-align: center">
          <br />
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
