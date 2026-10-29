/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $setSelection,
  createEditor,
  type LexicalEditor,
  type NodeKey,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// While an editor records text edits (`_recordTextEdits`, set by the Yjs 14
// binding), Lexical records each change of a text node's text on the
// update's state, keyed by the previous node map: splices with their offsets,
// splits, merges, and any other setTextContent as a change of unknown
// offsets; the nodes the selection removes with what they hold; and every
// node inserted into or removed from an element's children
// (EditorState#_textEdits).

function setUp(
  record: boolean,
  texts: [string, number][] = [['abcdef', 0]],
  moves = false,
) {
  const editor = createEditor({
    onError: e => {
      throw e;
    },
  });
  editor._recordTextEdits = record;
  editor._recordNodeMoves = moves;
  const keys: NodeKey[] = [];
  editor.update(
    () => {
      const p = $createParagraphNode();
      for (const [text, format] of texts) {
        const node = $createTextNode(text).setFormat(format);
        keys.push(node.getKey());
        p.append(node);
      }
      $getRoot().append(p);
    },
    {discrete: true},
  );
  return {editor, keys};
}

/** The record of an update: its text entries, or all of them. */
function recorded(editor: LexicalEditor, run: () => void, all = false) {
  const prev = editor.getEditorState();
  editor.update(run, {discrete: true});
  const edits = editor.getEditorState()._textEdits;
  const log = edits === null ? null : edits.get(prev._nodeMap);
  return log === null || log === undefined || all
    ? log
    : log.filter(e => e[0] !== 'attach' && e[0] !== 'detach');
}

const $text = (key: NodeKey) => $getNodeByKey(key) as TextNode;

describe('the record of text edits', () => {
  test('a splice, with its offset, what it deletes and inserts, and the text before', () => {
    const {editor, keys} = setUp(true);
    expect(
      recorded(editor, () => {
        $text(keys[0]).spliceText(2, 1, 'XY');
      }),
    ).toEqual([['splice', keys[0], 2, 1, 'XY', 'abcdef']]);
  });

  test('typing and deleting through the selection, as splices', () => {
    const {editor, keys} = setUp(true);
    expect(
      recorded(editor, () => {
        $text(keys[0]).select(4, 4).insertText('t5z ');
        const s = $createRangeSelection();
        s.anchor.set(keys[0], 1, 'text');
        s.focus.set(keys[0], 3, 'text');
        $setSelection(s);
        s.removeText();
        $setSelection(null);
      }),
    ).toEqual([
      ['splice', keys[0], 4, 0, 't5z ', 'abcdef'],
      ['splice', keys[0], 1, 2, '', 'abcdt5z ef'],
    ]);
  });

  test('a delete across nodes: a splice of each end, the node between deleted, and the merge', () => {
    const {editor, keys} = setUp(true, [
      ['ab', 0],
      ['cd', 1],
      ['ef', 0],
    ]);
    expect(
      recorded(editor, () => {
        const s = $createRangeSelection();
        s.anchor.set(keys[0], 1, 'text');
        s.focus.set(keys[2], 1, 'text');
        $setSelection(s);
        s.removeText();
        $setSelection(null);
      }),
    ).toEqual([
      ['delete', keys[1]],
      ['splice', keys[0], 1, 1, '', 'ab'],
      ['splice', keys[2], 0, 1, '', 'ef'],
      ['merge', keys[0], keys[2], false, 'a', 'f'],
    ]);
  });

  test('a split, with where each part starts, and setTextContent', () => {
    const {editor, keys} = setUp(true);
    let parts: NodeKey[] = [];
    const log = recorded(editor, () => {
      parts = $text(keys[0])
        .splitText(2, 4)
        .map(n => n.getKey());
      $text(parts[1]).setTextContent('zz');
      // Formatted apart, so that the normalization keeps the parts.
      $text(parts[1]).setFormat(1);
    });
    expect(parts[0]).toBe(keys[0]);
    expect(log).toEqual([
      ['split', keys[0], parts, [0, 2, 4], 'abcdef'],
      ['set', parts[1], 'cd', 'zz'],
    ]);
  });

  test('nodes inserted and removed, where: a node swapped for another, a node the selection deletes', () => {
    const {editor, keys} = setUp(true, [
      ['ab', 0],
      ['cd', 1],
      ['ef', 0],
    ]);
    const p = editor.read(() => $text(keys[0]).getParentOrThrow().getKey());
    let made = '';
    expect(
      recorded(
        editor,
        () => {
          const node = $createTextNode('cd').setFormat(2);
          made = node.getKey();
          $text(keys[1]).replace(node);
        },
        true,
      ),
    ).toEqual([
      ['detach', keys[1], p],
      ['attach', made, p, keys[0], keys[2], 'cd'],
    ]);
    expect(
      recorded(
        editor,
        () => {
          const s = $createRangeSelection();
          s.anchor.set(keys[0], 2, 'text');
          s.focus.set(keys[2], 0, 'text');
          $setSelection(s);
          s.removeText();
          $setSelection(null);
        },
        true,
      ),
    ).toEqual([
      ['delete', made],
      ['detach', made, p],
      ['merge', keys[0], keys[2], false, 'ab', 'ef'],
      ['detach', keys[2], p],
    ]);
  });

  test('chained across the updates of one commit', () => {
    const {editor, keys} = setUp(true);
    const prev = editor.getEditorState();
    editor.update(() => {
      $text(keys[0]).spliceText(0, 0, 'x');
    });
    editor.update(() => {
      $text(keys[0]).spliceText(7, 0, 'y');
    });
    editor.read(() => {});
    expect(editor.getEditorState()._textEdits!.get(prev._nodeMap)).toEqual([
      ['splice', keys[0], 0, 0, 'x', 'abcdef'],
      ['splice', keys[0], 7, 0, 'y', 'xabcdef'],
    ]);
  });

  test('not made, and the same edits made, while the editor does not record text edits', () => {
    const run = (record: boolean, moves = false) => {
      const {editor, keys} = setUp(
        record,
        [
          ['ab', 0],
          ['cd', 1],
          ['ef', 0],
        ],
        moves,
      );
      editor.update(
        () => {
          $text(keys[1]).select(1, 1).insertText('Q');
          const s = $createRangeSelection();
          s.anchor.set(keys[0], 1, 'text');
          s.focus.set(keys[2], 1, 'text');
          $setSelection(s);
          s.removeText();
          $text(keys[0]).spliceText(0, 0, 'z');
          $text(keys[0]).splitText(1);
        },
        {discrete: true},
      );
      return editor;
    };
    const off = run(false);
    const on = run(true);
    expect(off.getEditorState()._textEdits).toBe(null);
    expect(off.getEditorState()._splitNodes).toBe(null);
    expect(off.getEditorState().toJSON()).toEqual(on.getEditorState().toJSON());
    expect(off.read(() => $getRoot().getTextContent())).toBe('zaf');
    // An editor that records moves only (the v1 Yjs binding) records no text
    // edits either.
    const moves = run(false, true);
    expect(moves.getEditorState()._textEdits).toBe(null);
    expect(moves.getEditorState()._splitNodes).toBe(null);
    expect(moves.getEditorState().toJSON()).toEqual(
      on.getEditorState().toJSON(),
    );
  });

  test('the two recordings are independent: moves, text edits, both, neither', () => {
    const run = (moves: boolean, edits: boolean) => {
      const {editor, keys} = setUp(
        edits,
        [
          ['ab', 0],
          ['cd', 1],
        ],
        moves,
      );
      const prev = editor.getEditorState();
      editor.update(
        () => {
          // A move: the second node moves before the first.
          $text(keys[0]).insertBefore($text(keys[1]));
          $text(keys[0]).spliceText(1, 0, 'x');
          $text(keys[0]).splitText(1);
        },
        {discrete: true},
      );
      const state = editor.getEditorState();
      // Node keys relative to the first node's, so that editors compare.
      const base = Number(keys[0]);
      const rel = (x: unknown): unknown =>
        x === null || x === undefined
          ? null
          : JSON.parse(
              JSON.stringify(x instanceof Map || x instanceof Set ? [...x] : x),
              (_k, v) =>
                typeof v === 'string' && /^[0-9]+$/.test(v)
                  ? `n${Number(v) - base}`
                  : v,
            );
      return {
        json: state.toJSON(),
        log: rel(state._textEdits && state._textEdits.get(prev._nodeMap)) as
          | [string][]
          | null,
        moved: rel(state._movedNodes && state._movedNodes.get(prev._nodeMap)),
        splits: rel(state._splitNodes && state._splitNodes.get(prev._nodeMap)),
      };
    };
    const neither = run(false, false);
    const moves = run(true, false);
    const edits = run(false, true);
    const both = run(true, true);
    for (const r of [neither, moves, edits]) {
      expect(r.json).toEqual(both.json);
    }
    // Moves are recorded the same with or without text edits.
    expect(moves.moved).toEqual(both.moved);
    expect(moves.moved).toContain('n1');
    expect(neither.moved).toBe(null);
    expect(edits.moved).toBe(null);
    // Text edits are recorded the same with or without moves.
    expect(edits.log).toEqual(both.log);
    expect(edits.splits).toEqual(both.splits);
    expect(edits.log!.map(e => e[0]).slice(0, 4)).toEqual([
      'detach',
      'attach',
      'splice',
      'split',
    ]);
    for (const r of [neither, moves]) {
      expect(r.log).toBe(null);
      expect(r.splits).toBe(null);
    }
  });
});
