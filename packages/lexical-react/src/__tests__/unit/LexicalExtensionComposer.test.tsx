/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {PlainTextExtension} from '@lexical/plain-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('LexicalExtensionComposer', () => {
  const extension = defineExtension({
    dependencies: [RichTextExtension],
    name: '[root]',
  });
  function MyEditor({children}: {children?: React.ReactNode}) {
    return (
      <LexicalExtensionComposer extension={extension}>
        {children}
      </LexicalExtensionComposer>
    );
  }
  let container: HTMLElement;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    ReactTestUtils.act(() => {
      reactRoot = createRoot(container);
    });
    document.body.appendChild(container);
  });
  afterEach(() => {
    ReactTestUtils.act(() => {
      reactRoot.unmount();
    });
    document.body.removeChild(container);
    // container = null;
  });
  it('Renders', () => {
    ReactTestUtils.act(() => {
      reactRoot.render(<MyEditor />);
    });
    expect(container.innerHTML).toEqual(
      `<div contenteditable="true" role="textbox" spellcheck="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><br></p></div>`,
    );
  });
  it('$commitPendingUpdates flushes deferred callbacks even with no pending state', async () => {
    // Reproduces the Firefox Focus tab bug. During editor init in
    // Firefox, a selectionchange event causes a race between microtask
    // scheduling and synchronous commits that leaves the focus $onUpdate
    // callback orphaned in _deferred. When the orphaned microtask calls
    // $commitPendingUpdates and finds _pendingEditorState === null, the
    // fix ensures it still flushes _deferred rather than returning early.
    //
    // The exact Firefox race cannot be triggered in jsdom (jsdom doesn't
    // fire selectionchange during DOM manipulation), so we create the
    // race directly: editor.update() schedules a microtask to commit,
    // then we synchronously commit via setRootElement (consuming the
    // pending state), then we push a focus-like callback to _deferred,
    // and let the orphaned microtask fire.
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [PlainTextExtension],
        name: '[test]',
      }),
    );

    // InitialStateExtension's afterRegistration already called
    // editor.update(), which scheduled microtask A.

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    container.appendChild(rootElement);

    // setRootElement synchronously commits, consuming microtask A's
    // pending state. Microtask A is still in the queue.
    editor.setRootElement(rootElement);

    // Simulate the end state of the Firefox race: editor.focus()'s
    // $onUpdate callback is in _deferred, but _pendingEditorState was
    // already consumed by a synchronous selectionchange commit. The
    // orphaned microtask A will call $commitPendingUpdates and find
    // _pendingEditorState === null.
    //
    // This uses _deferred directly because the Firefox race cannot be
    // triggered in jsdom: the only way to add to _deferred without also
    // creating a pending state is through $beginUpdate's inline path
    // (activeEditor === editor), which requires an active selectionchange
    // during setRootElement that jsdom doesn't fire.
    const focusCallback = vi.fn(() => {
      rootElement.focus();
    });
    editor._deferred.push(focusCallback);

    // Let microtask A fire. Without the fix, it finds null and
    // returns early — the callback stays stuck in _deferred.
    await Promise.resolve();

    // The fix ensures the orphaned microtask flushes _deferred
    expect(focusCallback).toHaveBeenCalledTimes(1);

    // Verify no leakage: blur and do another update
    focusCallback.mockClear();
    rootElement.blur();
    await editor.update(() => {});
    expect(focusCallback).toHaveBeenCalledTimes(0);
  });

  it('Provides a context', async () => {
    function InitialPlugin() {
      const [editor] = useLexicalComposerContext();
      useEffect(() => {
        editor.update(() => {
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createTextNode('Initial text')),
            );
        });
      }, [editor]);
      return null;
    }
    await ReactTestUtils.act(async () => {
      reactRoot.render(
        <MyEditor>
          <InitialPlugin />
        </MyEditor>,
      );
      await Promise.resolve().then();
    });
    expect(container.innerHTML).toEqual(
      `<div contenteditable="true" role="textbox" spellcheck="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="auto"><span data-lexical-text="true">Initial text</span></p></div>`,
    );
  });
});
