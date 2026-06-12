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
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, REDO_COMMAND, UNDO_COMMAND} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

afterEach(() => {
  for (const region of Array.from(
    document.body.querySelectorAll('[aria-live]'),
  )) {
    region.remove();
  }
});

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
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Custom undo');
    editor.dispatchCommand(REDO_COMMAND, undefined);
    expect(readLiveRegion()).toBe('Custom redo');
  });

  test('re-registers when the message signals change at runtime', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
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

  test('keeps the history command chain intact (returns false)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [HistoryAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
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
