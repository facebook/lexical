/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Black-box typing smoke test for a freshly-mounted, empty editor.
 *
 * This mirrors the user-facing behavior of the internal e2e that caught the
 * v0.45.0 sync regression: type a sequence of words into a fresh rich-text
 * editor and assert the text reconciles into the editor state (e.g. a
 * word-count-gated control would then enable). It exercises the real
 * `beforeinput` -> CONTROLLED_TEXT_INSERTION path through `$handleInput` /
 * `$handleBeforeInput`, with NO direct manipulation of editor internals
 * (no clearing `__lexicalKey_*`, no `editor._key` / `_rootElement` poking) —
 * so it stays valid regardless of how root-node resolution is implemented
 * internally.
 *
 * NOTE on scope: this guards the basic "type into an empty editor -> text
 * reconciles" contract. It does NOT reproduce the specific #8588 regression
 * at the jsdom level — under jsdom the root `__lexicalKey_*` stash is present
 * and resolution succeeds whether or not the rootElement carveout exists, so
 * this passes on both the pre- and post-#8588 code. The regression only
 * surfaces in a real browser (the internal e2e), which is consistent with the
 * maintainers' read that the failure depends on browser-specific
 * mutation/selection timing rather than the jsdom code path. Treat this as a
 * behavioral smoke test, not a regression guard for that bug.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createRangeSelection,
  $getRoot,
  $setSelection,
  type LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// Make the core observe a Chrome-like environment where beforeinput is the
// controlled text-entry path (CAN_USE_BEFORE_INPUT=true).
vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: false,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: true,
  IS_FIREFOX: false,
  IS_IOS: false,
  IS_SAFARI: false,
}));

function createInsertTextBeforeInput(data: string): InputEvent {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data,
    inputType: 'insertText',
  });
  // jsdom InputEvent does not expose getTargetRanges; the empty/collapsed
  // selection path does not need a target range, so return none.
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => [],
  });
  return event;
}

describe('Typing into a freshly-mounted empty editor reconciles text', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor();
    registerRichText(editor);
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('beforeinput insertText on a fresh empty editor lands in editor state', () => {
    // Place a collapsed selection at the start of the (empty) root. This is
    // the state right after mount, before any text node exists.
    editor.update(
      () => {
        const root = $getRoot();
        const sel = $createRangeSelection();
        sel.anchor.set(root.getKey(), 0, 'element');
        sel.focus.set(root.getKey(), 0, 'element');
        $setSelection(sel);
      },
      {discrete: true},
    );

    container.dispatchEvent(createInsertTextBeforeInput('Hello'));

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello');
    });
  });

  test('typing eleven words into a fresh empty editor reconciles all of them', () => {
    editor.update(
      () => {
        const root = $getRoot();
        const sel = $createRangeSelection();
        sel.anchor.set(root.getKey(), 0, 'element');
        sel.focus.set(root.getKey(), 0, 'element');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const sentence = 'the quick brown fox jumps over the lazy dog again today';
    // Type it the way a browser delivers keystrokes: one insertText per
    // word-with-trailing-space chunk. (Avoid lookbehind regex for Safari
    // compatibility — build the chunks manually.)
    const words = sentence.split(' ');
    const chunks = words.map((word, i) =>
      i < words.length - 1 ? `${word} ` : word,
    );
    for (const chunk of chunks) {
      container.dispatchEvent(createInsertTextBeforeInput(chunk));
    }

    editor.read(() => {
      const text = $getRoot().getTextContent();
      expect(text).toBe(sentence);
      // The behavior the e2e gates on: word count must reflect the typed text.
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBe(11);
    });
  });
});
