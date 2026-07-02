/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {HistoryAnnounceExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, REDO_COMMAND, UNDO_COMMAND} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

// The live region follows the editor's root document, so a mounted root is
// required for it to exist.
function mountRoot(editor: LexicalEditorWithDispose): void {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
}

function readLiveRegion(): string {
  return document.body.querySelector('[aria-live]')!.textContent ?? '';
}

describe('HistoryAnnounceExtension', () => {
  test('announces the default Undone / Redone messages on the dependency sink', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Undone');
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Redone');
  });

  test('respects message overrides from configExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(HistoryAnnounceExtension, {
            redone: 'Custom redo',
            undone: 'Custom undo',
          }),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Custom undo');
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Custom redo');
  });

  test('reflects message signal changes at runtime', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {undone, redone} = getExtensionDependencyFromEditor(
      editor,
      HistoryAnnounceExtension,
    ).output;
    undone.value = 'Reverted';
    redone.value = 'Restored';
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Reverted');
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Restored');
  });

  test('does not announce while disabled, and resumes when re-enabled', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      HistoryAnnounceExtension,
    ).output;

    disabled.value = true;
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('');

    disabled.value = false;
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Redone');
  });

  test('keeps the history command chain intact (returns false)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    // A handler registered after HistoryAnnounce at the same priority should
    // still receive the UNDO_COMMAND because HistoryAnnounce returns false.
    let reached = false;
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        reached = true;
        return false;
      },
      1,
    );
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(reached).toBe(true);
  });
});
