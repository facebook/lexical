/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {describe, expect, test} from 'vitest';

// These tests intentionally avoid the jsdom polyfills in vitest.setup.mts and
// instead assert against a real layout/selection engine. The same assertions
// would require stubbing Range.getBoundingClientRect and the Selection API
// under jsdom (see vitest.setup.mts), which is exactly the kind of mocking the
// browser project lets us drop.

function $prepopulate(): void {
  $getRoot().append(
    $createParagraphNode().append($createTextNode('Hello from a real browser')),
  );
}

// `buildEditorFromExtensions` returns a Disposable editor, so callers use
// `using editor = setUpEditor()` and the editor tears itself down at the end of
// the block. The contentEditable is reachable via editor.getRootElement(), and
// document.body is reset between tests, so nothing else needs cleaning up.
function setUpEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: $prepopulate,
      afterRegistration(editor, _config, _state) {
        const rootElement = document.createElement('div');
        rootElement.contentEditable = 'true';
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        return () => {
          document.body.removeChild(rootElement);
        };
      },
      dependencies: [RichTextExtension],
      name: '[root]',
    }),
  );
}

describe('buildEditorFromExtensions (browser)', () => {
  test('reconciles the initial editor state into the real DOM', () => {
    using editor = setUpEditor();
    const contentEditable = editor.getRootElement()!;
    expect(contentEditable.querySelector('p')).not.toBeNull();
    expect(contentEditable.textContent).toBe('Hello from a real browser');
    // The browser honors contentEditable; jsdom does not keep this in sync
    // with the attribute without the override in vitest.setup.mts.
    expect(contentEditable.isContentEditable).toBe(true);
  });

  test('Range.getBoundingClientRect reports real layout', () => {
    using editor = setUpEditor();
    const textSpan = editor
      .getRootElement()!
      .querySelector('[data-lexical-text="true"]')!;
    const range = document.createRange();
    range.selectNodeContents(textSpan);
    const rect = range.getBoundingClientRect();
    // A real engine lays out the glyphs so the selected text has a non-zero
    // footprint. jsdom has no layout and the setup file stubs this to zeros.
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });

  test('the native Selection API round-trips a real range', () => {
    using editor = setUpEditor();
    // Lexical renders text inside a <span data-lexical-text="true">, so the
    // actual Text node is its first child.
    const textNode = editor
      .getRootElement()!
      .querySelector('[data-lexical-text="true"]')!.firstChild as Text;
    const domSelection = window.getSelection()!;
    domSelection.removeAllRanges();
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    domSelection.addRange(range);
    expect(domSelection.toString()).toBe('Hello');
  });
});
