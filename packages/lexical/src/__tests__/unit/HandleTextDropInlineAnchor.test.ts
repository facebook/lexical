/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getClipboardDataFromSelection,
  $handleRichTextDrop,
  $writeDragSourceToDataTransfer,
  setLexicalClipboardDataTransfer,
} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
} from 'lexical';
import {assert, expect, onTestFinished, test, vi} from 'vitest';

import {$createTestDecoratorNode, TestDecoratorNode} from '../utils';

// Desktop Chromium renders a zero-size anchor before an inline decorator that
// starts a paragraph (#7158), so a drop's DOM offset in the paragraph is one
// more than its Lexical offset. `vi.mock` is hoisted above all imports, so the
// reconciler sees Chrome.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  IS_ANDROID: false,
  IS_CHROME: true,
}));

const caretFromPointState = vi.hoisted(() => ({
  current: (_x: number, _y: number): null | {node: Node; offset: number} =>
    null,
}));

// jsdom can't hit-test, so the drop point comes from here.
vi.mock('@lexical/clipboard/src/caretFromPoint', () => ({
  caretFromPoint: (x: number, y: number) => caretFromPointState.current(x, y),
}));

test.each([
  [
    'before the inline decorator that starts a paragraph',
    1,
    1,
    ['foo', 'decorator'],
  ],
  [
    'between two inline decorators that start a paragraph',
    2,
    2,
    ['decorator', 'foo', 'decorator'],
  ],
])('a drop %s lands there', (_name, domOffset, decorators, expected) => {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const text = $createTextNode('Hello foo world');
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append(
            ...Array.from({length: decorators}, $createTestDecoratorNode),
          ),
          $createParagraphNode().append(text),
        );
      text.select(6, 9);
    },
    dependencies: [RichTextExtension],
    name: '[drop-inline-anchor]',
    nodes: [TestDecoratorNode],
  });
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  const paragraphDOM = root.firstElementChild;
  assert(paragraphDOM !== null, 'Expected the paragraph');
  expect(
    paragraphDOM.firstElementChild?.hasAttribute(
      'data-lexical-decorator-boundary',
    ),
  ).toBe(true);
  caretFromPointState.current = () => ({
    node: paragraphDOM,
    offset: domOffset,
  });
  editor.update(
    () => {
      const dataTransfer = new DataTransfer();
      setLexicalClipboardDataTransfer(
        dataTransfer,
        $getClipboardDataFromSelection(),
      );
      $writeDragSourceToDataTransfer(dataTransfer, editor);
      expect(
        $handleRichTextDrop(
          new DragEvent('drop', {cancelable: true, dataTransfer}),
          editor,
        ),
      ).toBe(true);
    },
    {discrete: true},
  );
  editor.read('latest', () => {
    const paragraph = $getRoot().getFirstChild();
    assert($isElementNode(paragraph), 'Expected the paragraph');
    expect(
      paragraph
        .getChildren()
        .map(node =>
          $isDecoratorNode(node) ? 'decorator' : node.getTextContent(),
        ),
    ).toEqual(expected);
  });
});
