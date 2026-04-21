/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  AutoFocusExtension,
  buildEditorFromExtensions,
} from '@lexical/extension';
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
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

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
    // Reproduces the Firefox Focus tab bug. When editor.focus() runs
    // while activeEditor === editor (the inline updateEditorSync path),
    // its $onUpdate callback is added to _deferred without creating a
    // new pending state or microtask. The callback depends on the outer
    // update's microtask to flush it. If that microtask finds
    // _pendingEditorState === null (consumed by a synchronous commit),
    // the fix ensures it still flushes _deferred.
    //
    // We reproduce this by calling setRootElement inside editor.update()
    // so that the AutoFocusExtension root listener fires with
    // activeEditor === editor, triggering the inline path.

    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [PlainTextExtension, AutoFocusExtension],
        name: '[test]',
      }),
    );

    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    container.appendChild(rootElement);

    // Flush InitialStateExtension's microtask before setRootElement.
    await Promise.resolve();

    // Call setRootElement inside editor.update() so that when the
    // root listener fires and calls editor.focus(), activeEditor ===
    // editor. This makes editor.focus() → updateEditorSync take the
    // inline path: $onUpdate pushes to _deferred, but NO $beginUpdate,
    // NO pending state, NO microtask. The callback is orphaned.
    editor.update(() => {
      editor.setRootElement(rootElement);
    });

    // _deferred has the stuck focus callback.
    expect(editor._deferred.length).toBeGreaterThan(0);

    // After microtasks flush, _deferred must be empty. Without the
    // fix, the orphaned microtask finds null and returns early.
    await Promise.resolve();
    expect(editor._deferred).toHaveLength(0);
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
