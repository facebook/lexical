/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToLineBeginning,
  moveToLineEnd,
  pressBackspace,
  selectCharacters,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Emoticons', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can handle a single emoticon`, async ({page, browserName}) => {
    await focusEditor(page);
    await page.keyboard.type('This is an emoji :)');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">This is an emoji</span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 2,
      focusPath: [0, 1, 0, 0],
    });

    await page.keyboard.press('Backspace');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">This is an emoji</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 17,
      anchorPath: [0, 0, 0],
      focusOffset: 17,
      focusPath: [0, 0, 0],
    });

    await page.keyboard.type(':)');
    await page.keyboard.press('ArrowLeft');
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 17,
        anchorPath: [0, 0, 0],
        focusOffset: 17,
        focusPath: [0, 0, 0],
      });
    }

    await page.keyboard.press('ArrowRight');
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 1, 0, 0],
      focusOffset: 2,
      focusPath: [0, 1, 0, 0],
    });

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Delete');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">This is an emoji</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 17,
      anchorPath: [0, 0, 0],
      focusOffset: 17,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can enter multiple emoticons`, async ({
    isRichText,
    browserName,
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(':) :) <3 :(');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji heart" data-lexical-text="true">
            <span class="emoji-inner">❤</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 6, 0, 0],
      focusOffset: 2,
      focusPath: [0, 6, 0, 0],
    });

    await page.keyboard.down('Shift');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Shift');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji heart" data-lexical-text="true">
            <span class="emoji-inner">❤</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
          <br />
          <br />
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 8,
      anchorPath: [0],
      focusOffset: 8,
      focusPath: [0],
    });

    await page.keyboard.type(':) :) <3 :(');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji heart" data-lexical-text="true">
            <span class="emoji-inner">❤</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
          <br />
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji heart" data-lexical-text="true">
            <span class="emoji-inner">❤</span>
          </span>
          <span data-lexical-text="true"></span>
          <span class="emoji unhappysmile" data-lexical-text="true">
            <span class="emoji-inner">🙁</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 2,
      anchorPath: [0, 14, 0, 0],
      focusOffset: 2,
      focusPath: [0, 14, 0, 0],
    });

    await page.keyboard.press('Enter');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [1],
        focusOffset: 0,
        focusPath: [1],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <br />
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 16,
        anchorPath: [0],
        focusOffset: 16,
        focusPath: [0],
      });
    }

    await page.keyboard.type(':) :) <3 :(');
    if (isRichText) {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [1, 6, 0, 0],
        focusOffset: 2,
        focusPath: [1, 6, 0, 0],
      });
    } else {
      await assertHTML(
        page,
        html`
          <p
            class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
            <br />
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji happysmile" data-lexical-text="true">
              <span class="emoji-inner">🙂</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji heart" data-lexical-text="true">
              <span class="emoji-inner">❤</span>
            </span>
            <span data-lexical-text="true"></span>
            <span class="emoji unhappysmile" data-lexical-text="true">
              <span class="emoji-inner">🙁</span>
            </span>
          </p>
        `,
      );
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 22, 0, 0],
        focusOffset: 2,
        focusPath: [0, 22, 0, 0],
      });
    }

    await moveToLineBeginning(page);
    // This should not crash on a deletion on a token node
    await page.keyboard.press('Backspace');
    await moveToLineEnd(page);

    await pressBackspace(page, 22);
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

    await page.keyboard.type(':):):):):)');
    await page.keyboard.press('ArrowLeft');
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 4, 0, 0],
        focusOffset: 0,
        focusPath: [0, 4, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 3, 0, 0],
        focusOffset: 2,
        focusPath: [0, 3, 0, 0],
      });
    }

    await page.keyboard.press('ArrowLeft');
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 3, 0, 0],
        focusOffset: 0,
        focusPath: [0, 3, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 2, 0, 0],
        focusOffset: 2,
        focusPath: [0, 2, 0, 0],
      });
    }

    await page.keyboard.press('ArrowLeft');
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 2, 0, 0],
        focusOffset: 0,
        focusPath: [0, 2, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 2,
        focusPath: [0, 1, 0, 0],
      });
    }

    await page.keyboard.press('ArrowLeft');
    if (browserName === 'firefox') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 2,
        anchorPath: [0, 0, 0, 0],
        focusOffset: 2,
        focusPath: [0, 0, 0, 0],
      });
    }

    await page.keyboard.press('ArrowLeft');
    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 0,
      focusPath: [0, 0, 0, 0],
    });

    await page.keyboard.type('Hey');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hey</span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
          <span class="emoji happysmile" data-lexical-text="true">
            <span class="emoji-inner">🙂</span>
          </span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 3,
      anchorPath: [0, 0, 0],
      focusOffset: 3,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can handle single emoticon replaced with text`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type(':)');
    await page.keyboard.down('Shift');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Shift');
    await page.keyboard.type('a');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">a</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 0, 0],
      focusOffset: 1,
      focusPath: [0, 0, 0],
    });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(':) foo');
    await selectCharacters(page, 'left', 5);
    await page.keyboard.type('a');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">a</span>
        </p>
      `,
    );
    await page.pause();
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 0, 0],
      focusOffset: 1,
      focusPath: [0, 0, 0],
    });
  });
});
