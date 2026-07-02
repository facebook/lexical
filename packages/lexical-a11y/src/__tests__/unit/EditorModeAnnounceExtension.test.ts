/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {EditorModeAnnounceExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';
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

describe('EditorModeAnnounceExtension', () => {
  test('announces the default editable / read-only messages on the dependency sink', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [EditorModeAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.setEditable(false);
    expect(readLiveRegion()).toBe('Editor is read-only');
    editor.setEditable(true);
    expect(readLiveRegion()).toBe('Editor is editable');
  });

  test('respects message overrides from configExtension', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(EditorModeAnnounceExtension, {
            editable: 'Now editing',
            readOnly: 'Locked',
          }),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    editor.setEditable(false);
    expect(readLiveRegion()).toBe('Locked');
    editor.setEditable(true);
    expect(readLiveRegion()).toBe('Now editing');
  });

  test('reflects message signal changes at runtime', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [EditorModeAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {editable, readOnly} = getExtensionDependencyFromEditor(
      editor,
      EditorModeAnnounceExtension,
    ).output;
    editable.value = 'On';
    readOnly.value = 'Off';
    editor.setEditable(false);
    expect(readLiveRegion()).toBe('Off');
    editor.setEditable(true);
    expect(readLiveRegion()).toBe('On');
  });

  test('does not announce while disabled, and resumes when re-enabled', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [EditorModeAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      EditorModeAnnounceExtension,
    ).output;

    disabled.value = true;
    editor.setEditable(false);
    expect(readLiveRegion()).toBe('');

    disabled.value = false;
    editor.setEditable(true);
    expect(readLiveRegion()).toBe('Editor is editable');
  });
});
