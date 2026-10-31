/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

// A text node after a plain text node of another format: the first match in
// it is found after the previous node's text, as the previous node's own
// transform checks it (#9637). Typing a space inside "dogcat" between bold
// "x" and bold "y" made "dog" an entity (a match at the start of the node's
// own text), which the transform of "x" undid ("xdog" has no "dog"), and so
// on until Lexical gave up ("One or more transforms are endlessly
// triggering additional transforms") and the update was lost.

import {registerLexicalTextEntity} from '@lexical/text';
import {
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  createEditor,
  type ElementNode,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

class KeywordNode extends TextNode {
  $config() {
    return this.config('test-context-keyword', {extends: TextNode});
  }
  isTextEntity(): true {
    return true;
  }
  canInsertTextBefore(): boolean {
    return false;
  }
  canInsertTextAfter(): boolean {
    return false;
  }
}

// "cat" or "dog" with no letter next to it.
const KEYWORD = /(^|[^a-z#])(cat|dog)(?=[^a-z]|$)/;

function editorWith(texts: string[]) {
  const editor = createEditor({
    nodes: [KeywordNode],
    onError: e => {
      throw e;
    },
  });
  registerLexicalTextEntity(
    editor,
    text => {
      const m = KEYWORD.exec(text);
      return m === null
        ? null
        : {
            end: m.index + m[1].length + m[2].length,
            start: m.index + m[1].length,
          };
    },
    KeywordNode,
    node => $create(KeywordNode).setTextContent(node.getTextContent()),
  );
  editor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append(
          ...texts.map(t => {
            const node = $createTextNode(t.replace(/^\*/, ''));
            return t.startsWith('*') ? node.toggleFormat('bold') : node;
          }),
        ),
      );
    },
    {discrete: true},
  );
  return editor;
}

/** Type `typed` at `offset` in child `index`: the text and the entities. */
function typeInto(
  texts: string[],
  index: number,
  offset: number,
  typed: string,
): {text: string; entities: string[]} {
  const editor = editorWith(texts);
  editor.update(
    () => {
      const node = (
        $getRoot().getFirstChildOrThrow() as ElementNode
      ).getChildAtIndex(index) as TextNode;
      const selection = $createRangeSelection();
      selection.anchor.set(node.getKey(), offset, 'text');
      selection.focus.set(node.getKey(), offset, 'text');
      $setSelection(selection);
      selection.insertText(typed);
    },
    {discrete: true},
  );
  return editor.getEditorState().read(() => ({
    entities: $getRoot()
      .getAllTextNodes()
      .filter(n => n instanceof KeywordNode)
      .map(n => n.getTextContent()),
    text: $getRoot().getTextContent(),
  }));
}

describe('registerLexicalTextEntity after a plain text node of another format', () => {
  test('bold "x" | "dogcat" | bold "y", a space after "dog": no entity', () => {
    expect(typeInto(['*x', 'dogcat', '*y'], 1, 3, ' ')).toEqual({
      entities: [],
      text: 'xdog caty',
    });
  });
  test('bold "x" | "dogcat" | bold "dog", an emoji after "dog": no entity', () => {
    expect(typeInto(['*x', 'dogcat', '*dog'], 1, 3, '😀')).toEqual({
      entities: [],
      text: 'xdog😀catdog',
    });
  });
  test('bold " " | "dogcat" | bold "y", a space after "dog": "dog" is an entity', () => {
    expect(typeInto(['* ', 'dogcat', '*y'], 1, 3, ' ')).toEqual({
      entities: ['dog'],
      text: ' dog caty',
    });
  });
  test('bold "x" | "a dogcat" | bold "y", a space after "dog": "dog" is an entity', () => {
    expect(typeInto(['*x', 'a dogcat', '*y'], 1, 5, ' ')).toEqual({
      entities: ['dog'],
      text: 'xa dog caty',
    });
  });
  test('"dogcat" | bold "y", a space after "dog": "dog" is an entity', () => {
    expect(typeInto(['dogcat', '*y'], 0, 3, ' ')).toEqual({
      entities: ['dog'],
      text: 'dog caty',
    });
  });

  // Random texts of keywords and other pieces between two bold ones, and a
  // character typed anywhere in the middle one: the transforms settle.
  test('random texts between formatted neighbours settle', () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const pick = (list: string[]) => list[Math.floor(random() * list.length)];
    const pieces = (list: string[], n: number) =>
      Array.from({length: n}, () => pick(list)).join('');
    const MIDDLE = ['dog', 'cat', 'do', 'g', ' ', 'x'];
    const SIDE = ['x', 'y', ' ', 'dog', 'a '];
    let thrown = 0;
    for (let i = 0; i < 2000; i++) {
      const middle = pieces(MIDDLE, 1 + Math.floor(random() * 3));
      const texts = [
        '*' + pieces(SIDE, 1 + Math.floor(random() * 2)),
        middle,
        '*' + pieces(SIDE, 1 + Math.floor(random() * 2)),
      ];
      const offset = Math.floor(random() * (middle.length + 1));
      const typed = pick([' ', 'x', '😀']);
      try {
        typeInto(texts, 1, offset, typed);
      } catch (error) {
        thrown++;
        expect.fail(`${JSON.stringify({offset, texts, typed})}: ${error}`);
      }
    }
    expect(thrown).toBe(0);
  });
});
