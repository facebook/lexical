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
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

// The region is bound to the editor's root document, so a mounted root is
// required (unless an explicit `owner` is configured). The default root lives
// on `document.body`, so the region lands there.
function mountRoot(editor: LexicalEditorWithDispose): void {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
}

describe('AriaLiveRegionExtension', () => {
  test('mounts a polite live region on the root document by default', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
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
      mountRoot(editor);
      expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(1);
    }
    expect(document.body.querySelectorAll('[aria-live]')).toHaveLength(0);
  });

  test('mounts the region in the editor root element document (e.g. an iframe)', () => {
    // A real iframe stands in for an editor portaled into a separate document.
    // It must be a live iframe (not document.implementation.createHTMLDocument)
    // so its document has a defaultView window, which setRootElement requires.
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const frameDoc = frame.contentDocument!;
    onTestFinished(() => frame.remove());
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const root = frameDoc.createElement('div');
    root.contentEditable = 'true';
    frameDoc.body.appendChild(root);
    editor.setRootElement(root);

    // The region is created in the editor's own document, not the top-level one.
    expect(frameDoc.body.querySelectorAll('[aria-live]')).toHaveLength(1);
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
    mountRoot(editor);
    expect(
      document.body.querySelector('[aria-live]')!.getAttribute('aria-live'),
    ).toBe('assertive');
  });

  test('reflects politeness changes from the output signal at runtime', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const region = document.body.querySelector('[aria-live]')!;
    expect(region.getAttribute('aria-live')).toBe('polite');
    const {politeness} = getExtensionDependencyFromEditor(
      editor,
      AriaLiveRegionExtension,
    ).output;
    politeness.value = 'assertive';
    expect(region.getAttribute('aria-live')).toBe('assertive');
  });

  test('mounts onto a custom owner element regardless of the root', () => {
    const owner = document.createElement('div');
    document.body.appendChild(owner);
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(AriaLiveRegionExtension, {owner}),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    void editor;
    expect(owner.querySelector('[aria-live]')).not.toBeNull();
  });

  test('exposes a stable announce sink via dependency output', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);
    const {announce} = getExtensionDependencyFromEditor(
      editor,
      AriaLiveRegionExtension,
    ).output;
    const region = document.body.querySelector('[aria-live]')!;
    announce('hello');
    expect(region.textContent).toBe('hello');
  });

  test('does not replay the last message into a region re-created on remount', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const {announce} = getExtensionDependencyFromEditor(
      editor,
      AriaLiveRegionExtension,
    ).output;

    const root1 = document.createElement('div');
    root1.contentEditable = 'true';
    document.body.appendChild(root1);
    onTestFinished(() => root1.remove());
    editor.setRootElement(root1);

    announce('Saved');
    expect(document.body.querySelector('[aria-live]')!.textContent).toBe(
      'Saved',
    );

    // Remount the editor into a fresh root (unmount, then re-mount).
    editor.setRootElement(null);
    const root2 = document.createElement('div');
    root2.contentEditable = 'true';
    document.body.appendChild(root2);
    onTestFinished(() => root2.remove());
    editor.setRootElement(root2);

    // The freshly created region must start empty: replaying the buffered
    // 'Saved' would make the screen reader re-announce it with no user action.
    const region = document.body.querySelector('[aria-live]')!;
    expect(region.textContent).toBe('');

    // A genuinely new announcement still lands on the remounted region.
    announce('Loaded');
    expect(region.textContent).toBe('Loaded');
  });

  test('announcing before a region is mounted is a no-op, not buffered for mount', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, RichTextExtension],
        name: '[root]',
      }),
    );
    const {announce} = getExtensionDependencyFromEditor(
      editor,
      AriaLiveRegionExtension,
    ).output;

    // No root yet, so no region. Per the documented "no-op until a region is
    // mounted" contract, this announcement is dropped — it must NOT be buffered
    // and replayed onto the region when it later mounts.
    announce('Early');
    expect(document.body.querySelector('[aria-live]')).toBeNull();

    mountRoot(editor);
    const region = document.body.querySelector('[aria-live]')!;
    expect(region.textContent).toBe('');

    // A message announced after the region exists is delivered normally.
    announce('Ready');
    expect(region.textContent).toBe('Ready');
  });

  test('keeps a custom-owner region across editor root changes (no churn)', () => {
    const owner = document.createElement('div');
    document.body.appendChild(owner);
    onTestFinished(() => owner.remove());
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          configExtension(AriaLiveRegionExtension, {owner}),
          RichTextExtension,
        ],
        name: '[root]',
      }),
    );
    const region = owner.querySelector('[aria-live]');
    expect(region).not.toBeNull();

    // Mount then unmount a root; the owner-hosted region must not be torn down
    // and rebuilt, since its host (owner) never changed.
    const root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.appendChild(root);
    onTestFinished(() => root.remove());
    editor.setRootElement(root);
    editor.setRootElement(null);

    expect(owner.querySelector('[aria-live]')).toBe(region);
    expect(owner.querySelectorAll('[aria-live]')).toHaveLength(1);
  });
});
