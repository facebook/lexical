/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  DecoratorNode,
  type LexicalEditor,
} from 'lexical';
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  type MockInstance,
  onTestFinished,
  test,
  vi,
} from 'vitest';

// Regression tests for #8766.
//
// On Linux/X11, browsers propagate any non-collapsed DOM selection made
// during a user gesture to the PRIMARY selection (the middle-click paste
// buffer). `RangeSelection.deleteCharacter` used to extend the DOM selection
// with the native `Selection.modify('extend', …, 'character')` before
// removing text, overwriting PRIMARY on every Backspace/Delete. It now
// measures a collapsed native caret move (which never takes PRIMARY
// ownership) and builds the deletion range in the Lexical model only.
//
// These tests run in a real browser (see the `browser` project in
// vitest.config.mts) because the contract under test is engine behavior:
// the spies watch the engine's real Selection API to prove that character
// deletion never creates a non-collapsed DOM selection — the invariant that
// keeps PRIMARY intact — and the differential tests compare deletion
// boundaries against the boundaries the engine itself produces.

// An inline, non-editable decorator with real layout, standing in for the
// playground's inline ImageNode in the deleteLine/deleteWord scenarios.
class TestInlineDecoratorNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_inline_decorator', {extends: DecoratorNode});
  }
  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.style.display = 'inline-block';
    span.style.width = '24px';
    span.style.height = '24px';
    return span;
  }
  updateDOM(): boolean {
    return false;
  }
  isInline(): boolean {
    return true;
  }
  decorate(): null {
    return null;
  }
}

function $createTestInlineDecoratorNode(): TestInlineDecoratorNode {
  return $create(TestInlineDecoratorNode);
}

function mountEditor($initialEditorState: () => void): LexicalEditor {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState,
      dependencies: [RichTextExtension],
      name: '[8766-browser]',
      nodes: [TestInlineDecoratorNode],
    }),
  );
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  return editor;
}

function $initWithText(
  text: string,
  offset: number,
  mode?: 'token' | 'segmented',
): void {
  const paragraph = $createParagraphNode();
  const textNode = $createTextNode(text);
  if (mode) {
    textNode.setMode(mode);
  }
  paragraph.append(textNode);
  $getRoot().clear().append(paragraph);
  textNode.select(offset, offset);
}

function deleteCharacter(editor: LexicalEditor, isBackward: boolean): void {
  editor.update(
    () => {
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Expected RangeSelection');
      selection.deleteCharacter(isBackward);
    },
    {discrete: true},
  );
}

function textContent(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent());
}

/**
 * Ask the engine itself where one native 'character' extension from `offset`
 * lands, using a scratch contenteditable outside of Lexical. This is the
 * operation the collapsed-move measurement replaces, so it defines the
 * expected deletion boundary for whole-grapheme cases.
 */
function nativeCharacterExtension(
  text: string,
  offset: number,
  isBackward: boolean,
): number {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  document.body.appendChild(div);
  onTestFinished(() => {
    document.body.removeChild(div);
  });
  const textNode = document.createTextNode(text);
  div.appendChild(textNode);
  const domSelection = window.getSelection()!;
  domSelection.setBaseAndExtent(textNode, offset, textNode, offset);
  domSelection.modify(
    'extend',
    isBackward ? 'backward' : 'forward',
    'character',
  );
  const boundary =
    domSelection.focusNode === textNode
      ? domSelection.focusOffset
      : isBackward
        ? 0
        : text.length;
  // Clear immediately (not at test end): a selection left in the scratch
  // element would interfere with the editor deletion measured next.
  domSelection.removeAllRanges();
  return boundary;
}

describe('deleteCharacter never creates a non-collapsed DOM selection (#8766)', () => {
  let modifySpy: MockInstance<Selection['modify']>;
  let setBaseAndExtentSpy: MockInstance<Selection['setBaseAndExtent']>;
  let extendSpy: MockInstance<Selection['extend']>;
  let addRangeSpy: MockInstance<Selection['addRange']>;

  beforeEach(() => {
    // Wrap (not replace) the engine's real Selection API: calls delegate to
    // the native implementations, and the spies record every way a
    // non-collapsed DOM selection could be created.
    modifySpy = vi.spyOn(Selection.prototype, 'modify');
    setBaseAndExtentSpy = vi.spyOn(Selection.prototype, 'setBaseAndExtent');
    extendSpy = vi.spyOn(Selection.prototype, 'extend');
    addRangeSpy = vi.spyOn(Selection.prototype, 'addRange');
  });

  afterEach(() => {
    modifySpy.mockRestore();
    setBaseAndExtentSpy.mockRestore();
    extendSpy.mockRestore();
    addRangeSpy.mockRestore();
  });

  /**
   * The PRIMARY-safety invariant: only non-collapsed DOM selections take
   * PRIMARY ownership on X11, so deletion must never create one — no
   * modify('extend'), no ranged setBaseAndExtent, no Selection.extend, no
   * non-collapsed addRange.
   */
  function expectOnlyCollapsedDOMSelections() {
    for (const [alter] of modifySpy.mock.calls) {
      expect(alter).not.toBe('extend');
    }
    for (const [
      anchorNode,
      anchorOffset,
      focusNode,
      focusOffset,
    ] of setBaseAndExtentSpy.mock.calls) {
      expect(anchorNode).toBe(focusNode);
      expect(anchorOffset).toBe(focusOffset);
    }
    expect(extendSpy).not.toHaveBeenCalled();
    for (const [range] of addRangeSpy.mock.calls) {
      expect(range.collapsed).toBe(true);
    }
  }

  test('backspace removes one character with only collapsed DOM selections', () => {
    const editor = mountEditor(() => $initWithText('hello', 5));
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('hell');
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('hel');
    expectOnlyCollapsedDOMSelections();
  });

  test('forward delete removes one character with only collapsed DOM selections', () => {
    const editor = mountEditor(() => $initWithText('hello', 0));
    deleteCharacter(editor, false);
    expect(textContent(editor)).toBe('ello');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace deletes a combining mark one code unit at a time', () => {
    // "n" + combining tilde (U+0303) in decomposed form (2 code units).
    // Lexical does not normalize, so the combining mark is removed first,
    // then the base letter.
    const nTilde = 'n\u0303';
    const editor = mountEditor(() => $initWithText(nTilde, nTilde.length));
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('n');
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace on RTL (Hebrew) text deletes logically, one letter at a time', () => {
    // "שלום" (shin, lamed, vav, mem) — four single-code-unit RTL letters.
    // Backspace removes the logically-last letter regardless of the RTL
    // visual order.
    const shalom = 'שלום';
    const editor = mountEditor(() => $initWithText(shalom, shalom.length));
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('שלו');
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('של');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace on RTL (Arabic) text deletes a combining mark then the base', () => {
    // Arabic lam (U+0644) + shadda combining mark (U+0651). The combining
    // mark is a separate code point that is removed first.
    const lamShadda = 'لّ';
    const editor = mountEditor(() =>
      $initWithText(lamShadda, lamShadda.length),
    );
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('ل');
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace at the end of mixed bidi text deletes the logically-last character', () => {
    // LTR "abc" followed by RTL "אבג" (alef, bet, gimel). The caret sits at
    // the end (logical offset 6); Backspace deletes the logically-last
    // character (gimel), not the visually-adjacent one.
    const mixed = 'abcאבג';
    const editor = mountEditor(() => $initWithText(mixed, mixed.length));
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('abcאב');
    expectOnlyCollapsedDOMSelections();
  });

  test('forward delete at the start of mixed bidi text deletes the logically-first character', () => {
    // Caret at logical offset 0 of RTL "אבג" + LTR "abc"; Delete removes the
    // logically-first character (alef).
    const mixed = 'אבגabc';
    const editor = mountEditor(() => $initWithText(mixed, 0));
    deleteCharacter(editor, false);
    expect(textContent(editor)).toBe('בגabc');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace removes a whole token node with only collapsed DOM selections', () => {
    // Token nodes are atomic: a single Backspace removes the entire node.
    const editor = mountEditor(() => $initWithText('hello world', 11, 'token'));
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace on a segmented node removes the last segment with only collapsed DOM selections', () => {
    // Segmented nodes delete a whole whitespace-delimited segment at a time.
    const editor = mountEditor(() =>
      $initWithText('hello world', 11, 'segmented'),
    );
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('hello');
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace after a linebreak deletes it with only collapsed DOM selections', () => {
    // Caret at a text node boundary: the collapsed move lands past the
    // linebreak and the measured range brackets it, so removeText deletes
    // the LineBreakNode without any non-collapsed DOM selection. (This was
    // previously a native modify('extend') fallback that clobbered PRIMARY.)
    const editor = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const before = $createTextNode('one');
      const linebreak = $createLineBreakNode();
      const after = $createTextNode('two');
      paragraph.append(before, linebreak, after);
      $getRoot().clear().append(paragraph);
      after.select(0, 0);
    });
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('onetwo');
    expectOnlyCollapsedDOMSelections();
  });

  test('backspace across a format-run boundary deletes from the previous run', () => {
    // Caret at the start of a bold run: the collapsed move lands inside the
    // preceding plain run and the last character of that run is deleted.
    // (Also previously a native modify('extend') fallback.)
    const editor = mountEditor(() => {
      const paragraph = $createParagraphNode();
      const plain = $createTextNode('ab');
      const bold = $createTextNode('cd');
      bold.toggleFormat('bold');
      paragraph.append(plain, bold);
      $getRoot().clear().append(paragraph);
      bold.select(0, 0);
    });
    deleteCharacter(editor, true);
    expect(textContent(editor)).toBe('acd');
    expectOnlyCollapsedDOMSelections();
  });

  describe('deletes the same whole grapheme the engine would select natively', () => {
    // For emoji-class graphemes deleteCharacter removes the whole cluster,
    // so the deleted span must match exactly what one native
    // Selection.modify('extend', 'backward', 'character') selects in this
    // engine. If the engine's move and extend boundaries ever disagree for
    // these clusters, this fails here rather than in production.
    [
      {description: 'astral emoji (thumbs up)', text: 'a👍'},
      {
        description: 'ZWJ family emoji',
        text: 'x👩‍👩‍👧‍👦',
      },
      {
        description: 'emoji with skin-tone modifier',
        text: 'x👏🏽',
      },
      {
        description: 'BMP emoji with variation selector (heart)',
        text: 'x❤️',
      },
      {description: 'keycap emoji', text: 'x#️⃣'},
      {
        description: 'flag emoji with ZWJ and variation selector',
        text: 'x🏳️‍🌈',
      },
    ].forEach(({description, text}) => {
      test(description, () => {
        const nativeBoundary = nativeCharacterExtension(
          text,
          text.length,
          true,
        );
        // Sanity: the engine treats the emoji as a single cluster.
        expect(nativeBoundary).toBeGreaterThan(0);
        expect(nativeBoundary).toBeLessThan(text.length);
        // The scratch measurement above intentionally used modify('extend');
        // reset the spies so the invariant below only sees the deletion.
        modifySpy.mockClear();
        setBaseAndExtentSpy.mockClear();
        extendSpy.mockClear();
        addRangeSpy.mockClear();

        const editor = mountEditor(() => $initWithText(text, text.length));
        deleteCharacter(editor, true);
        expect(textContent(editor)).toBe(text.slice(0, nativeBoundary));
        expectOnlyCollapsedDOMSelections();
      });
    });
  });

  describe('deleteLine and deleteWord around inline decorators', () => {
    // Mirrors the "can delete line which starts with element forwards"
    // Selection e2e scenario (macOS-only binding in e2e, so covered here for
    // all platforms). The decorator/block pre-pass hops the model focus past
    // the inline decorator — exactly where native caret movement gets stuck —
    // and the native measurement must continue from that hopped focus, not
    // from the anchor.
    function $initDecoratorLine(): void {
      const p1 = $createParagraphNode();
      p1.append($createTextNode('One'));
      const p2 = $createParagraphNode();
      p2.append($createTestInlineDecoratorNode(), $createTextNode('Two'));
      const p3 = $createParagraphNode();
      $getRoot().clear().append(p1, p2, p3);
      // Caret before the decorator, as an element point on the paragraph.
      p2.select(0, 0);
    }

    test('forward deleteLine at a caret before an inline decorator deletes the rest of the line', () => {
      const editor = mountEditor($initDecoratorLine);
      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected RangeSelection');
          selection.deleteLine(false);
        },
        {discrete: true},
      );
      editor.read(() => {
        const root = $getRoot();
        expect(root.getChildrenSize()).toBe(3);
        expect(root.getChildAtIndex(0)!.getTextContent()).toBe('One');
        const p2 = root.getChildAtIndex(1)!;
        assert($isElementNode(p2), 'Expected ElementNode');
        // The decorator and the trailing text are both deleted.
        expect(p2.getChildrenSize()).toBe(0);
        expect(root.getChildAtIndex(2)!.getTextContent()).toBe('');
      });
      expectOnlyCollapsedDOMSelections();
    });

    test('forward deleteWord at a caret before an inline decorator deletes it', () => {
      const editor = mountEditor($initDecoratorLine);
      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected RangeSelection');
          selection.deleteWord(false);
        },
        {discrete: true},
      );
      editor.read(() => {
        const p2 = $getRoot().getChildAtIndex(1)!;
        assert($isElementNode(p2), 'Expected ElementNode');
        // The decorator is deleted as a unit; the text stays.
        expect(p2.getChildrenSize()).toBe(1);
        expect(p2.getTextContent()).toBe('Two');
      });
      expectOnlyCollapsedDOMSelections();
    });
  });
});
