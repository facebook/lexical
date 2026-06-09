/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Regression test for an Android IME backspace bug (Microsoft SwiftKey).
 *
 * On Android, certain IMEs (notably Microsoft SwiftKey) fire keydown with
 * keyCode 229 / key "Unidentified" instead of a real "Backspace", so the
 * KEY_BACKSPACE_COMMAND keydown path never runs. Deletion instead arrives as
 * a `beforeinput` event with inputType `deleteContentBackward`.
 *
 * For ordinary text on Android Chrome, Lexical lets the browser perform the
 * deletion (`shouldLetBrowserHandleDelete`). But when the node immediately
 * before a collapsed cursor is an atomic unit — a DecoratorNode, or a token /
 * segmented TextNode such as a mention — the browser's native delete walks
 * character-by-character and skips over the atomic node, so nothing is
 * deleted (the reported SwiftKey bug).
 *
 * The fix extends the "don't let the browser handle it" guard to cover token
 * and segmented TextNodes in addition to DecoratorNodes, so Lexical dispatches
 * DELETE_CHARACTER_COMMAND and removes the whole token.
 *
 * These tests assert on whether DELETE_CHARACTER_COMMAND is dispatched (i.e.
 * Lexical owns the delete) rather than on the post-delete text content: the
 * collapsed-selection delete path ultimately calls the native
 * `Selection.modify`, which jsdom does not implement, so the end-to-end
 * deletion cannot run in this environment. The dispatch decision is exactly
 * the behavior this fix changes.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DELETE_CHARACTER_COMMAND,
  LexicalEditor,
  TextNode,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// Make LexicalEvents.ts observe an Android Chrome environment.
vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: true,
  IS_ANDROID_CHROME: true,
  IS_APPLE: false,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: true,
  IS_FIREFOX: false,
  IS_IOS: false,
  IS_SAFARI: false,
}));

function createDeleteContentBackwardEvent(): InputEvent {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'deleteContentBackward',
  });
  // jsdom InputEvent does not expose getTargetRanges; patch it manually.
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => [],
  });
  return event;
}

describe('Android IME deleteContentBackward — atomic node before cursor', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;
  let deleteCharacterCount: number;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor();
    registerRichText(editor);
    editor.setRootElement(container);

    deleteCharacterCount = 0;
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => {
        deleteCharacterCount++;
        // Returning true marks the command handled and prevents the default
        // rich-text handler (which would call the unsupported Selection.modify)
        // from running in jsdom.
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  // Places a collapsed cursor at the END of `node` (the atomic candidate),
  // mirroring the reconciled selection state when backspacing right after the
  // node. A trailing plain TextNode is appended so the paragraph is realistic.
  function setupCursorAfter(makeNode: () => TextNode): void {
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        const node = makeNode();
        const after = $createTextNode(' x');
        paragraph.append(node, after);
        $getRoot().clear().append(paragraph);

        const sel = $createRangeSelection();
        const offset = node.getTextContentSize();
        sel.anchor.set(node.getKey(), offset, 'text');
        sel.focus.set(node.getKey(), offset, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );
  }

  test('Lexical handles delete when the cursor is right after a segmented token (mention)', () => {
    setupCursorAfter(() => $createTextNode('@alice').setMode('segmented'));
    container.dispatchEvent(createDeleteContentBackwardEvent());
    expect(deleteCharacterCount).toBe(1);
  });

  test('Lexical handles delete when the cursor is right after a token-mode TextNode', () => {
    setupCursorAfter(() => $createTextNode('#hashtag').setMode('token'));
    container.dispatchEvent(createDeleteContentBackwardEvent());
    expect(deleteCharacterCount).toBe(1);
  });

  test('browser handles delete when the cursor is inside plain text', () => {
    setupCursorAfter(() => $createTextNode('plain'));
    container.dispatchEvent(createDeleteContentBackwardEvent());
    // Plain text is deletable natively, so Lexical defers to the browser and
    // does NOT dispatch DELETE_CHARACTER_COMMAND.
    expect(deleteCharacterCount).toBe(0);
  });
});
