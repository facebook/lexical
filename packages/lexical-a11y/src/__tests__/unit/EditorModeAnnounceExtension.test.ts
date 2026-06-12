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
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';
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

describe('EditorModeAnnounceExtension', () => {
  test('announces the default editable / read-only messages on the dependency sink', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [EditorModeAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
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
    editor.setEditable(false);
    expect(readLiveRegion()).toBe('Locked');
    editor.setEditable(true);
    expect(readLiveRegion()).toBe('Now editing');
  });

  test('re-registers when the message signals change at runtime', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [EditorModeAnnounceExtension, RichTextExtension],
        name: '[root]',
      }),
    );
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
});
