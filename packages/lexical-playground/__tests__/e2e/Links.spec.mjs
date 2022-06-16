/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveLeft,
  moveRight,
  moveToLineBeginning,
  moveToLineEnd,
  selectAll,
  selectCharacters,
  toggleBold,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  assertSelection,
  click,
  focus,
  focusEditor,
  html,
  initialize,
  keyDownCtrlOrMeta,
  keyUpCtrlOrMeta,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.beforeEach(({isPlainText}) => {
  test.skip(isPlainText);
});

test.describe('Links', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can convert a text node into a link`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello');
    await selectAll(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </a>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0, 0],
    });

    await selectAll(page);

    // set url
    await waitForSelector(page, '.link-input');
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            href="https://facebook.com"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">Hello</span>
          </a>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0, 0],
    });

    // unlink
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 0,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can convert multi-formatted text into a link (backward)`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('def');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('ghi');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type(' ');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            def
          </strong>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            ghi
          </em>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 3, 0],
      focusOffset: 1,
      focusPath: [0, 3, 0],
    });

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 9);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    // set url
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://facebook.com">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );
  });

  test(`Can convert multi-formatted text into a link (forward)`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('def');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('ghi');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type(' ');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            def
          </strong>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            ghi
          </em>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 3, 0],
      focusOffset: 1,
      focusPath: [0, 3, 0],
    });

    await moveLeft(page, 10);
    await selectCharacters(page, 'right', 9);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    // set url
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://facebook.com">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );
  });

  test(`Can create a link in a list and insert a paragraph at the start`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('- hello');
    await selectCharacters(page, 'left', 5);

    // link
    await click(page, '.link');

    await moveLeft(page, 1);

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li
            class="PlaygroundEditorTheme__listItem PlaygroundEditorTheme__ltr"
            dir="ltr"
            value="1">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
              dir="ltr"
              href="https://">
              <span data-lexical-text="true">hello</span>
            </a>
          </li>
        </ul>
      `,
    );

    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <ul class="PlaygroundEditorTheme__ul">
          <li class="PlaygroundEditorTheme__listItem" value="1"><br /></li>
          <li class="PlaygroundEditorTheme__listItem" value="2">
            <a
              class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
              dir="ltr"
              href="https://">
              <span data-lexical-text="true">hello</span>
            </a>
          </li>
        </ul>
      `,
    );
  });

  test(`Can create a link with some text after, insert paragraph, then backspace, it should merge correctly`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc def ');
    await moveLeft(page, 5);
    await selectCharacters(page, 'left', 3);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
          </a>
          <span data-lexical-text="true">def</span>
        </p>
      `,
    );

    await moveLeft(page, 1);
    await moveRight(page, 2);
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">ab</span>
          </a>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">c</span>
          </a>
          <span data-lexical-text="true">def</span>
        </p>
      `,
    );

    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">ab</span>
          </a>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">c</span>
          </a>
          <span data-lexical-text="true">def</span>
        </p>
      `,
    );
  });

  test(`Can create a link then replace it with plain text`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type(' abc ');

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 3);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

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
  });

  test(`Can create a link then replace it with plain text #2`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc ');

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 3);

    // link
    await click(page, '.link');

    await selectCharacters(page, 'left', 1);
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
  });

  test(`Can create a link then partly replace it with plain text`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc ');

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 3);

    // link
    await click(page, '.link');

    await selectCharacters(page, 'right', 1);
    await page.keyboard.type('a');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">a</span>
          </a>
          <span data-lexical-text="true">a</span>
        </p>
      `,
    );
  });

  test(`Can convert multi-formatted text into a link and then modify text after`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type(' abc');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('def');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('b');
    await keyUpCtrlOrMeta(page);

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type('ghi');

    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('i');
    await keyUpCtrlOrMeta(page);

    await page.keyboard.type(' ');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">abc</span>
          <strong
            class="PlaygroundEditorTheme__textBold"
            data-lexical-text="true">
            def
          </strong>
          <em
            class="PlaygroundEditorTheme__textItalic"
            data-lexical-text="true">
            ghi
          </em>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 3, 0],
      focusOffset: 1,
      focusPath: [0, 3, 0],
    });

    await moveLeft(page, 1);
    await selectCharacters(page, 'left', 9);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    await moveRight(page, 1);
    await selectCharacters(page, 'right', 1);
    await page.keyboard.type('a');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true"></span>
          <a
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
            href="https://">
            <span data-lexical-text="true">abc</span>
            <strong
              class="PlaygroundEditorTheme__textBold"
              data-lexical-text="true">
              def
            </strong>
            <em
              class="PlaygroundEditorTheme__textItalic"
              data-lexical-text="true">
              ghi
            </em>
          </a>
          <span data-lexical-text="true">a</span>
        </p>
      `,
    );
    await assertSelection(page, {
      anchorOffset: 1,
      anchorPath: [0, 2, 0],
      focusOffset: 1,
      focusPath: [0, 2, 0],
    });
  });

  test(`Does nothing if the selection is collapsed at the end of a text node.`, async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
        </p>
      `,
    );

    await assertSelection(page, {
      anchorOffset: 5,
      anchorPath: [0, 0, 0],
      focusOffset: 5,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can type text before and after`, async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('An Awesome Website');
    await selectAll(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">An Awesome Website</span>
        </p>
      `,
    );

    await click(page, '.link');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">An Awesome Website</span>
          </a>
        </p>
      `,
    );

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('Hey, check this out: ');
    await moveToLineEnd(page);
    await page.keyboard.type('!');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hey, check this out:</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">An Awesome Website</span>
          </a>
          <span data-lexical-text="true">!</span>
        </p>
      `,
    );
  });

  test(`Can convert part of a text node into a link with forwards selection`, async ({
    page,
    browserName,
  }) => {
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

    await moveLeft(page, 5);
    await selectCharacters(page, 'right', 5);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </p>
      `,
    );
    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 5,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 6,
        anchorPath: [0, 0, 0],
        focusOffset: 5,
        focusPath: [0, 1, 0, 0],
      });
    }

    // set url
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://facebook.com"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </p>
      `,
    );

    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 5,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 0,
        anchorPath: [0, 1],
        focusOffset: 5,
        focusPath: [0, 1, 0, 0],
      });
    }

    // unlink
    await click(page, '.link');

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

    await assertSelection(page, {
      anchorOffset: 6,
      anchorPath: [0, 0, 0],
      focusOffset: 11,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can convert part of a text node into a link with backwards selection`, async ({
    page,
    browserName,
  }) => {
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

    await selectCharacters(page, 'left', 5);

    // link
    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </p>
      `,
    );

    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 5,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 5,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 6,
        focusPath: [0, 0, 0],
      });
    }

    // set url
    await click(page, '.link-edit');
    await focus(page, '.link-input');
    await page.keyboard.type('facebook.com');
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://facebook.com"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </p>
      `,
    );

    if (browserName === 'webkit') {
      await assertSelection(page, {
        anchorOffset: 5,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1, 0, 0],
      });
    } else {
      await assertSelection(page, {
        anchorOffset: 5,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 0,
        focusPath: [0, 1],
      });
    }

    // unlink
    await click(page, '.link');

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

    await assertSelection(page, {
      anchorOffset: 11,
      anchorPath: [0, 0, 0],
      focusOffset: 6,
      focusPath: [0, 0, 0],
    });
  });

  test(`Can convert part of a text node into a link and change block type`, async ({
    page,
    browserName,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');

    await moveLeft(page, 5);

    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </p>
      `,
    );

    await page.keyboard.press('ArrowLeft');

    await click(page, '.block-controls');
    await click(page, '.dropdown .icon.h1');

    await assertHTML(
      page,
      html`
        <h1
          class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr">
            <span data-lexical-text="true">world</span>
          </a>
        </h1>
      `,
    );
  });

  test('Can create multiline links', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello world');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Hello world');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Hello world');

    await selectAll(page);

    await click(page, '.link');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello world</span>
          </a>
        </p>
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello world</span>
          </a>
        </p>
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello world</span>
          </a>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can handle pressing Enter inside a Link', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello awesome');
    await selectAll(page);
    await click(page, '.link');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('world');

    await moveToLineBeginning(page);
    await moveRight(page, 6);

    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello</span>
          </a>
        </p>
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">awesome</span>
          </a>
          <span data-lexical-text="true">world</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can handle pressing Enter inside a Link containing multiple TextNodes', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello ');
    await toggleBold(page);
    await page.keyboard.type('awe');
    await toggleBold(page);
    await page.keyboard.type('some');
    await selectAll(page);
    await click(page, '.link');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(' world');

    await moveToLineBeginning(page);
    await moveRight(page, 6);

    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello</span>
          </a>
        </p>
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <strong data-lexical-text="true">awe</strong>
            <span data-lexical-text="true">some</span>
          </a>
          <span data-lexical-text="true">world</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can handle pressing Enter at the beginning of a Link', async ({
    page,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello awesome');
    await selectAll(page);
    await click(page, '.link');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(' world');

    await moveToLineBeginning(page);
    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p><br /></p>
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello awesome</span>
          </a>
          <span data-lexical-text="true">world</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });

  test('Can handle pressing Enter at the end of a Link', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('Hello awesome');
    await selectAll(page);
    await click(page, '.link');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type(' world');

    await moveLeft(page, 6, 100);

    await page.keyboard.press('Enter');

    await assertHTML(
      page,
      html`
        <p dir="ltr">
          <a dir="ltr" href="https://">
            <span data-lexical-text="true">Hello awesome</span>
          </a>
        </p>
        <p dir="ltr">
          <span data-lexical-text="true">world</span>
        </p>
      `,
      undefined,
      {ignoreClasses: true},
    );
  });
});
