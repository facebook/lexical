/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createTableNodeWithDimensions, TableExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
  type LexicalEditorWithDispose,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so @lexical/table sees iOS.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  IS_IOS: true,
}));

/**
 * A long press drag across table cells on iOS keeps moving the native caret
 * while the table selection keeps clearing it. The caret is hidden for as
 * long as a finger is down on a cell.
 */
describe('iOS table drag caret hiding', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditorWithDispose;

  beforeEach(() => {
    container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: '@lexical/table/IosTableDragCaretTest',
        theme: {tableScrollableWrapper: ''},
      }),
    );
    editor.setRootElement(container);
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('before')),
            $createTableNodeWithDimensions(1, 2, false),
          );
      },
      {discrete: true},
    );
  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(container);
  });

  function touch(target: EventTarget, type: string, remaining = 0): void {
    const event = new Event(type, {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'touches', {value: {length: remaining}});
    target.dispatchEvent(event);
  }

  function cell(): HTMLElement {
    return container.querySelector('td p')!;
  }

  test('hides the caret while a finger is down on a cell', () => {
    touch(cell(), 'touchstart');
    expect(container.style.caretColor).toBe('transparent');
    touch(cell(), 'touchend');
    expect(container.style.caretColor).toBe('');
  });

  test('restores the caret when the touch is cancelled or lifted outside', () => {
    touch(cell(), 'touchstart');
    touch(window, 'touchcancel');
    expect(container.style.caretColor).toBe('');
  });

  test('keeps hiding until the last finger lifts', () => {
    touch(cell(), 'touchstart');
    touch(cell(), 'touchend', 1);
    expect(container.style.caretColor).toBe('transparent');
    touch(cell(), 'touchend', 0);
    expect(container.style.caretColor).toBe('');
  });

  test('restores a caret-color that was already set', () => {
    container.style.caretColor = 'red';
    touch(cell(), 'touchstart');
    expect(container.style.caretColor).toBe('transparent');
    touch(cell(), 'touchend');
    expect(container.style.caretColor).toBe('red');
  });

  test('leaves the caret alone for touches outside the table and when read-only', () => {
    touch(container.querySelector('p')!, 'touchstart');
    expect(container.style.caretColor).toBe('');
    touch(window, 'touchend');
    editor.setEditable(false);
    touch(cell(), 'touchstart');
    expect(container.style.caretColor).toBe('');
  });
});
