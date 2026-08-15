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

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  COMPOSITION_END_TAG,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
  SKIP_SELECTION_FOCUS_TAG,
} from 'lexical';
import {describe, expect, onTestFinished, test, vi} from 'vitest';

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

function mountEditor($initialEditorState: () => void) {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  document.body.appendChild(container);
  const editor = buildEditorFromExtensions({
    $initialEditorState,
    dependencies: [RichTextExtension],
    name: 'test',
  });
  editor.setRootElement(container);
  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });
  return {container, editor};
}

describe('Android Chrome composition — format mismatch ZWSP skip', () => {
  test('compositionStart with format mismatch skips CONTROLLED_TEXT_INSERTION', async () => {
    const {container, editor} = mountEditor(() => {
      const textNode = $createTextNode('hello');
      $getRoot().append($createParagraphNode().append(textNode));
      const selection = textNode.selectEnd();
      selection.format = 1;
    });

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
    const {container, editor} = mountEditor(() => {
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.select();
    });

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

describe('Android Chrome composition — forced-commit heuristic stays out', () => {
  // A compositionend with no recent keydown normally reads as a commit the
  // browser forced on focus leaving, and is tagged to skip the focus grab and
  // the scroll-into-view. Android Chrome can't make that inference —
  // lastKeyDownTimeStamp is zeroed while composing (see $handleInput), so no
  // keydown can ever attest a typed commit and every commit would look forced.
  // Guards the carve-out that keeps Android on its existing behavior.
  test('a commit with no keydown on record is not treated as browser-forced', async () => {
    const {container, editor} = mountEditor(() => {
      const textNode = $createTextNode('안녕');
      $getRoot().append($createParagraphNode().append(textNode));
      textNode.selectEnd();
    });

    const updates: Set<string>[] = [];
    editor.registerUpdateListener(({tags}) => {
      updates.push(new Set(tags));
    });

    container.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );
    container.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: 'ㅁ'}),
    );
    await Promise.resolve();

    const commit = updates.find(tags => tags.has(COMPOSITION_END_TAG));
    expect(commit).toBeDefined();
    expect(commit!.has(SKIP_SELECTION_FOCUS_TAG)).toBe(false);
    expect(commit!.has(SKIP_SCROLL_INTO_VIEW_TAG)).toBe(false);
  });
});
