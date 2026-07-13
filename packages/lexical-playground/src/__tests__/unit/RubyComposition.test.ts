/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Token-mode composition tests. See $onCompositionEndImpl (LexicalEvents.ts)
// for the redirect mechanism.

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  COMPOSITION_END_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import assert from 'node:assert';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {RubyExtension} from '../../plugins/RubyExtension';
import {
  $createRubyNode,
  $isRubyNode,
} from '../../plugins/RubyExtension/RubyNode';

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

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-composition-test',
      onError: e => {
        throw e;
      },
    });
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  test('insertText at end of ruby inserts into next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        const ruby2 = $getNodeByKey(keys.ruby2Key);
        assert($isRubyNode(ruby2));
        ruby2.select(1, 1);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(0, 0);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(1, 1);
        $getSelection()!.insertText('の');
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前漢の字後');
  });

  test('CONTROLLED_TEXT_INSERTION at end of ruby inserts into next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        const ruby2 = $getNodeByKey(keys.ruby2Key);
        assert($isRubyNode(ruby2));
        ruby2.select(1, 1);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(0, 0);
      },
      {discrete: true},
    );

    editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'か');

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前か漢字後');
  });

  test('$nudgeOffRuby skips when ruby node is composing', () => {
    const keys = setupRubyParagraph(editor);

    let anchorKey: string | null = null;
    editor.update(
      () => {
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(0, 0);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(0, 0);

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
        const ruby2 = $getNodeByKey(keys.ruby2Key);
        assert($isRubyNode(ruby2));
        ruby2.select(1, 1);

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
        expect(node.isComposing()).toBe(true);
        expect(node.isToken()).toBe(true);
      },
      {discrete: true},
    );

    expect(domText.nodeValue).toBe('漢か' + NBSP);
  });

  test.for([
    [
      'left from after rubies',
      'postKey',
      0,
      KEY_ARROW_LEFT_COMMAND,
      'ArrowLeft',
      'preKey',
      1,
    ],
    [
      'left from inside ruby1 end',
      'ruby1Key',
      1,
      KEY_ARROW_LEFT_COMMAND,
      'ArrowLeft',
      'preKey',
      1,
    ],
    [
      'left from inside ruby2 start',
      'ruby2Key',
      0,
      KEY_ARROW_LEFT_COMMAND,
      'ArrowLeft',
      'preKey',
      1,
    ],
    [
      'right from before rubies',
      'preKey',
      1,
      KEY_ARROW_RIGHT_COMMAND,
      'ArrowRight',
      'postKey',
      0,
    ],
    [
      'right from inside ruby2 start',
      'ruby2Key',
      0,
      KEY_ARROW_RIGHT_COMMAND,
      'ArrowRight',
      'postKey',
      0,
    ],
    [
      'right from inside ruby1 end',
      'ruby1Key',
      1,
      KEY_ARROW_RIGHT_COMMAND,
      'ArrowRight',
      'postKey',
      0,
    ],
  ] as const)(
    '%s',
    ([
      _desc,
      startKeyField,
      startOffset,
      command,
      keyName,
      expectedKeyField,
      expectedOffset,
    ]) => {
      const keys = setupRubyParagraph(editor);

      let result: {key: string; offset: number} | null = null;
      editor.update(
        () => {
          const startNode = $getNodeByKey(keys[startKeyField]);
          assert(startNode !== null && $isTextNode(startNode));
          startNode.select(startOffset, startOffset);
          const event = new KeyboardEvent('keydown', {key: keyName});
          editor.dispatchCommand(command, event);
          const after = $getSelection();
          result = $isRangeSelection(after)
            ? {key: after.anchor.key, offset: after.anchor.offset}
            : null;
        },
        {discrete: true},
      );

      expect(result).toEqual({
        key: keys[expectedKeyField],
        offset: expectedOffset,
      });
    },
  );

  test('COMPOSITION_END on ruby redirects text to next TextNode', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        const ruby2 = $getNodeByKey(keys.ruby2Key);
        assert($isRubyNode(ruby2));
        ruby2.select(1, 1);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(1, 1);
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
        const ruby1 = $getNodeByKey(keys.ruby1Key);
        assert($isRubyNode(ruby1));
        ruby1.select(0, 0);
        $setCompositionKey(keys.ruby1Key);
        const event = new CompositionEvent('compositionend', {data: 'あ'});
        editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('前あ漢字後');
  });

  test.for([
    ['paragraph-first ruby at end', ['ruby', 'post'], 1, '漢あ後'],
    ['paragraph-first ruby at start', ['ruby', 'post'], 0, 'あ漢後'],
    ['solo ruby at end', ['ruby'], 1, '漢あ'],
    ['solo ruby at start', ['ruby'], 0, 'あ漢'],
  ] as const)(
    'COMPOSITION_END on %s',
    ([_desc, childrenSpec, selectionOffset, expectedText]) => {
      let rubyKey = '';
      editor.update(
        () => {
          const ruby = $createRubyNode('漢', 'かん');
          const paragraph = $createParagraphNode();
          const children = childrenSpec.map(c =>
            c === 'ruby' ? ruby : $createTextNode('後'),
          );
          paragraph.append(...children);
          $getRoot().clear().append(paragraph);
          rubyKey = ruby.getKey();
        },
        {discrete: true},
      );

      if (selectionOffset > 0) {
        editor.update(
          () => {
            const rubyNode = $getNodeByKey(rubyKey);
            assert($isRubyNode(rubyNode));
            rubyNode.select(selectionOffset, selectionOffset);
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
      } else {
        editor.update(
          () => {
            const rubyNode = $getNodeByKey(rubyKey);
            assert($isRubyNode(rubyNode));
            rubyNode.select(0, 0);
            $setCompositionKey(rubyKey);
            const event = new CompositionEvent('compositionend', {data: 'あ'});
            editor.dispatchCommand(COMPOSITION_END_COMMAND, event);
          },
          {discrete: true},
        );
      }

      expect(editor.read(() => $getRoot().getTextContent())).toBe(expectedText);
    },
  );

  test('ruby text content is preserved after COMPOSITION_END redirect', () => {
    const keys = setupRubyParagraph(editor);

    editor.update(
      () => {
        const ruby2 = $getNodeByKey(keys.ruby2Key);
        assert($isRubyNode(ruby2));
        ruby2.select(1, 1);
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
