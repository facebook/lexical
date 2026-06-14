/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
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

describe('AriaLiveRegionExtension', () => {
  test('mounts a polite live region on document.body by default', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    editor.getEditorState();
    const regions = document.body.querySelectorAll('[aria-live]');
    expect(regions).toHaveLength(1);
    expect(regions[0].getAttribute('aria-live')).toBe('polite');
    expect(regions[0].getAttribute('aria-atomic')).toBe('true');
    expect(regions[0].getAttribute('role')).toBe('status');
  });

  test('disposes the live region when the editor is disposed', () => {
    {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [AriaLiveRegionExtension, RichTextExtension],
          name: '[root]',
        }),
      );
      editor.getEditorState();
      expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(1);
    }
    expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(0);
  });

  test('respects assertive politeness from config', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(AriaLiveRegionExtension, {politeness: 'assertive'}),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    editor.getEditorState();
    expect(
      document.body.querySelector('[aria-live]')!.getAttribute('aria-live'),
    ).toBe('assertive');
  });

  test('mounts onto a custom owner element', () => {
    const owner = document.createElement('div');
    document.body.appendChild(owner);
    try {
      using editor = buildEditorFromExtensions(
        defineExtension({
          dependencies: [
            configExtension(AriaLiveRegionExtension, {owner}),
            RichTextExtension,
          ],
          name: '[root]',
        }),
      );
      editor.getEditorState();
      expect(owner.querySelector('[aria-live]')).not.toBeNull();
      expect(document.body.children).not.toContain(
        owner.querySelector('[aria-live]'),
      );
    } finally {
      owner.remove();
    }
  });

  test('exposes the AriaLiveRegionHandle via dependency output', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const ref = getExtensionDependencyFromEditor(
      editor,
      AriaLiveRegionExtension,
    ).output;
    const region = document.body.querySelector('[aria-live]')!;
    ref.current.announce('hello');
    expect(region.textContent).toBe('hello');
  });
});
