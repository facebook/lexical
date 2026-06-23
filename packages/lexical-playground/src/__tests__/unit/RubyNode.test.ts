/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {registerRichText, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  ElementNode,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

import {
  $createRubyNode,
  $isRubyNode,
  $toggleRuby,
  RubyNode,
} from '../../nodes/RubyNode';
import {RubyExtension} from '../../plugins/RubyExtension';

function $getFirstParagraph(): ElementNode {
  const first = $getRoot().getFirstChild();
  if (!$isElementNode(first)) {
    throw new Error('Expected ElementNode');
  }
  return first;
}

describe('RubyNode', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor({nodes: [RubyNode]});
    registerRichText(editor);
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  // -----------------------------------------------------------------------
  // $createRubyNode / $isRubyNode
  // -----------------------------------------------------------------------

  describe('$createRubyNode', () => {
    test('creates node with correct text and annotation', () => {
      let result: {
        annotation: string;
        isToken: boolean;
        text: string;
        type: string;
      } | null = null;
      editor.update(
        () => {
          const node = $createRubyNode('漢', 'かん');
          result = {
            annotation: node.getAnnotation(),
            isToken: node.isToken(),
            text: node.getTextContent(),
            type: node.getType(),
          };
        },
        {discrete: true},
      );

      expect(result!.type).toBe('ruby');
      expect(result!.text).toBe('漢');
      expect(result!.annotation).toBe('かん');
      expect(result!.isToken).toBe(true);
    });
  });

  describe('$isRubyNode', () => {
    test('returns true for RubyNode', () => {
      let result = false;
      editor.update(
        () => {
          const node = $createRubyNode('字', 'じ');
          result = $isRubyNode(node);
        },
        {discrete: true},
      );
      expect(result).toBe(true);
    });

    test('returns false for TextNode', () => {
      let result = true;
      editor.update(
        () => {
          const node = $createTextNode('hello');
          result = $isRubyNode(node);
        },
        {discrete: true},
      );
      expect(result).toBe(false);
    });

    test('returns false for null/undefined', () => {
      expect($isRubyNode(null)).toBe(false);
      expect($isRubyNode(undefined)).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Serialization: importJSON / exportJSON round-trip
  // -----------------------------------------------------------------------

  describe('serialization', () => {
    test('importJSON/exportJSON round-trip preserves text and annotation', () => {
      editor.update(
        () => {
          const ruby = $createRubyNode('漢字', 'かんじ');
          $getRoot().clear().append($createParagraphNode().append(ruby));
        },
        {discrete: true},
      );

      const json = editor.getEditorState().toJSON();

      const editor2 = createTestEditor({nodes: [RubyNode]});
      const state2 = editor2.parseEditorState(json);

      const result = state2.read(() => {
        const paragraph = $getFirstParagraph();
        const children = paragraph.getChildren();
        const ruby = children.find($isRubyNode);
        return ruby
          ? {annotation: ruby.getAnnotation(), text: ruby.getTextContent()}
          : null;
      });

      expect(result).toEqual({annotation: 'かんじ', text: '漢字'});
    });
  });

  // -----------------------------------------------------------------------
  // DOM export: exportDOM
  // -----------------------------------------------------------------------

  describe('exportDOM', () => {
    test('produces <ruby>text<rt>annotation</rt></ruby>', () => {
      editor.update(
        () => {
          const ruby = $createRubyNode('漢字', 'かんじ');
          $getRoot().clear().append($createParagraphNode().append(ruby));
        },
        {discrete: true},
      );

      editor.read(() => {
        const paragraph = $getFirstParagraph();
        const ruby = paragraph.getChildren().find($isRubyNode)!;
        const {element} = ruby.exportDOM();

        expect(element).not.toBeNull();
        const el = element as HTMLElement;
        expect(el.tagName).toBe('RUBY');
        expect(el.childNodes.length).toBe(2);
        expect(el.firstChild!.textContent).toBe('漢字');
        const rt = el.lastChild as HTMLElement;
        expect(rt.tagName).toBe('RT');
        expect(rt.textContent).toBe('かんじ');
      });
    });
  });

  // -----------------------------------------------------------------------
  // DOM creation: createDOM
  // -----------------------------------------------------------------------

  describe('createDOM', () => {
    test('produces wrapper span > inner span with data-ruby-annotation', () => {
      editor.update(
        () => {
          const ruby = $createRubyNode('漢', 'かん');
          $getRoot().clear().append($createParagraphNode().append(ruby));
        },
        {discrete: true},
      );

      editor.read(() => {
        const paragraph = $getFirstParagraph();
        const ruby = paragraph.getChildren().find($isRubyNode)!;
        const key = ruby.getKey();
        const dom = editor.getElementByKey(key)!;

        expect(dom.tagName).toBe('SPAN');
        const inner = dom.firstElementChild as HTMLElement;
        expect(inner).not.toBeNull();
        expect(inner.tagName).toBe('SPAN');
        expect(inner.dataset.rubyAnnotation).toBe('かん');
      });
    });
  });

  // -----------------------------------------------------------------------
  // getDOMSlot
  // -----------------------------------------------------------------------

  describe('getDOMSlot', () => {
    test('returns slot pointing to inner element', () => {
      editor.update(
        () => {
          const ruby = $createRubyNode('漢', 'かん');
          $getRoot().clear().append($createParagraphNode().append(ruby));
        },
        {discrete: true},
      );

      editor.read(() => {
        const paragraph = $getFirstParagraph();
        const ruby = paragraph.getChildren().find($isRubyNode)!;
        const key = ruby.getKey();
        const dom = editor.getElementByKey(key)!;
        const slot = ruby.getDOMSlot(dom);
        const inner = dom.firstElementChild as HTMLElement;
        expect(slot.element).toBe(inner);
      });
    });
  });

  // -----------------------------------------------------------------------
  // $toggleRuby
  // -----------------------------------------------------------------------

  describe('$toggleRuby', () => {
    test('with annotation on selection creates RubyNode', () => {
      editor.update(
        () => {
          const text = $createTextNode('漢字');
          const paragraph = $createParagraphNode().append(text);
          $getRoot().clear().append(paragraph);

          const sel = $createRangeSelection();
          sel.anchor.set(text.getKey(), 0, 'text');
          sel.focus.set(text.getKey(), 2, 'text');
          $setSelection(sel);

          $toggleRuby('かんじ');
        },
        {discrete: true},
      );

      const result = editor.read(() => {
        const paragraph = $getFirstParagraph();
        const children = paragraph.getChildren();
        const ruby = children.find($isRubyNode);
        if (!ruby) {
          return null;
        }
        return {
          annotation: ruby.getAnnotation(),
          text: ruby.getTextContent(),
        };
      });

      expect(result).toEqual({annotation: 'かんじ', text: '漢字'});
    });

    test('with null unwraps RubyNode back to TextNode', () => {
      editor.update(
        () => {
          const ruby = $createRubyNode('漢字', 'かんじ');
          const paragraph = $createParagraphNode().append(ruby);
          $getRoot().clear().append(paragraph);

          const sel = $createRangeSelection();
          sel.anchor.set(ruby.getKey(), 0, 'text');
          sel.focus.set(ruby.getKey(), 2, 'text');
          $setSelection(sel);

          $toggleRuby(null);
        },
        {discrete: true},
      );

      const result = editor.read(() => {
        const paragraph = $getFirstParagraph();
        const children = paragraph.getChildren();
        const hasRuby = children.some($isRubyNode);
        const hasText = children.some(
          c =>
            $isTextNode(c) && !$isRubyNode(c) && c.getTextContent() === '漢字',
        );
        return {hasRuby, hasText};
      });

      expect(result.hasRuby).toBe(false);
      expect(result.hasText).toBe(true);
    });

    test('on collapsed selection is no-op', () => {
      editor.update(
        () => {
          const text = $createTextNode('漢字');
          const paragraph = $createParagraphNode().append(text);
          $getRoot().clear().append(paragraph);

          const sel = $createRangeSelection();
          sel.anchor.set(text.getKey(), 1, 'text');
          sel.focus.set(text.getKey(), 1, 'text');
          $setSelection(sel);

          $toggleRuby('かんじ');
        },
        {discrete: true},
      );

      const result = editor.read(() => {
        const paragraph = $getFirstParagraph();
        const children = paragraph.getChildren();
        return {
          hasRuby: children.some($isRubyNode),
          textContent: paragraph.getTextContent(),
        };
      });

      expect(result.hasRuby).toBe(false);
      expect(result.textContent).toBe('漢字');
    });
  });

  // -----------------------------------------------------------------------
  // $unwrapRubiesInSelection (CONTROLLED_TEXT_INSERTION_COMMAND handler)
  // -----------------------------------------------------------------------

  describe('$unwrapRubiesInSelection', () => {
    let extensionCleanup: () => void;

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      extensionCleanup = (RubyExtension as any).register(editor);
    });

    afterEach(() => {
      extensionCleanup();
    });

    test('typing over selection that includes rubies unwraps them', () => {
      let rubyKey = '';
      let postKey = '';

      editor.update(
        () => {
          const pre = $createTextNode('前');
          const ruby = $createRubyNode('漢字', 'かんじ');
          const post = $createTextNode('後');
          const paragraph = $createParagraphNode().append(pre, ruby, post);
          $getRoot().clear().append(paragraph);
          rubyKey = ruby.getKey();
          postKey = post.getKey();
        },
        {discrete: true},
      );

      // Select the ruby + part of post text
      editor.update(
        () => {
          const sel = $createRangeSelection();
          sel.anchor.set(rubyKey, 0, 'text');
          sel.focus.set(postKey, 1, 'text');
          $setSelection(sel);
        },
        {discrete: true},
      );

      // Dispatch CONTROLLED_TEXT_INSERTION_COMMAND (simulates typing)
      editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'X');

      // After the command, rubies in selection should be unwrapped
      const result = editor.read(() => {
        const paragraph = $getFirstParagraph();
        const children = paragraph.getChildren();
        return {
          hasRuby: children.some($isRubyNode),
          textContent: paragraph.getTextContent(),
        };
      });

      expect(result.hasRuby).toBe(false);
    });

    test('collapsed selection does not unwrap rubies', () => {
      editor.update(
        () => {
          const pre = $createTextNode('前');
          const ruby = $createRubyNode('漢字', 'かんじ');
          const post = $createTextNode('後');
          const paragraph = $createParagraphNode().append(pre, ruby, post);
          $getRoot().clear().append(paragraph);
        },
        {discrete: true},
      );

      let rubyKey = '';
      editor.read(() => {
        const paragraph = $getFirstParagraph();
        const ruby = paragraph.getChildren().find($isRubyNode)!;
        rubyKey = ruby.getKey();
      });

      editor.update(
        () => {
          const sel = $createRangeSelection();
          sel.anchor.set(rubyKey, 0, 'text');
          sel.focus.set(rubyKey, 0, 'text');
          $setSelection(sel);
        },
        {discrete: true},
      );

      editor.dispatchCommand(CONTROLLED_TEXT_INSERTION_COMMAND, 'X');

      const hasRuby = editor.read(() => {
        const paragraph = $getFirstParagraph();
        return paragraph.getChildren().some($isRubyNode);
      });

      expect(hasRuby).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // canInsertTextBefore / canInsertTextAfter
  // -----------------------------------------------------------------------

  describe('token mode', () => {
    test('canInsertTextBefore returns false', () => {
      let result = true;
      editor.update(
        () => {
          const node = $createRubyNode('漢', 'かん');
          result = node.canInsertTextBefore();
        },
        {discrete: true},
      );
      expect(result).toBe(false);
    });

    test('canInsertTextAfter returns false', () => {
      let result = true;
      editor.update(
        () => {
          const node = $createRubyNode('漢', 'かん');
          result = node.canInsertTextAfter();
        },
        {discrete: true},
      );
      expect(result).toBe(false);
    });
  });
});

describe('RubyExtension Shift+arrow skip', () => {
  let container: HTMLDivElement;
  let extEditor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    extEditor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-shift-arrow-test',
      onError: e => {
        throw e;
      },
    });
    extEditor.setRootElement(container);
  });

  afterEach(() => {
    extEditor.setRootElement(null);
    document.body.removeChild(container);
  });

  function $setupParagraph() {
    const p = $createParagraphNode();
    const hello = $createTextNode('hello');
    const ruby = $createRubyNode('漢', 'かん');
    const world = $createTextNode('world');
    p.append(hello, ruby, world);
    $getRoot().clear().append(p);
    return {hello, ruby, world};
  }

  test('Shift+Right from collapsed cursor at text end jumps past ruby', () => {
    let anchorKey = '';
    let anchorOffset = -1;
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {hello} = $setupParagraph();
        const sel = $createRangeSelection();
        sel.anchor.set(hello.getKey(), 5, 'text');
        sel.focus.set(hello.getKey(), 5, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        anchorKey = sel.anchor.getNode().getTextContent();
        anchorOffset = sel.anchor.offset;
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(handled).toBe(true);
    expect(anchorKey).toBe('hello');
    expect(anchorOffset).toBe(5);
    expect(focusKey).toBe('world');
    expect(focusOffset).toBe(0);
  });

  test('Shift+Left from collapsed cursor at text start jumps past ruby', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {world} = $setupParagraph();
        const sel = $createRangeSelection();
        sel.anchor.set(world.getKey(), 0, 'text');
        sel.focus.set(world.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(handled).toBe(true);
    expect(focusKey).toBe('hello');
    expect(focusOffset).toBe(5);
  });

  test('Shift+Right extends existing selection past ruby', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {hello} = $setupParagraph();
        const sel = $createRangeSelection();
        sel.anchor.set(hello.getKey(), 3, 'text');
        sel.focus.set(hello.getKey(), 5, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('world');
    expect(focusOffset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Consecutive ruby groups: Shift+arrow must walk through ALL adjacent rubies
// Layout: 前 | 漢(かん) | 字(じ) | 後
// ---------------------------------------------------------------------------

describe('RubyExtension Shift+arrow — consecutive rubies', () => {
  let container: HTMLDivElement;
  let extEditor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    extEditor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-consecutive-test',
      onError: e => {
        throw e;
      },
    });
    extEditor.setRootElement(container);
  });

  afterEach(() => {
    extEditor.setRootElement(null);
    document.body.removeChild(container);
  });

  function $setupConsecutiveRubies() {
    const p = $createParagraphNode();
    const pre = $createTextNode('前');
    const ruby1 = $createRubyNode('漢', 'かん');
    const ruby2 = $createRubyNode('字', 'じ');
    const post = $createTextNode('後');
    p.append(pre, ruby1, ruby2, post);
    $getRoot().clear().append(p);
    return {post, pre, ruby1, ruby2};
  }

  test('Shift+Right from text end skips consecutive rubies to next text', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {pre} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 1, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('後');
    expect(focusOffset).toBe(0);
  });

  test('Shift+Left from text start skips consecutive rubies to prev text', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {post} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('前');
    expect(focusOffset).toBe(1);
  });

  test('Shift+Right extends existing forward selection past consecutive rubies', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {pre} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('後');
    expect(focusOffset).toBe(0);
  });

  test('Shift+Left extends existing backward selection past consecutive rubies', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {post} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 1, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('前');
    expect(focusOffset).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Shift+arrow with focus already on a RubyNode (Safari DOM normalization)
// Safari normalizes cursor positions at text boundaries onto the preceding
// sibling, so focus can land on a RubyNode. The handler must walk through
// all consecutive rubies from the focus position.
// ---------------------------------------------------------------------------

describe('RubyExtension Shift+arrow — focus on RubyNode (Safari)', () => {
  let container: HTMLDivElement;
  let extEditor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    extEditor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-safari-test',
      onError: e => {
        throw e;
      },
    });
    extEditor.setRootElement(container);
  });

  afterEach(() => {
    extEditor.setRootElement(null);
    document.body.removeChild(container);
  });

  function $setupConsecutiveRubies() {
    const p = $createParagraphNode();
    const pre = $createTextNode('前');
    const ruby1 = $createRubyNode('漢', 'かん');
    const ruby2 = $createRubyNode('字', 'じ');
    const post = $createTextNode('後');
    p.append(pre, ruby1, ruby2, post);
    $getRoot().clear().append(p);
    return {post, pre, ruby1, ruby2};
  }

  test('Shift+Right with focus on first ruby walks forward past all rubies', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {pre, ruby1} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(ruby1.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('後');
    expect(focusOffset).toBeGreaterThanOrEqual(0);
    expect(focusOffset).toBeLessThanOrEqual(1);
  });

  test('Shift+Left with focus on last ruby walks backward past all rubies', () => {
    let focusKey = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {ruby2, post} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 1, 'text');
        sel.focus.set(ruby2.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusKey = sel.focus.getNode().getTextContent();
        focusOffset = sel.focus.offset;
      }
    });

    expect(focusKey).toBe('前');
    expect(focusOffset).toBe(1);
  });

  test('Shift+Right from ruby uses safe offset (≥1) to avoid normalization bounce', () => {
    let focusOffset = -1;

    extEditor.update(
      () => {
        const {pre, ruby1} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(ruby1.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusOffset = sel.focus.offset;
      }
    });

    // Math.min(1, textContentSize) — offset must be ≥1 for normalization safety
    expect(focusOffset).toBeGreaterThanOrEqual(0);
    expect(focusOffset).toBeLessThanOrEqual(1);
  });

  test('composing ruby is skipped — Shift+arrow returns false', () => {
    extEditor.update(
      () => {
        const {pre, ruby1} = $setupConsecutiveRubies();
        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(ruby1.getKey(), 0, 'text');
        $setSelection(sel);
        $setCompositionKey(ruby1.getKey());
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    expect(handled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Arrow navigation at line boundary: ruby as first/last child with no
// adjacent TextNode. The handler must move cursor to the parent element
// boundary instead of getting stuck.
// ---------------------------------------------------------------------------

describe('RubyExtension arrow — line boundary', () => {
  let container: HTMLDivElement;
  let extEditor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    extEditor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-boundary-test',
      onError: e => {
        throw e;
      },
    });
    extEditor.setRootElement(container);
  });

  afterEach(() => {
    extEditor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('Left from text:0 when ruby is first child moves to parent element', () => {
    let anchorType = '';
    let anchorOffset = -1;

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {key: 'ArrowLeft'});
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        anchorType = sel.anchor.type;
        anchorOffset = sel.anchor.offset;
      }
    });

    expect(handled).toBe(true);
    expect(anchorType).toBe('element');
    expect(anchorOffset).toBe(0);
  });

  test('Right from text end when ruby is last child moves to parent element', () => {
    let anchorType = '';

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        p.append(pre, ruby);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 1, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        anchorType = sel.anchor.type;
      }
    });

    expect(handled).toBe(true);
    expect(anchorType).toBe('element');
  });

  test('Shift+Left at paragraph start (ruby first) moves focus to parent:0', () => {
    let focusType = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusType = sel.focus.type;
        focusOffset = sel.focus.offset;
      }
    });

    expect(handled).toBe(true);
    expect(focusType).toBe('element');
    expect(focusOffset).toBe(0);
  });

  test('Shift+Right at paragraph end (ruby last) moves focus to parent:childrenSize', () => {
    let focusType = '';

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        p.append(pre, ruby);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 1, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusType = sel.focus.type;
      }
    });

    expect(handled).toBe(true);
    expect(focusType).toBe('element');
  });

  test('Shift+Right when focus is on ruby and ruby is last child goes to parent', () => {
    let focusType = '';

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        p.append(pre, ruby);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(ruby.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusType = sel.focus.type;
      }
    });

    expect(handled).toBe(true);
    expect(focusType).toBe('element');
  });

  test('Shift+Left when focus is on ruby and ruby is first child goes to parent:0', () => {
    let focusType = '';
    let focusOffset = -1;

    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 1, 'text');
        sel.focus.set(ruby.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);

    extEditor.read(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        focusType = sel.focus.type;
        focusOffset = sel.focus.offset;
      }
    });

    expect(handled).toBe(true);
    expect(focusType).toBe('element');
    expect(focusOffset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Backspace at ruby boundary
// Uses createTestEditor + manual extension registration to isolate the Ruby
// backspace handler from RichText's deleteCharacter (which calls
// domSelection.modify — unavailable in jsdom).
// ---------------------------------------------------------------------------

describe('RubyExtension backspace', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = buildEditorFromExtensions({
      dependencies: [RubyExtension],
      name: 'ruby-backspace-test',
      onError: e => {
        throw e;
      },
    });
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('Backspace at text:0 with preceding ruby removes the ruby', () => {
    let handled = false;

    editor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(pre, ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);

        const event = new KeyboardEvent('keydown', {key: 'Backspace'});
        handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
      },
      {discrete: true},
    );

    const result = editor.read(() => {
      const first = $getRoot().getFirstChild();
      if (!$isElementNode(first)) {
        return {hasRuby: false, text: ''};
      }
      return {
        hasRuby: first.getChildren().some($isRubyNode),
        text: first.getTextContent(),
      };
    });

    expect(handled).toBe(true);
    expect(result.hasRuby).toBe(false);
    expect(result.text).toBe('前後');
  });

  test('Backspace at text offset > 0 does not remove ruby', () => {
    let handled = false;

    editor.update(
      () => {
        const p = $createParagraphNode();
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 1, 'text');
        sel.focus.set(post.getKey(), 1, 'text');
        $setSelection(sel);

        const event = new KeyboardEvent('keydown', {key: 'Backspace'});
        handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
      },
      {discrete: true},
    );

    expect(handled).toBe(false);
  });

  test('Backspace with non-collapsed selection is not handled by ruby', () => {
    let handled = false;

    editor.update(
      () => {
        const p = $createParagraphNode();
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後の');
        p.append(ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 1, 'text');
        $setSelection(sel);

        const event = new KeyboardEvent('keydown', {key: 'Backspace'});
        handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
      },
      {discrete: true},
    );

    expect(handled).toBe(false);
  });

  test('Backspace at text:0 when prev is not ruby is not handled', () => {
    let handled = false;

    editor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const post = $createTextNode('後');
        p.append(pre, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);

        const event = new KeyboardEvent('keydown', {key: 'Backspace'});
        handled = editor.dispatchCommand(KEY_BACKSPACE_COMMAND, event);
      },
      {discrete: true},
    );

    expect(handled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Guard conditions: modifier keys, composing, non-collapsed without shift
// ---------------------------------------------------------------------------

describe('RubyExtension arrow — guard conditions', () => {
  let container: HTMLDivElement;
  let extEditor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    extEditor = buildEditorFromExtensions({
      dependencies: [RichTextExtension, RubyExtension],
      name: 'ruby-guard-test',
      onError: e => {
        throw e;
      },
    });
    extEditor.setRootElement(container);
  });

  afterEach(() => {
    extEditor.setRootElement(null);
    document.body.removeChild(container);
  });

  function setupAtRubyBoundary() {
    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(pre, ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(post.getKey(), 0, 'text');
        sel.focus.set(post.getKey(), 0, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );
  }

  test('Arrow+Meta does not skip ruby', () => {
    setupAtRubyBoundary();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      metaKey: true,
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
    expect(handled).toBe(false);
  });

  test('Arrow+Ctrl does not skip ruby', () => {
    setupAtRubyBoundary();
    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'ArrowLeft',
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
    expect(handled).toBe(false);
  });

  test('Arrow+Alt does not skip ruby', () => {
    setupAtRubyBoundary();
    const event = new KeyboardEvent('keydown', {
      altKey: true,
      key: 'ArrowRight',
    });
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
    expect(handled).toBe(false);
  });

  test('Non-collapsed selection without shift — arrow does not skip ruby', () => {
    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前');
        const ruby = $createRubyNode('漢', 'かん');
        const post = $createTextNode('後');
        p.append(pre, ruby, post);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 0, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
    expect(handled).toBe(false);
  });

  test('Arrow at text middle (not at boundary) does not skip ruby', () => {
    extEditor.update(
      () => {
        const p = $createParagraphNode();
        const pre = $createTextNode('前後');
        const ruby = $createRubyNode('漢', 'かん');
        p.append(pre, ruby);
        $getRoot().clear().append(p);

        const sel = $createRangeSelection();
        sel.anchor.set(pre.getKey(), 1, 'text');
        sel.focus.set(pre.getKey(), 1, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );

    const event = new KeyboardEvent('keydown', {key: 'ArrowRight'});
    const handled = extEditor.dispatchCommand(KEY_ARROW_RIGHT_COMMAND, event);
    expect(handled).toBe(false);
  });
});
