/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: null,
      dependencies: [HistoryExtension],
      name: '[clear-editor-can-commands]',
    }),
  );
}

/** Records the latest payload seen for each CAN_* command. */
function trackCanCommands(editor: LexicalEditor) {
  const seen = {canRedo: false, canUndo: false};
  const listen = (
    command: LexicalCommand<boolean>,
    key: 'canUndo' | 'canRedo',
  ) =>
    editor.registerCommand(
      command,
      payload => {
        seen[key] = payload;
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  listen(CAN_UNDO_COMMAND, 'canUndo');
  listen(CAN_REDO_COMMAND, 'canRedo');
  return seen;
}

function seedUndoableEdit(editor: LexicalEditor) {
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('one')));
    },
    {discrete: true},
  );
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('two')));
    },
    {discrete: true},
  );
  editor.read(() => {});
}

describe('clearing the editor resets undo availability', () => {
  test('CLEAR_EDITOR_COMMAND reports that undo is no longer available', () => {
    using editor = buildEditor();
    const seen = trackCanCommands(editor);

    seedUndoableEdit(editor);
    expect(seen.canUndo).toBe(true);

    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    editor.read(() => {});

    expect(seen.canUndo).toBe(false);
    expect(seen.canRedo).toBe(false);
  });

  test('CLEAR_HISTORY_COMMAND does the same', () => {
    using editor = buildEditor();
    const seen = trackCanCommands(editor);

    seedUndoableEdit(editor);
    expect(seen.canUndo).toBe(true);

    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    editor.read(() => {});

    expect(seen.canUndo).toBe(false);
    expect(seen.canRedo).toBe(false);
  });
});
