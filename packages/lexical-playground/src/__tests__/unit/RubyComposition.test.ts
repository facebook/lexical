/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Safari IME composition at RubyNode boundaries.
 *
 * Safari normalizes the cursor onto the ruby <span> when the caret sits at
 * a ruby|text boundary. When the user starts IME composition there, the
 * browser writes composition text into the ruby DOM. The token-mode revert
 * restores the ruby base text, and Lexical's insertText token redirect
 * moves the composed character into an adjacent TextNode.
 *
 * For this to work, $nudgeOffRuby must NOT move the selection away from
 * the ruby node while it is composing.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setCompositionKey,
  COMPOSITION_END_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import assert from 'node:assert';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {$createRubyNode, $isRubyNode, RubyNode} from '../../nodes/RubyNode';
import {RubyExtension} from '../../plugins/RubyExtension';

vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: true,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: false,
  IS_SAFARI: true,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupRubyParagraph(editor: LexicalEditor): {
  preKey: string;
  ruby1Key: string;
  ruby2Key: string;
  postKey: string;
} {
  const keys = {postKey: '', preKey: '', ruby1Key: '', ruby2Key: ''};
  editor.update(
    () => {
      const pre = $createTextNode('前');
      const ruby1 = $createRubyNode('漢', 'かん');
      const ruby2 = $createRubyNode('字', 'じ');
      const post = $createTextNode('後');
      const paragraph = $createParagraphNode();
      paragraph.append(pre, ruby1, ruby2, post);
      $getRoot().clear().append(paragraph);

      keys.preKey = pre.getKey();
      keys.ruby1Key = ruby1.getKey();
      keys.ruby2Key = ruby2.getKey();
      keys.postKey = post.getKey();
    },
    {discrete: true},
  );
  return keys;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RubyNode composition at boundary (Safari IME)', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;
  let extensionCleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor({nodes: [RubyNode]});
    registerRichText(editor);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extensionCleanup = (RubyExtension as any).register(editor);
    editor.setRootElement(container);
  });

  afterEach(() => {
    extensionCleanup();
    editor.setRootElement(null);
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  // -- Core mechanism: selection.insertText token redirect --

  test('insertText at end of ruby inserts into next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(1, 1);
        $getSelection()!.insertText('あ');
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢字あ後');
  });

  test('insertText at start of ruby inserts into prev TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(0, 0);
        $getSelection()!.insertText('か');
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前か漢字後');
  });

  test('insertText between adjacent rubies creates new TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(1, 1);
        $getSelection()!.insertText('の');
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢の字後');
  });

  // -- CONTROLLED_TEXT_INSERTION_COMMAND (composition end path) --

  test('CONTROLLED_TEXT_INSERTION at end of ruby inserts into next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(1, 1);
      },
      {discrete: true},
    );

    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'あ');

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢字あ後');
  });

  test('CONTROLLED_TEXT_INSERTION at start of ruby inserts into prev TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'か');

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前か漢字後');
  });

  // -- $nudgeOffRuby composing guard --

  test('$nudgeOffRuby skips when ruby node is composing', () => {
    const keys = setupRubyParagraph(editor);

    let anchorKey: string | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(0, 0);
        $setCompositionKey(keys.ruby1Key);

        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

        const after = $getSelection();
        anchorKey = $isRangeSelection(after) ? after.anchor.key : null;
      },
      {discrete: true},
    );

    expect(anchorKey).toBe(keys.ruby1Key);
  });

  test('$nudgeOffRuby moves selection when NOT composing', () => {
    const keys = setupRubyParagraph(editor);

    let anchorKey: string | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(0, 0);

        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

        const after = $getSelection();
        anchorKey = $isRangeSelection(after) ? after.anchor.key : null;
      },
      {discrete: true},
    );

    expect(anchorKey).toBe(keys.preKey);
  });

  test('$nudgeOffRuby at end of ruby moves to next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(1, 1);

        editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);

        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.postKey, offset: 0});
  });

  // -- Token mode: markDirty skipped during composition --

  test('token node skips markDirty while composing', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        $setCompositionKey(keys.ruby1Key);
      },
      {discrete: true},
    );

    const rubyDom = editor.getElementByKey(keys.ruby1Key)!;
    const innerSpan = rubyDom.firstElementChild!;
    const domText = innerSpan.firstChild as Text;
    const NBSP = ' ';
    expect(domText.nodeValue).toBe('漢' + NBSP);

    domText.nodeValue = '漢か' + NBSP;

    editor.update(
      () => {
        const node = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(node));
        if ($isRubyNode(node)) {
          expect(node.isComposing()).toBe(true);
          expect(node.isToken()).toBe(true);
        }
      },
      {discrete: true},
    );

    expect(domText.nodeValue).toBe('漢か' + NBSP);
  });

  // -- Arrow key: skip contiguous ruby group --

  test('left arrow from after rubies skips all rubies to prev text end', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.postKey) as TextNode).select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new KeyboardEvent('keydown', {key: 'ArrowLeft'});
        editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.preKey, offset: 1});
  });

  test('left arrow from inside ruby group also skips to prev text end', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(1, 1);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new KeyboardEvent('keydown', {key: 'ArrowLeft'});
        editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.preKey, offset: 1});
  });

  test('right arrow from before rubies skips all rubies to next text start', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.preKey) as TextNode).select(1, 1);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
        editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.postKey, offset: 0});
  });

  test('right arrow from inside ruby group also skips to next text start', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(0, 0);
        const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
        editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.postKey, offset: 0});
  });

  test('left from inside ruby group skips all contiguous rubies', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(0, 0);
        const event = new KeyboardEvent('keydown', {key: 'ArrowLeft'});
        editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.preKey, offset: 1});
  });

  test('right from inside ruby group skips all contiguous rubies', () => {
    const keys = setupRubyParagraph(editor);

    let result: {key: string; offset: number} | null = null;
    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(1, 1);
        const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
        editor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
        const after = $getSelection();
        result = $isRangeSelection(after)
          ? {key: after.anchor.key, offset: after.anchor.offset}
          : null;
      },
      {discrete: true},
    );

    expect(result).toEqual({key: keys.postKey, offset: 0});
  });

  // -- Composition end: token redirect via $onCompositionEndImpl --

  test('COMPOSITION_END on ruby redirects text to next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(1, 1);
        $setCompositionKey(keys.ruby2Key);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢字あ後');
  });

  test('COMPOSITION_END between adjacent rubies creates new TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(1, 1);
        $setCompositionKey(keys.ruby1Key);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new CompositionEvent('compositionend', {data: 'の'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢の字後');
  });

  test('COMPOSITION_END at offset 0 redirects to prev TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby1Key) as TextNode).select(0, 0);
        $setCompositionKey(keys.ruby1Key);
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前あ漢字後');
  });

  // -- Edge case: ruby as first/last/only child in paragraph --

  test('COMPOSITION_END on paragraph-first ruby at end inserts after', () => {
    let rubyKey = '';
    editor.update(
      () => {
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        const paragraph = $createParagraphNode();
        paragraph.append(ruby, post);
        $getRoot().clear().append(paragraph);
        rubyKey = ruby.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        ($getNodeByKey(rubyKey) as TextNode).select(1, 1);
        $setCompositionKey(rubyKey);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('漢あ後');
  });

  test('COMPOSITION_END on paragraph-first ruby at start creates TextNode before', () => {
    let rubyKey = '';
    editor.update(
      () => {
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        const paragraph = $createParagraphNode();
        paragraph.append(ruby, post);
        $getRoot().clear().append(paragraph);
        rubyKey = ruby.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        ($getNodeByKey(rubyKey) as TextNode).select(0, 0);
        $setCompositionKey(rubyKey);
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('あ漢後');
  });

  test('COMPOSITION_END on solo ruby at end creates TextNode after', () => {
    let rubyKey = '';
    editor.update(
      () => {
        const ruby = $createRubyNode('漢', 'かん');
        const paragraph = $createParagraphNode();
        paragraph.append(ruby);
        $getRoot().clear().append(paragraph);
        rubyKey = ruby.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        ($getNodeByKey(rubyKey) as TextNode).select(1, 1);
        $setCompositionKey(rubyKey);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('漢あ');
  });

  test('COMPOSITION_END on solo ruby at start creates TextNode before', () => {
    let rubyKey = '';
    editor.update(
      () => {
        const ruby = $createRubyNode('漢', 'かん');
        const paragraph = $createParagraphNode();
        paragraph.append(ruby);
        $getRoot().clear().append(paragraph);
        rubyKey = ruby.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        ($getNodeByKey(rubyKey) as TextNode).select(0, 0);
        $setCompositionKey(rubyKey);
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('あ漢');
  });

  // -- Verify state integrity after composition --

  test('ruby text content is preserved after COMPOSITION_END redirect', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        ($getNodeByKey(keys.ruby2Key) as TextNode).select(1, 1);
        $setCompositionKey(keys.ruby2Key);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    editor.read(() => {
      const ruby2 = $getNodeByKey(keys.ruby2Key);
      assert($isRubyNode(ruby2));
      expect(ruby2.getTextContent()).toBe('字');
      expect(ruby2.getAnnotation()).toBe('じ');
    });
  });
});
