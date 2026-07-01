/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * On Android Chrome, Samsung Keyboard (and similar non-Gboard keyboards)
 * caches the composing region internally. When Lexical inserts a ZWSP during
 * compositionStart to handle format/style mismatches, the resulting DOM
 * mutation triggers Samsung's restartInput(), which restores the cached
 * text and causes duplication.
 *
 * The fix: skip the ZWSP insertion for format/style mismatch on Android
 * Chrome. The ZWSP is still inserted for other conditions (element anchor,
 * non-collapsed selection, Android composition latency heuristic).
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

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

describe('Android Chrome composition — format mismatch ZWSP skip', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor();
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('compositionStart with format mismatch skips CONTROLLED_TEXT_INSERTION', async () => {
    editor.update(
      () => {
        const textNode = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(textNode);
        $getRoot().clear().append(paragraph);
        const selection = textNode.selectEnd();
        selection.format = 1;
      },
      {discrete: true},
    );

    const insertionPayloads: string[] = [];
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      payload => {
        insertionPayloads.push(typeof payload === 'string' ? payload : '');
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    container.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );

    await Promise.resolve();

    expect(insertionPayloads).toEqual([]);
  });

  test('compositionStart with element anchor still dispatches CONTROLLED_TEXT_INSERTION', async () => {
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.select();
      },
      {discrete: true},
    );

    const insertionPayloads: string[] = [];
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      payload => {
        insertionPayloads.push(typeof payload === 'string' ? payload : '');
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );

    container.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );

    await Promise.resolve();

    expect(insertionPayloads.length).toBe(1);
  });
});
