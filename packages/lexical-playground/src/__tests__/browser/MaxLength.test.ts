/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $getRoot, configExtension} from 'lexical';
import {describe, test} from 'vitest';

import {MaxLengthExtension} from '../../plugins/MaxLengthPlugin';
import {pasteFromClipboard} from './htmlPasteUtils';
import {
  assertCaret,
  assertHTML,
  assertSelection,
  html,
  press,
  setupEditor,
  typeText,
} from './utils';

describe.each([true, false])('MaxLength (rich text: %s)', isRichText => {
  const setup = () =>
    setupEditor([
      isRichText ? RichTextExtension : PlainTextExtension,
      configExtension(MaxLengthExtension, {disabled: false}),
    ]);
  test(`can restrict the text to specified length`, async () => {
    const {root} = setup();

    await typeText('lorem ipsum dolor sit amet, consectetuer adipiscing elit');

    await assertSelection(root, {
      anchorOffset: 30,
      anchorPath: [0, 0, 0],
      focusOffset: 30,
      focusPath: [0, 0, 0],
    });

    await press('ArrowRight');
    await typeText('Some more text');

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );
  });

  test(`can restrict pasted text to specified length`, async () => {
    const {root} = setup();
    await pasteFromClipboard(root, {
      'text/plain': 'lorem ipsum dolor sit amet, consectetuer adipiscing elit',
    });
    await typeText('Some more text');

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );
  });

  test(`can restrict emojis on boundaries`, async () => {
    const {editor, root} = setup();
    await pasteFromClipboard(root, {
      'text/plain': 'lorem ipsum dolor sit amet, consectetur adipiscing elit',
    });
    await press('Backspace');

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, c</span>
        </p>
      `,
    );

    await assertCaret(editor, 'p > span', 29);
    // Firefox needs the keypress delay to settle rejected non-BMP input.
    await typeText('💏', {delay: 100});

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, c</span>
        </p>
      `,
    );

    await assertCaret(editor, 'p > span', 29);
    await press('Backspace');
    await assertCaret(editor, 'p > span', 28);
    await typeText('💏');

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, 💏</span>
        </p>
      `,
    );

    editor.update(
      () => {
        $getRoot().clear().append($createParagraphNode());
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br data-lexical-managed-linebreak="true" />
        </p>
      `,
    );
    await assertCaret(editor, 'p', 0);
    // Let the limit transform commit each grapheme before the next insertion.
    for (let count = 1; count <= 7; count++) {
      await typeText('👨‍💻');
      await assertCaret(editor, 'p > span', Math.min(count, 6) * '👨‍💻'.length);
    }

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻</span>
        </p>
      `,
    );
  });

  test(`paste with empty paragraph in between #3773`, async () => {
    const {root} = setup();
    await pasteFromClipboard(root, {
      'text/plain':
        'lorem ipsum dolor sit amet, consectetuer \n\nadipiscing elit\n\n',
    });

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );
  });

  test(`paste with empty paragraph at end #3773`, async () => {
    const {root} = setup();
    await pasteFromClipboard(root, {
      'text/plain':
        'lorem ipsum dolor sit amet, consectetuer adipiscing elit\n\n',
    });

    await assertHTML(
      root,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );
  });
});
