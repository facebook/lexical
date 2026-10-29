/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerMarkdownShortcuts} from '@lexical/markdown';
import {MarkdownTestExtension} from '@lexical/markdown/src/__tests__/utils';
import {defineExtension, IS_APPLE} from 'lexical';
import {describe, test} from 'vitest';

import {assertHTML, html, press, setupEditor, typeText} from './utils';

const extension = defineExtension({
  dependencies: [MarkdownTestExtension],
  name: '[select-all-delete-test]',
  register: editor => registerMarkdownShortcuts(editor),
});

const EMPTY_EDITOR = html`
  <p class="PlaygroundEditorTheme__paragraph" dir="auto">
    <br data-lexical-managed-linebreak="true" />
  </p>
`;

// Selecting the whole document and wiping it should leave the editor exactly as
// it starts out: one empty paragraph. When the surviving block was a heading,
// quote or list it used to linger as an empty block of that type, so the next
// thing typed came out as a heading or a bullet (#5835).
describe('Select all + delete clears the editor (#5835)', () => {
  test('a heading, with Backspace', async () => {
    const {root} = setupEditor([extension]);
    await typeText('# Just a heading');
    await press('ControlOrMeta+a');
    await press('Backspace');
    await assertHTML(root, EMPTY_EDITOR);
  });

  test('a heading, with forward Delete', async () => {
    const {root} = setupEditor([extension]);
    await typeText('# Just a heading');
    await press('ControlOrMeta+a');
    await press('Delete');
    await assertHTML(root, EMPTY_EDITOR);
  });

  test('a quote, with forward Delete', async () => {
    const {root} = setupEditor([extension]);
    await typeText('> Just a quote');
    await press('ControlOrMeta+a');
    await press('Delete');
    await assertHTML(root, EMPTY_EDITOR);
  });

  test('a list followed by a paragraph, with Backspace', async () => {
    const {root} = setupEditor([extension]);
    await typeText('- ');
    await typeText('one');
    await press('Enter');
    await typeText('two');
    await press('ControlOrMeta+a');
    await press('Backspace');
    await assertHTML(root, EMPTY_EDITOR);
  });

  test('a heading, with delete-by-word', async () => {
    const {root} = setupEditor([extension]);
    await typeText('# Just a heading');
    await press('ControlOrMeta+a');
    await press(IS_APPLE ? 'Alt+Delete' : 'Control+Delete');
    await assertHTML(root, EMPTY_EDITOR);
  });

  // The collapse is for wiping a document, not for an ordinary delete that
  // happens to empty the block. Deleting the only word from a caret extends a
  // *collapsed* selection, so the heading has to survive -- exactly as it does
  // when the same word is removed with repeated Backspace. jsdom stubs
  // Selection.modify, so only a real browser exercises this path.
  test('delete-by-word from a caret keeps the heading', async () => {
    const {root} = setupEditor([extension]);
    await typeText('# Heading');
    await press(IS_APPLE ? 'Meta+ArrowUp' : 'Control+Home');
    await press(IS_APPLE ? 'Alt+Delete' : 'Control+Delete');
    await assertHTML(
      root,
      html`
        <h1 class="PlaygroundEditorTheme__h1" dir="auto">
          <br data-lexical-managed-linebreak="true" />
        </h1>
      `,
    );
  });
});
