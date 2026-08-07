/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode} from '@lexical/code';
import {
  CodeShikiExtension,
  loadCodeLanguage,
  loadCodeTheme,
} from '@lexical/code-shiki';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
} from 'lexical';
import {beforeAll, describe, expect, test} from 'vitest';

function createEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension, CodeShikiExtension],
      name: 'code-shiki-retain-selection-test',
    }),
  );
}

describe('CodeHighlighterShiki $updateAndRetainSelection', () => {
  beforeAll(async () => {
    // Shiki defers highlighting until the grammar and theme have loaded, so
    // load them up front to make the transform run on the first update.
    await loadCodeLanguage('javascript');
    await loadCodeTheme('one-light');
  });

  test.each([
    ['\nfoo', 'X\nfoo'],
    ['\n\nfoo', 'X\n\nfoo'],
    ['foo\nbar', 'Xfoo\nbar'],
  ])(
    'retains a non-negative offset for code content %j (#8943)',
    (codeText, expectedText) => {
      using editor = createEditor();

      editor.update(
        () => {
          const code = $createCodeNode('javascript');
          $getRoot().clear().append(code);
          code.append($createTextNode(codeText));
          // Caret at the very start of the code block, while its content is
          // still un-flattened, so the highlighting transform has to restore it.
          code.select(0, 0);
        },
        {discrete: true},
      );

      editor.read(() => {
        const selection = $getSelection();
        expect($isRangeSelection(selection)).toBe(true);
        if (!$isRangeSelection(selection)) {
          return;
        }
        for (const point of [selection.anchor, selection.focus]) {
          expect(point.offset).toBeGreaterThanOrEqual(0);
          if (point.type === 'text') {
            expect(point.offset).toBeLessThanOrEqual(
              point.getNode().getTextContentSize(),
            );
          }
        }
      });

      editor.update(
        () => {
          const selection = $getSelection();
          expect($isRangeSelection(selection)).toBe(true);
          if ($isRangeSelection(selection)) {
            selection.insertText('X');
          }
        },
        {discrete: true},
      );

      expect(
        editor.read(() => $getRoot().getFirstChild()!.getTextContent()),
      ).toBe(expectedText);
    },
  );
});
