/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createCodeNode, $isCodeNode} from '@lexical/code-core';
import {CodePrismExtension} from '@lexical/code-prism';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTextNode,
  $getRoot,
  $getState,
  $setState,
  createState,
  defineExtension,
  type ElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const noteState = createState('note', {
  parse: (value: unknown) => (typeof value === 'string' ? value : ''),
});

function setup() {
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: [RichTextExtension, CodePrismExtension],
      name: 'retokenize-node-state-prism',
      onError: (error: Error) => {
        throw error;
      },
    }),
  );
  editor.update(
    () => {
      $getRoot().append(
        $createCodeNode('javascript').append(
          $createTextNode('const a = fetch(t45z); // note'),
        ),
      );
    },
    {discrete: true},
  );
  // Once highlighting has made its tokens: an annotation on the word.
  editor.update(
    () => {
      for (const token of $getRoot().getAllTextNodes()) {
        const at = token.getTextContent().indexOf('t45z');
        if (at >= 0) {
          const parts = token.splitText(at, at + 4);
          $setState(parts[at === 0 ? 0 : 1], noteState, 'n1');
        }
      }
    },
    {discrete: true},
  );
  return editor;
}

/** The code, and per character its note or '.' */
const notes = (editor: ReturnType<typeof setup>) =>
  editor.read(() => {
    const code = $getRoot().getFirstChildOrThrow() as ElementNode;
    expect($isCodeNode(code)).toBe(true);
    let text = '';
    let marks = '';
    for (const node of code.getChildren()) {
      const t = node.getTextContent();
      text += t;
      const note = $getState(node, noteState);
      marks += (note === '' ? '.' : note[1]).repeat(t.length);
    }
    return [text, marks];
  });

/** The token holding `text`, at character `offset` of the code. */
function $tokenAt(offset: number): [TextNode, number] {
  let at = 0;
  for (const node of $getRoot().getAllTextNodes()) {
    const size = node.getTextContentSize();
    if (offset < at + size) {
      return [node, offset - at];
    }
    at += size;
  }
  throw new Error('no token');
}

describe('a retokenized code block keeps the NodeState of every character (Prism)', () => {
  test('the annotated word is unchanged', () => {
    using editor = setup();
    expect(notes(editor)).toEqual([
      'const a = fetch(t45z); // note',
      '................1111..........',
    ]);
  });

  test('edits on both sides of the word, in one update', () => {
    using editor = setup();
    editor.update(
      () => {
        const [after, at] = $tokenAt(23);
        after.spliceText(at, 0, 'x', false);
        const [before, bt] = $tokenAt(6);
        before.spliceText(bt, 0, 'b', false);
      },
      {discrete: true},
    );
    expect(notes(editor)).toEqual([
      'const ba = fetch(t45z); x// note',
      '.................1111...........',
    ]);
  });

  test('a quote typed before the word turns it into part of a string token', () => {
    using editor = setup();
    editor.update(
      () => {
        // Right after "(", outside the annotated word.
        const [before, bt] = $tokenAt(15);
        before.spliceText(bt + 1, 0, "'", false);
      },
      {discrete: true},
    );
    expect(notes(editor)).toEqual([
      "const a = fetch('t45z); // note",
      '.................1111..........',
    ]);
  });

  test('part of a token annotated', () => {
    using editor = setup();
    editor.update(
      () => {
        const [token, at] = $tokenAt(10);
        const [, right] = token.splitText(at + 2);
        $setState(right, noteState, 'n2');
      },
      {discrete: true},
    );
    // The highlighter would merge "fe" and "tch" back into one token.
    expect(notes(editor)).toEqual([
      'const a = fetch(t45z); // note',
      '............222.1111..........',
    ]);
  });
});
