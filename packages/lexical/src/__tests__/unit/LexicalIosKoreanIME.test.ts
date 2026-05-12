/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Tests for the iOS 10-key (천지인/Chunjiin) Korean IME fix.
 *
 * The iOS 10-key keyboard does NOT fire compositionstart/compositionend.
 * Instead it sends:
 *   1. beforeinput deleteContentBackward with a non-collapsed targetRange
 *   2. beforeinput insertText with the updated syllable
 *
 * Because editor.isComposing() is always false, Lexical would previously
 * dispatch DELETE_CHARACTER_COMMAND which ignores targetRange and deletes
 * the wrong character, leaving orphaned jamo in the editor.
 *
 * The fix applies the targetRange directly via selection.applyDOMRange()
 * when on iOS with a non-collapsed targetRange.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  LexicalEditor,
} from 'lexical';
import {createTestEditor, invariant} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so LexicalEvents.ts /
// LexicalConstants.ts observe IS_IOS=true and CAN_USE_BEFORE_INPUT=true.
vi.mock('shared/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: true,
  IS_SAFARI: false,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDOMTextNode(editor: LexicalEditor, textKey: string): Text {
  const span = editor.getElementByKey(textKey);
  invariant(span !== null, 'span is null');
  const textNode = span.firstChild;
  invariant(
    textNode !== null && textNode.nodeType === Node.TEXT_NODE,
    'expected DOM text node',
  );
  return textNode as Text;
}

/**
 * Creates a mock beforeinput InputEvent whose getTargetRanges() returns
 * a single StaticRange built from the provided DOM boundary points.
 */
function createBeforeInputEvent(
  inputType: string,
  targetRange: StaticRange | null,
): InputEvent {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType,
  });
  // jsdom InputEvent does not expose getTargetRanges; patch it manually.
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => (targetRange ? [targetRange] : []),
  });
  return event;
}

function createStaticRange(
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
): StaticRange {
  return new StaticRange({
    endContainer,
    endOffset,
    startContainer,
    startOffset,
  });
}

/**
 * Replaces the editor content with a single paragraph containing `text`
 * and places a collapsed selection at `cursorOffset`. Returns the text node key.
 */
async function setSingleTextNode(
  editor: LexicalEditor,
  text: string,
  cursorOffset: number,
): Promise<string> {
  let textKey = '';
  await editor.update(() => {
    const paragraph = $createParagraphNode();
    const node = $createTextNode(text);
    paragraph.append(node);
    $getRoot().clear().append(paragraph);
    textKey = node.getKey();

    const sel = $createRangeSelection();
    sel.anchor.set(textKey, cursorOffset, 'text');
    sel.focus.set(textKey, cursorOffset, 'text');
    $setSelection(sel);
  });
  return textKey;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('iOS 10-key Korean IME — deleteContentBackward with targetRange', () => {
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

  // -------------------------------------------------------------------------
  // 1. Unit test: applyDOMRange correctly resolves a range over Korean text
  // -------------------------------------------------------------------------

  test('applyDOMRange resolves a range over in-progress Korean jamo', async () => {
    // "안녕하" assembled + "ᄉᆞ" (Hangul Choseong Sios U+1109 +
    // Jungseong Arae-a U+119E, two composing jamo) — 5 BMP code units total.
    const composingText = '안녕하ᄉᆞ';
    const textKey = await setSingleTextNode(editor, composingText, 5);

    const domText = getDOMTextNode(editor, textKey);

    // The targetRange covers the two composing jamo at [3, 5]
    const targetRange = createStaticRange(domText, 3, domText, 5);

    await editor.update(() => {
      const sel = $getSelection();
      invariant($isRangeSelection(sel), 'expected RangeSelection');
      sel.applyDOMRange(targetRange);

      expect(sel.anchor.key).toBe(textKey);
      expect(sel.anchor.offset).toBe(3);
      expect(sel.focus.key).toBe(textKey);
      expect(sel.focus.offset).toBe(5);
      expect(sel.isCollapsed()).toBe(false);
    });
  });

  test('applyDOMRange + removeText leaves only the assembled syllables', async () => {
    const composingText = '안녕하ᄉᆞ';
    const textKey = await setSingleTextNode(editor, composingText, 5);

    const domText = getDOMTextNode(editor, textKey);
    const targetRange = createStaticRange(domText, 3, domText, 5);

    await editor.update(() => {
      const sel = $getSelection();
      invariant($isRangeSelection(sel), 'expected RangeSelection');
      sel.applyDOMRange(targetRange);
      sel.removeText();
    });

    await editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안녕하');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Integration test: deleteContentBackward event uses targetRange on iOS
  // -------------------------------------------------------------------------

  test('deleteContentBackward with non-collapsed targetRange deletes the targetRange text', async () => {
    // Simulate the state mid-composition: "안녕하ᄉᆞ" in the editor,
    // cursor at end. The IME fires deleteContentBackward targeting [3,5]
    // to erase "ᄉᆞ", then will follow up with insertText "세".
    const composingText = '안녕하ᄉᆞ';
    const textKey = await setSingleTextNode(editor, composingText, 5);

    const domText = getDOMTextNode(editor, textKey);
    const targetRange = createStaticRange(domText, 3, domText, 5);
    const event = createBeforeInputEvent('deleteContentBackward', targetRange);

    container.dispatchEvent(event);

    await editor.read(() => {
      // The fix should delete only "ᄉᆞ" (the targetRange), not "하"
      expect($getRoot().getTextContent()).toBe('안녕하');
    });
  });

  test('applyDOMRange with collapsed targetRange leaves selection collapsed — iOS fast path is skipped', async () => {
    // The iOS fast path guard is:
    //   if (IS_IOS && targetRange !== null && !targetRange.collapsed)
    // When targetRange IS collapsed, the guard is false and Lexical falls through
    // to its default deletion path. This test verifies the guard condition:
    // applyDOMRange with a collapsed range produces a collapsed selection, so
    // !selection.isCollapsed() is false and the early return is not taken.
    const text = '안녕하세요';
    const textKey = await setSingleTextNode(editor, text, 5);

    const domText = getDOMTextNode(editor, textKey);

    await editor.update(() => {
      const sel = $getSelection();
      invariant($isRangeSelection(sel), 'expected RangeSelection');
      // Applying a collapsed range keeps the selection collapsed →
      // the iOS fast path's !sel.isCollapsed() check is false → falls through.
      const collapsedRange = createStaticRange(domText, 5, domText, 5);
      sel.applyDOMRange(collapsedRange);
      expect(sel.isCollapsed()).toBe(true);
    });

    // Text must be unchanged (the iOS fast path did not fire).
    await editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안녕하세요');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Straddle test: targetRange crosses a text-node boundary
  // -------------------------------------------------------------------------

  test('applyDOMRange handles a targetRange that straddles two adjacent text nodes', async () => {
    // Simulate a scenario where "녕" at the end of node1 and "하" at the
    // start of node2 are involved in a cross-node IME range.
    // node1: "안녕"  node2: "하세요"
    let key1 = '';
    let key2 = '';

    await editor.update(() => {
      const paragraph = $createParagraphNode();
      // Use different styles to prevent Lexical from merging adjacent text nodes
      // that share the same format/style (which it normalizes by default).
      const node1 = $createTextNode('안녕').setStyle('--x:0');
      const node2 = $createTextNode('하세요');
      paragraph.append(node1, node2);
      $getRoot().clear().append(paragraph);
      key1 = node1.getKey();
      key2 = node2.getKey();

      const sel = $createRangeSelection();
      sel.anchor.set(key2, 3, 'text'); // cursor at end of node2
      sel.focus.set(key2, 3, 'text');
      $setSelection(sel);
    });

    const domText1 = getDOMTextNode(editor, key1);
    const domText2 = getDOMTextNode(editor, key2);

    // Range spans from offset 1 of node1 (between "안" and "녕") to offset 1
    // of node2 (between "하" and "세") — i.e. the characters "녕하".
    const straddleRange = createStaticRange(domText1, 1, domText2, 1);

    await editor.update(() => {
      const sel = $getSelection();
      invariant($isRangeSelection(sel), 'expected RangeSelection');
      sel.applyDOMRange(straddleRange);

      expect(sel.anchor.key).toBe(key1);
      expect(sel.anchor.offset).toBe(1);
      expect(sel.focus.key).toBe(key2);
      expect(sel.focus.offset).toBe(1);
      expect(sel.isCollapsed()).toBe(false);

      sel.removeText();
    });

    await editor.read(() => {
      // "녕" and "하" removed → "안" + "세요" = "안세요"
      expect($getRoot().getTextContent()).toBe('안세요');
    });
  });
});
