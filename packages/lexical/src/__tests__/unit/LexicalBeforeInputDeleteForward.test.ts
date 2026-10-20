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

// A forward deletion's beforeinput dispatches DELETE_LINE_COMMAND with its
// target range. Without slots even a range that reaches before the caret is
// kept; in a slot such a range is ignored and the caret is kept instead.
test.each([
  {end: 3, expected: [2, 3], slot: false, start: 2},
  {end: 2, expected: [0, 2], slot: false, start: 0},
  {end: 3, expected: [2, 3], slot: true, start: 2},
  {end: 2, expected: [2, 2], slot: true, start: 0},
])(
  'deleteContentForward from $start to $end (slot: $slot) deletes $expected',
  async ({end, expected, slot, start}) => {
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
      $setSlot,
      COMMAND_PRIORITY_CRITICAL,
      DELETE_LINE_COMMAND,
    } = await import('lexical');
    const {buildEditorFromExtensions} = await import('@lexical/extension');
    const {RichTextExtension} = await import('@lexical/rich-text');
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const text = $createTextNode('draft');
        const paragraph = $createParagraphNode().append(text);
        if (slot) {
          const host = $createParagraphNode();
          $getRoot().append(host);
          $setSlot(host, 'note', paragraph);
        } else {
          $getRoot().append(paragraph);
        }
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
    expect(calls).toEqual([[false, ...expected]]);
  },
);
