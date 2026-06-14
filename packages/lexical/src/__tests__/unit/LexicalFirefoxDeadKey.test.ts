/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $setSelection,
  LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: false,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: true,
  IS_IOS: false,
  IS_SAFARI: false,
}));

function setDOMSelectionInside(textNode: Text, offset: number) {
  const sel = window.getSelection();
  if (sel) {
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

describe('Firefox dead key on empty paragraph (#8697)', () => {
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

  test('a dead key composed on a fresh paragraph keeps the typed character', async () => {
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        const sel = $createRangeSelection();
        sel.anchor.set(paragraph.getKey(), 0, 'element');
        sel.focus.set(paragraph.getKey(), 0, 'element');
        $setSelection(sel);
      },
      {discrete: true},
    );

    // keydown for the dead key
    container.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Dead'}),
    );

    // compositionstart — lexical inserts COMPOSITION_START_CHAR (NBSP) into a
    // brand new text node and the reconciler appends COMPOSITION_SUFFIX (ZWSP),
    // so the DOM text node is COMPOSITION_START_CHAR + COMPOSITION_SUFFIX.
    container.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );

    const span = container.querySelector('p span');
    const domText = (span && span.firstChild) as Text | null;
    expect(domText).not.toBeNull();
    // The placeholder + suffix only; the dead-key character is "pending" in the
    // IME and is NOT written into the DOM text node (this is the dead-key case).
    expect(domText!.nodeValue).toBe('\u00A0\u200B');
    setDOMSelectionInside(domText!, 1);

    // compositionend — Firefox commits the dead key. The committed character is
    // only delivered via `data`; the DOM text node is still the placeholder.
    container.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: '`'}),
    );

    // onInput fires after compositionend on Firefox.
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      data: '`',
      inputType: 'insertCompositionText',
    });
    Object.defineProperty(inputEvent, 'isComposing', {value: false});
    container.dispatchEvent(inputEvent);

    // Allow the deferred (20ms) empty-node removal timer to fire.
    await new Promise(r => setTimeout(r, 50));

    let text = '';
    editor.read(() => {
      text = $getRoot().getTextContent();
    });
    expect(text).toBe('`');
  });
});
