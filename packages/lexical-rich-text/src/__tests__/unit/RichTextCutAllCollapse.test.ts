/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  ListExtension,
} from '@lexical/list';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createTextNode,
  $getRoot,
  $selectAll,
  CUT_COMMAND,
  type LexicalEditorWithDispose,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

const ext = defineExtension({
  dependencies: [RichTextExtension, ListExtension],
  name: '[5835-cut]',
});

function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(ext);
  const container = document.createElement('div');
  document.body.appendChild(container);
  editor.setRootElement(container);
  onTestFinished(() => {
    editor.setRootElement(null);
    container.remove();
  });
  return editor;
}

function cutEvent(): ClipboardEvent {
  const clipboardData = new DataTransfer();
  return new ClipboardEvent('cut', {clipboardData});
}

// The cut handler awaits copyToClipboard before removing the text, so let the
// microtask/timer queue drain before asserting.
function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Cutting the whole document wipes it exactly as deleting does, so it has to
// land in the same empty-editor state. The cut handler removes the text through
// `removeText`, which used to leave the emptied heading behind with its type
// intact while Backspace over the same selection produced a paragraph (#5835).
describe('select-all + cut collapses to an empty paragraph (#5835)', () => {
  test('a lone heading becomes an empty paragraph', async () => {
    using editor = createEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createHeadingNode('h1').append($createTextNode('hi')));
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $selectAll();
      },
      {discrete: true},
    );
    editor.dispatchCommand(CUT_COMMAND, cutEvent());
    await flush();

    editor.read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map(node => node.getType()),
      ).toEqual(['paragraph']);
      expect($getRoot().getTextContent()).toBe('');
    });
  });

  // A collapsed caret cuts nothing, so it must not dissolve the block either:
  // Ctrl+X with no selection in an already-empty heading or list is a no-op,
  // not a wipe.
  test.for([
    {
      $block: () => $createHeadingNode('h1'),
      expected: 'heading',
      label: 'heading',
    },
    {
      $block: () => $createListNode('bullet').append($createListItemNode()),
      expected: 'list',
      label: 'list',
    },
  ])(
    'a collapsed caret in an empty $label cuts nothing',
    async ({$block, expected}) => {
      using editor = createEditor();
      editor.update(
        () => {
          const block = $block();
          $getRoot().clear().append(block);
          block.selectStart();
        },
        {discrete: true},
      );

      editor.dispatchCommand(CUT_COMMAND, cutEvent());
      await flush();

      editor.read(() => {
        expect(
          $getRoot()
            .getChildren()
            .map(node => node.getType()),
        ).toEqual([expected]);
      });
    },
  );
});
