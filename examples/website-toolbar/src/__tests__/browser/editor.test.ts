/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  FORMAT_TEXT_COMMAND,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

// `using`/`Disposable` is not available in all browser engines yet, so browser
// tests dispose with onTestFinished instead of the `using` keyword.

function setUpEditor(opts?: {$initialEditorState?: () => void}) {
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState:
        (opts && opts.$initialEditorState) ||
        (() => {
          $getRoot().append($createParagraphNode());
        }),
      dependencies: [RichTextExtension],
      name: '[root]',
    }),
  );
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  editor.setRootElement(rootElement);
  onTestFinished(() => {
    editor.setRootElement(null);
    rootElement.remove();
    editor.dispose();
  });
  return {editor, rootElement};
}

describe('Editor (browser)', () => {
  test('reconciles initial text into the real DOM', () => {
    const {rootElement} = setUpEditor({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Hello')),
        );
      },
    });
    expect(rootElement.textContent).toBe('Hello');
    expect(rootElement.isContentEditable).toBe(true);
  });

  test('inserts text via the selection API', () => {
    const {editor, rootElement} = setUpEditor();

    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText('Hello world');
        }
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
    });
    expect(rootElement.textContent).toBe('Hello world');
  });

  test('applies bold formatting via FORMAT_TEXT_COMMAND', () => {
    const {editor, rootElement} = setUpEditor({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Bold me')),
        );
      },
    });

    editor.update(
      () => {
        const textNode = $getRoot()
          .getFirstChildOrThrow()
          .getFirstChildOrThrow();
        textNode.select(0, 7);
      },
      {discrete: true},
    );

    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    editor.update(() => {}, {discrete: true});

    const bold = rootElement.querySelector('strong');
    expect(bold).not.toBeNull();
    expect(bold!.textContent).toBe('Bold me');
  });

  test('Range.getBoundingClientRect reports real layout', () => {
    const {rootElement} = setUpEditor({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Layout test')),
        );
      },
    });
    const textSpan = rootElement.querySelector('[data-lexical-text="true"]')!;
    const range = document.createRange();
    range.selectNodeContents(textSpan);
    const rect = range.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});
