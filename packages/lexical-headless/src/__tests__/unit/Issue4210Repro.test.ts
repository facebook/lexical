/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {createHeadlessEditor} from '../..';

function $setUp(text: string, offset: number): void {
  const paragraph = $createParagraphNode();
  const textNode = $createTextNode(text);
  paragraph.append(textNode);
  $getRoot().clear().append(paragraph);
  textNode.select(offset, offset);
}

function buildEditor(text: string, offset: number): LexicalEditor {
  const editor = createHeadlessEditor({
    namespace: 'Issue4210Repro',
    onError: error => {
      throw error;
    },
  });
  editor.update(() => $setUp(text, offset), {discrete: true});
  return editor;
}

function $deleteCharacter(isBackward: boolean): void {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    selection.deleteCharacter(isBackward);
  }
}

describe('deleteCharacter in a headless editor (#4210)', () => {
  it('deletes the character before a collapsed caret', () => {
    const editor = buildEditor('hello', 5);
    editor.update(() => $deleteCharacter(true), {discrete: true});
    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent()),
    ).toBe('hell');
  });

  it('deletes the character after a collapsed caret', () => {
    const editor = buildEditor('hello', 0);
    editor.update(() => $deleteCharacter(false), {discrete: true});
    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent()),
    ).toBe('ello');
  });

  it('deletes a whole code point rather than half a surrogate pair', () => {
    // '🙂' is two UTF-16 code units, so extending by one unit and deleting it
    // would leave a lone surrogate behind.
    const editor = buildEditor('a🙂', 3);
    editor.update(() => $deleteCharacter(true), {discrete: true});
    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent()),
    ).toBe('a');
  });

  it('leaves the text alone at the start of the only block', () => {
    const editor = buildEditor('hello', 0);
    editor.update(() => $deleteCharacter(true), {discrete: true});
    expect(
      editor.getEditorState().read(() => $getRoot().getTextContent()),
    ).toBe('hello');
  });

  it('does not throw for word deletion, which has no model equivalent', () => {
    const editor = buildEditor('hello world', 11);
    expect(() =>
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.deleteWord(true);
          }
        },
        {discrete: true},
      ),
    ).not.toThrow();
  });
});
