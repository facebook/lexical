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

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
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
import {invariant} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, onTestFinished, test, vi} from 'vitest';

vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: true,
  IS_SAFARI: false,
}));

function mountEditor() {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  document.body.appendChild(container);
  const editor = buildEditorFromExtensions({
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

function getDOMTextNode(editor: LexicalEditor, textKey: string): Text {
  const span = editor.getElementByKey(textKey);
  assert(span !== null, 'span is null');
  const textNode = span.firstChild;
  assert(
    textNode !== null && textNode.nodeType === Node.TEXT_NODE,
    'expected DOM text node',
  );
  return textNode as Text;
}

function createBeforeInputEvent(
  inputType: string,
  targetRange: StaticRange | null,
): InputEvent {
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType,
  });
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

describe('iOS 10-key Korean IME — deleteContentBackward with targetRange', () => {
  test('applyDOMRange resolves a range over in-progress Korean jamo', async () => {
    const {editor} = mountEditor();
    const composingText = '안녕하ᄉᆞ';
    const textKey = await setSingleTextNode(editor, composingText, 5);

    const domText = getDOMTextNode(editor, textKey);
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
    const {editor} = mountEditor();
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

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안녕하');
    });
  });

  test('deleteContentBackward with non-collapsed targetRange deletes the targetRange text', async () => {
    const {container, editor} = mountEditor();
    const composingText = '안녕하ᄉᆞ';
    const textKey = await setSingleTextNode(editor, composingText, 5);

    const domText = getDOMTextNode(editor, textKey);
    const targetRange = createStaticRange(domText, 3, domText, 5);
    const event = createBeforeInputEvent('deleteContentBackward', targetRange);

    container.dispatchEvent(event);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안녕하');
    });
  });

  test('applyDOMRange with collapsed targetRange leaves selection collapsed — iOS fast path is skipped', async () => {
    const {editor} = mountEditor();
    const text = '안녕하세요';
    const textKey = await setSingleTextNode(editor, text, 5);

    const domText = getDOMTextNode(editor, textKey);

    await editor.update(() => {
      const sel = $getSelection();
      invariant($isRangeSelection(sel), 'expected RangeSelection');
      const collapsedRange = createStaticRange(domText, 5, domText, 5);
      sel.applyDOMRange(collapsedRange);
      expect(sel.isCollapsed()).toBe(true);
    });

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안녕하세요');
    });
  });

  test('applyDOMRange handles a targetRange that straddles two adjacent text nodes', async () => {
    const {editor} = mountEditor();
    let key1 = '';
    let key2 = '';

    await editor.update(() => {
      const paragraph = $createParagraphNode();
      const node1 = $createTextNode('안녕').setStyle('--x:0');
      const node2 = $createTextNode('하세요');
      paragraph.append(node1, node2);
      $getRoot().clear().append(paragraph);
      key1 = node1.getKey();
      key2 = node2.getKey();

      const sel = $createRangeSelection();
      sel.anchor.set(key2, 3, 'text');
      sel.focus.set(key2, 3, 'text');
      $setSelection(sel);
    });

    const domText1 = getDOMTextNode(editor, key1);
    const domText2 = getDOMTextNode(editor, key2);
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

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('안세요');
    });
  });
});
