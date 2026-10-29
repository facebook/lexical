/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {ListExtension} from '@lexical/list';
import {registerMarkdownShortcuts, UNORDERED_LIST} from '@lexical/markdown';
import {OverflowNode} from '@lexical/overflow';
import {PlainTextExtension} from '@lexical/plain-text';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {
  mountReactPluginComponent,
  mountReactPluginHost,
  ReactPluginHostExtension,
} from '@lexical/react/ReactPluginHostExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  defineExtension,
  IS_APPLE,
} from 'lexical';
import {act} from 'react';
import {describe, onTestFinished, test} from 'vitest';

import {EmojiNode} from '../../nodes/EmojiNode';
import {EmojisExtension} from '../../plugins/EmojisExtension';
import theme from '../../themes/PlaygroundEditorTheme';
import {
  assertCaret,
  assertHTML,
  assertSelection,
  html,
  press as nativePress,
  typeText as nativeTypeText,
} from './utils';

const press = (key: string, count = 1) => act(() => nativePress(key, count));
const typeText = (text: string) => act(() => nativeTypeText(text));
async function repeat(count: number, callback: () => Promise<void>) {
  for (let i = 0; i < count; i++) await callback();
}

const richTextExtension = defineExtension({
  dependencies: [RichTextExtension, ListExtension],
  name: '[character-limit-rich-text]',
  register: editor => registerMarkdownShortcuts(editor, [UNORDERED_LIST]),
});
const emojiExtension = defineExtension({
  dependencies: [EmojisExtension],
  name: '[character-limit-emoji]',
  nodes: () => [EmojiNode],
});

async function setup(charset: 'UTF-8' | 'UTF-16', isRichText: boolean) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.whiteSpace = 'pre-wrap';
  const plugins = document.createElement('div');
  document.body.append(root, plugins);
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        isRichText ? richTextExtension : PlainTextExtension,
        emojiExtension,
        ReactPluginHostExtension,
      ],
      name: '[character-limit-browser]',
      nodes: () => [OverflowNode],
      theme,
    }),
  );
  onTestFinished(async () => {
    await act(async () => editor.dispose());
    root.remove();
    plugins.remove();
    window.getSelection()?.removeAllRanges();
  });
  await act(async () => {
    mountReactPluginHost(editor, plugins);
    mountReactPluginComponent(editor, {
      Component: CharacterLimitPlugin,
      key: 'character-limit',
      props: {charset, maxLength: 5},
    });
    editor.setRootElement(root);
    editor.update(
      () => {
        $getRoot().clear().append($createParagraphNode());
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
  });
  window.focus();
  root.focus();
  return {editor, root};
}

describe.each(['UTF-8', 'UTF-16'] as const)('character limit %s', charset => {
  describe.each([true, false])('rich text: %s', isRichText => {
    test('displays overflow on text', async () => {
      const {root} = await setup(charset, isRichText);

      await typeText('12345');
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">12345</span>
          </p>
        `,
      );

      await typeText('6789');
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">12345</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">6789</span>
            </span>
          </p>
        `,
      );
      await assertSelection(root, {
        anchorOffset: 4,
        anchorPath: [0, 1, 0, 0],
        focusOffset: 4,
        focusPath: [0, 1, 0, 0],
      });

      await press(IS_APPLE ? 'Meta+ArrowLeft' : 'Home');
      await typeText('0');

      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">01234</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">56789</span>
            </span>
          </p>
        `,
      );
      await assertSelection(root, {
        anchorOffset: 1,
        anchorPath: [0, 0, 0],
        focusOffset: 1,
        focusPath: [0, 0, 0],
      });
    });

    test('displays overflow on token nodes', async () => {
      const {root} = await setup(charset, isRichText);
      // The smile emoji (S) is length 2, so for 1234S56:
      // - 1234 is non-overflow text
      // - S takes characters 5 and 6, since it's a token and can't be split we count the whole
      //   node as overflowed
      // - 56 is overflowed

      await typeText('1234:)56');
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">1234</span>
            <span class="PlaygroundEditorTheme__characterLimit">
              <span class="emoji happysmile" data-lexical-text="true">
                <span class="emoji-inner">🙂</span>
              </span>
              <span data-lexical-text="true">56</span>
            </span>
          </p>
        `,
      );

      await press('Backspace', 3);
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">1234</span>
          </p>
        `,
      );
    });

    test('can delete text in front and overflow is recomputed (token nodes)', async () => {
      const {root} = await setup(charset, isRichText);
      // See 'displays overflow on token nodes'

      await typeText('1234:)56');
      await press(IS_APPLE ? 'Meta+ArrowLeft' : 'Home');

      await press('Delete');
      if (charset === 'UTF-16') {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">234</span>
              <span class="emoji happysmile" data-lexical-text="true">
                <span class="emoji-inner">🙂</span>
              </span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">56</span>
              </span>
            </p>
          `,
        );
      } else if (charset === 'UTF-8') {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">234</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span class="emoji happysmile" data-lexical-text="true">
                  <span class="emoji-inner">🙂</span>
                </span>
                <span data-lexical-text="true">56</span>
              </span>
            </p>
          `,
        );
      }
    });

    describe.skipIf(!isRichText)('rich text', () => {
      test('can overflow in lists', async () => {
        const {root} = await setup(charset, isRichText);

        await typeText('- 1234');
        await press('Enter');
        await typeText('56');
        await press('Enter');
        await typeText('7');
        await assertHTML(
          root,
          '<ul class="PlaygroundEditorTheme__ul" dir="auto"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">56</span></span></li><li value="3" class="PlaygroundEditorTheme__listItem"><span class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">7</span></span></li></ul>',
        );

        await press('Backspace', 4);
        await assertHTML(
          root,
          '<ul class="PlaygroundEditorTheme__ul" dir="auto"><li value="1" class="PlaygroundEditorTheme__listItem"><span data-lexical-text="true">1234</span></li><li value="2" class="PlaygroundEditorTheme__listItem"><span class="PlaygroundEditorTheme__characterLimit"><span data-lexical-text="true">5</span></span></li></ul>',
        );
      });

      test('can delete an overflowed paragraph', async () => {
        const {root} = await setup(charset, isRichText);

        await typeText('12345');
        await press('Enter');
        await typeText('6');
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">12345</span>
            </p>
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">6</span>
              </span>
            </p>
          `,
        );

        await press('ArrowLeft');
        await press('Backspace');
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">12345</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">6</span>
              </span>
            </p>
          `,
        );
      });
    });
    test('can type new lines inside overflow', async () => {
      const {root} = await setup(charset, isRichText);

      await typeText('123456');
      await press('Enter');
      await typeText('7');
      if (isRichText) {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">12345</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">6</span>
              </span>
            </p>
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      } else {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">12345</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">6</span>
                <br />
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      }

      await press('Backspace', 3);
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span data-lexical-text="true">12345</span>
          </p>
        `,
      );
    });
    test('can delete text in front and overflow is recomputed', async () => {
      const {editor, root} = await setup(charset, isRichText);

      await typeText('123456');
      await press('Enter');
      await press('7');
      await act(async () => {
        editor.update(() => $getRoot().selectStart(), {discrete: true});
      });

      await assertCaret(editor, 'p:first-child > span:first-child', 0);
      await press('Delete');
      if (isRichText) {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">23456</span>
            </p>
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      } else {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">23456</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <br />
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      }

      await assertCaret(editor, 'p:first-child > span:first-child', 0);
      await press('Delete');
      if (isRichText) {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">3456</span>
            </p>
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      } else {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">3456</span>
              <br />
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">7</span>
              </span>
            </p>
          `,
        );
      }
    });
    test('handles accented characters', async () => {
      const {root} = await setup(charset, isRichText);

      // Worth 1 byte in UTF-16, 2 bytes in UTF-8
      await repeat(6, async () => await typeText('à'));
      if (charset === 'UTF-16') {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">ààààà</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">à</span>
              </span>
            </p>
          `,
        );
      } else {
        await assertHTML(
          root,
          html`
            <p class="PlaygroundEditorTheme__paragraph" dir="auto">
              <span data-lexical-text="true">àà</span>
              <span class="PlaygroundEditorTheme__characterLimit">
                <span data-lexical-text="true">àààà</span>
              </span>
            </p>
          `,
        );
      }
    });
    test('handles graphemes', async () => {
      const {root} = await setup(charset, isRichText);

      await typeText('👨‍👩‍👦‍👦');
      await assertHTML(
        root,
        html`
          <p class="PlaygroundEditorTheme__paragraph" dir="auto">
            <span class="PlaygroundEditorTheme__characterLimit">
              <span data-lexical-text="true">👨‍👩‍👦‍👦</span>
            </span>
          </p>
        `,
      );
    });
  });
});
