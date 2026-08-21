/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeNode} from '@lexical/code';
import {HashtagNode, registerLexicalHashtag} from '@lexical/hashtag';
import {createHeadlessEditor} from '@lexical/headless';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {registerMarkdownShortcuts, TRANSFORMERS} from '@lexical/markdown';
import {$isHeadingNode, HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {describe, expect, it} from 'vitest';

// https://github.com/facebook/lexical/issues/5366
describe('Issue #5366: hashtags block the heading shortcut', () => {
  it.each([
    ['# ', 'h1'],
    ['## ', 'h2'],
    ['### ', 'h3'],
    ['#### ', 'h4'],
    ['##### ', 'h5'],
    ['###### ', 'h6'],
  ])(
    'transforms with the "%s" shortcut typed before existing text',
    (shortcut, tag) => {
      const editor = createHeadlessEditor({
        nodes: [
          HeadingNode,
          ListNode,
          ListItemNode,
          QuoteNode,
          CodeNode,
          LinkNode,
          HashtagNode,
        ],
        onError: error => {
          throw error;
        },
      });

      // The hashtag entity turns the leading "#" of "##Welcome" into its own
      // node, which moves the caret to a different leaf while the shortcut is
      // being typed.
      registerLexicalHashtag(editor);
      registerMarkdownShortcuts(editor, TRANSFORMERS);

      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Welcome to the playground');
          paragraph.append(text);
          $getRoot().append(paragraph);
          text.select(0, 0);
        },
        {discrete: true},
      );

      for (const character of shortcut) {
        editor.update(
          () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertText(character);
            }
          },
          {discrete: true},
        );
      }

      editor.read(() => {
        const heading = $getRoot().getFirstChild();
        expect($isHeadingNode(heading)).toBe(true);
        expect($isHeadingNode(heading) && heading.getTag()).toBe(tag);
        expect(heading?.getTextContent()).toBe('Welcome to the playground');
      });
    },
  );
});
