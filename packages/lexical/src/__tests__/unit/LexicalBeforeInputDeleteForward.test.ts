/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {afterEach, assert, expect, test, vi} from 'vitest';

afterEach(() => {
  vi.doUnmock('lexical/src/environment');
  vi.resetModules();
});

// In an editor without slots, a forward deletion's beforeinput keeps its
// command and its target range, even one that reaches before the caret.
test.each([
  [2, 3],
  [0, 2],
])(
  'deleteContentForward with a target range from %i to %i dispatches DELETE_LINE_COMMAND with that range',
  async (start, end) => {
    vi.resetModules();
    vi.doMock('lexical/src/environment', async importOriginal => ({
      ...(await importOriginal<object>()),
      CAN_USE_BEFORE_INPUT: true,
    }));
    const {
      $createParagraphNode,
      $createTextNode,
      $getRoot,
      $getSelection,
      $isRangeSelection,
      COMMAND_PRIORITY_CRITICAL,
      DELETE_LINE_COMMAND,
    } = await import('lexical');
    const {buildEditorFromExtensions} = await import('@lexical/extension');
    const {RichTextExtension} = await import('@lexical/rich-text');
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const text = $createTextNode('draft');
        $getRoot().append($createParagraphNode().append(text));
        text.select(2, 2);
      },
      afterRegistration: ed => {
        const root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.appendChild(root);
        ed.setRootElement(root);
        return () => {
          ed.setRootElement(null);
          root.remove();
        };
      },
      dependencies: [RichTextExtension],
      name: '[test]',
    });
    const calls: [boolean, number, number][] = [];
    editor.registerCommand(
      DELETE_LINE_COMMAND,
      isBackward => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        const [first, last] = selection.getStartEndPoints();
        calls.push([
          isBackward,
          Math.min(first.offset, last.offset),
          Math.max(first.offset, last.offset),
        ]);
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    const rootElement = editor.getRootElement();
    const textDOM =
      rootElement && rootElement.querySelector('span')?.firstChild;
    assert(rootElement && textDOM);
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentForward',
    });
    Object.defineProperty(event, 'getTargetRanges', {
      value: () => [
        new StaticRange({
          endContainer: textDOM,
          endOffset: end,
          startContainer: textDOM,
          startOffset: start,
        }),
      ],
    });
    rootElement.dispatchEvent(event);
    expect(calls).toEqual([[false, start, end]]);
  },
);
