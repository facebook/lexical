/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineExtension} from '@lexical/extension';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {act, type ReactElement} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, test} from 'vitest';

function $prepopulate(): void {
  $getRoot().append(
    $createParagraphNode().append($createTextNode('Composed in the browser')),
  );
}

// Module-scoped so the extension argument is stable across renders, as the
// LexicalExtensionComposer contract requires.
const extension = defineExtension({
  $initialEditorState: $prepopulate,
  dependencies: [RichTextExtension],
  name: '[root]',
});

// Mounts `ui` into a fresh container and returns a Disposable, so callers use
// `using view = renderReact(...)` and React unmounts at the end of the block
// instead of in an afterEach. document.body is reset between tests, so the
// container itself needs no explicit removal.
function renderReact(ui: ReactElement): Disposable & {container: HTMLElement} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    [Symbol.dispose]() {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('LexicalExtensionComposer (browser)', () => {
  test('renders a real contentEditable with the initial editor state', () => {
    using view = renderReact(
      <LexicalExtensionComposer extension={extension} />,
    );
    const contentEditable = view.container.querySelector(
      '[contenteditable="true"]',
    ) as HTMLElement | null;
    expect(contentEditable).not.toBeNull();
    expect(contentEditable!.textContent).toBe('Composed in the browser');
    // Real layout: jsdom would report a zero-height box here.
    expect(contentEditable!.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
