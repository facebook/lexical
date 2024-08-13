/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineEnd,
  moveToPrevWord,
  selectAll,
} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  copyToClipboard,
  focusEditor,
  html,
  initialize,
  insertYouTubeEmbed,
  IS_LINUX,
  pasteFromClipboard,
  test,
  YOUTUBE_SAMPLE_URL,
} from '../../../utils/index.mjs';

test.describe('CopyAndPaste', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('Basic copy + paste', async ({isRichText, page, browserName}) => {
    await focusEditor(page);

    // Add paragraph
    await page.keyboard.type('Copy + pasting?');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Sounds good!');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 12,
        anchorPath: [2, 0, 0],
        focusOffset: 12,
        focusPath: [2, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 12,
        anchorPath: [0, 3, 0],
        focusOffset: 12,
        focusPath: [0, 3, 0],
      });
    }

    // Select all the text
    await selectAll(page);
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 3,
          focusPath: [],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 12,
          focusPath: [2, 0, 0],
        });
      }
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 1,
          focusPath: [],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 12,
          focusPath: [0, 3, 0],
        });
      }
    }

    // Copy all the text
    const clipboard = await copyToClipboard(page);
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
    }

    // Paste after
    await page.keyboard.press('ArrowRight');
    await pasteFromClipboard(page, clipboard);
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!Copy + pasting?</span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 12,
        anchorPath: [4, 0, 0],
        focusOffset: 12,
        focusPath: [4, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!Copy + pasting?</span>
            <br />
            <br />
            <span data-lexical-text="true">Sounds good!</span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 12,
        anchorPath: [0, 6, 0],
        focusOffset: 12,
        focusPath: [0, 6, 0],
      });
    }
  });

  test(`Copy and paste heading`, async ({
    isPlainText,
    isCollab,
    page,
    browserName,
  }) => {
    test.fixme(isCollab && IS_LINUX, 'Flaky on Linux + Collab');
    test.skip(isPlainText);
    test.fixme(
      IS_LINUX && browserName === 'chromium',
      'Flaky on Linux + Chromium',
    );

    await focusEditor(page);
    await page.keyboard.type('# Heading');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Some text');

    await moveToEditorBeginning(page);
    await page.keyboard.down('Shift');
    await moveToLineEnd(page);
    await page.keyboard.up('Shift');

    const clipboard = await copyToClipboard(page);

    await moveToEditorEnd(page);
    await page.keyboard.press('Enter');

    // Paste the content
    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Heading</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some text</span>
        </p>
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Heading</span>
        </h1>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 7,
      anchorPath: [2, 0, 0],
      focusOffset: 7,
      focusPath: [2, 0, 0],
    });
  });

  test(`Copy and paste between sections`, async ({
    isRichText,
    page,
    browserName,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world #foobar test #foobar2 when #not');

    await page.keyboard.press('Enter');
    await page.keyboard.type('Next #line of #text test #foo');

    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );

      await assertSelection(page, {
        anchorOffset: 4,
        anchorPath: [1, 5, 0],
        focusOffset: 4,
        focusPath: [1, 5, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 4,
        anchorPath: [0, 12, 0],
        focusOffset: 4,
        focusPath: [0, 12, 0],
      });
    }

    // Select all the content
    await selectAll(page);

    if (isRichText) {
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 2,
          focusPath: [],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 4,
          focusPath: [1, 5, 0],
        });
      }
    } else {
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 1,
          focusPath: [],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 4,
          focusPath: [0, 12, 0],
        });
      }
    }

    // Copy all the text
    let clipboard = await copyToClipboard(page);
    await page.keyboard.press('Delete');
    // Paste the content
    await pasteFromClipboard(page, clipboard);

    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 4,
        anchorPath: [1, 5, 0],
        focusOffset: 4,
        focusPath: [1, 5, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 4,
        anchorPath: [0, 12, 0],
        focusOffset: 4,
        focusPath: [0, 12, 0],
      });
    }

    await moveToPrevWord(page);
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowUp');
    await moveToPrevWord(page);
    // Once more for linux on Chromium
    if (IS_LINUX && browserName === 'chromium') {
      await moveToPrevWord(page);
    }
    await page.keyboard.up('Shift');

    if (isRichText) {
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [1, 5, 0],
        focusOffset: 1,
        focusPath: [0, 2, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [0, 12, 0],
        focusOffset: 1,
        focusPath: [0, 2, 0],
      });
    }

    // Copy selected text
    clipboard = await copyToClipboard(page);
    await page.keyboard.press('Delete');
    // Paste the content
    await pasteFromClipboard(page, clipboard);

    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [1, 5, 0],
        focusOffset: 1,
        focusPath: [1, 5, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello world</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foobar2
            </span>
            <span data-lexical-text="true">when</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #not
            </span>
            <br />
            <span data-lexical-text="true">Next</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #line
            </span>
            <span data-lexical-text="true">of</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #text
            </span>
            <span data-lexical-text="true">test</span>
            <span
              class="PlaygroundEditorTheme__hashtag"
              data-lexical-text="true">
              #foo
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 1,
        anchorPath: [0, 12, 0],
        focusOffset: 1,
        focusPath: [0, 12, 0],
      });
    }

    // Select all the content
    await selectAll(page);

    if (isRichText) {
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 2,
          focusPath: [],
        });
      } else {
        if (browserName === 'firefox') {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 3,
            focusPath: [1, 5, 0],
          });
        } else {
          await assertSelection(page, {
            anchorOffset: 0,
            anchorPath: [0, 0, 0],
            focusOffset: 4,
            focusPath: [1, 5, 0],
          });
        }
      }
    } else {
      if (browserName === 'firefox') {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [],
          focusOffset: 1,
          focusPath: [],
        });
      } else {
        await assertSelection(page, {
          anchorOffset: 0,
          anchorPath: [0, 0, 0],
          focusOffset: 4,
          focusPath: [0, 12, 0],
        });
      }
    }

    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0],
      focusOffset: 0,
      focusPath: [0],
    });
  });

  test('Copy and paste an inline element into a leaf node', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    // Root
    //   |- Paragraph
    //      |- Link
    //         |- Text "Hello"
    //      |- Text "World"
    await page.keyboard.type('Hello');
    await selectAll(page);
    await click(page, '.link');
    await click(page, '.link-confirm');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.type('World');

    await selectAll(page);

    const clipboard = await copyToClipboard(page);

    await page.keyboard.press('ArrowRight');

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Hello</span>
          </a>
          <span data-lexical-text="true">World</span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://"
            rel="noreferrer">
            <span data-lexical-text="true">Hello</span>
          </a>
          <span data-lexical-text="true">World</span>
        </p>
      `,
    );
  });

  test('Copy + paste multi-line plain text into rich text produces separate paragraphs', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Hello ');
    await pasteFromClipboard(page, {
      'text/plain': 'world\nAnd text below',
    });
    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </h1>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">And text below</span>
        </p>
      `,
    );
  });

  test('Pasting a decorator node on a blank line inserts before the line', async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.fixme(); // TODO: flaky
    test.skip(isPlainText);

    // copying and pasting the node is easier than creating the clipboard data
    await focusEditor(page);
    await insertYouTubeEmbed(page, YOUTUBE_SAMPLE_URL);
    await page.keyboard.press('ArrowLeft'); // this selects the node
    const clipboard = await copyToClipboard(page);
    await page.keyboard.press('ArrowRight'); // this moves to a new line (empty paragraph node)
    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <div contenteditable="false" data-lexical-decorator="true">
          <div class="PlaygroundEditorTheme__embedBlock">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen=""
              frameborder="0"
              height="315"
              src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"
              title="YouTube video"
              width="560"></iframe>
          </div>
        </div>
        <div contenteditable="false" data-lexical-decorator="true">
          <div class="PlaygroundEditorTheme__embedBlock">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen=""
              frameborder="0"
              height="315"
              src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"
              title="YouTube video"
              width="560"></iframe>
          </div>
        </div>
        <div
          class="PlaygroundEditorTheme__blockCursor"
          contenteditable="false"
          data-lexical-cursor="true"></div>
      `,
    );
  });

  test('Copy and paste paragraph into quote', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('Hello world');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Some text');

    await selectAll(page);

    const clipboard = await copyToClipboard(page);

    await page.keyboard.type('> ');

    await pasteFromClipboard(page, clipboard);

    await assertHTML(
      page,
      html`
        <blockquote
          class="PlaygroundEditorTheme__quote PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello world</span>
        </blockquote>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Some text</span>
        </p>
      `,
    );
  });
});
