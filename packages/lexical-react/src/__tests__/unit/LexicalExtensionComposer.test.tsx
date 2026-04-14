/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {AutoFocusExtension} from '@lexical/extension';
import {PlainTextExtension} from '@lexical/plain-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
  type LexicalEditor,
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
  it('AutoFocusExtension with PlainTextExtension initializes without errors', async () => {
    // Smoke test for the initialization pattern that triggers the
    // Firefox Focus tab bug. AutoFocusExtension calls editor.focus()
    // from a root listener; PlainTextExtension matches the failing
    // e2e test configuration. Verifies no errors during init and that
    // a subsequent update after blur does not refocus the editor.
    const ext = defineExtension({
      dependencies: [PlainTextExtension, AutoFocusExtension],
      name: '[test]',
    });

    function TestEditor() {
      return <LexicalExtensionComposer extension={ext} />;
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<TestEditor />);
      await Promise.resolve();
    });

    const editorElement = container.querySelector(
      '[data-lexical-editor="true"]',
    ) as HTMLElement & {__lexicalEditor?: LexicalEditor | null};
    expect(editorElement).not.toBeNull();
    const editor = editorElement.__lexicalEditor!;

    // Blur the editor (user tabs away)
    editorElement.blur();

    // A subsequent no-op update must not refocus the editor
    await ReactTestUtils.act(async () => {
      editor.update(() => {});
      await Promise.resolve();
    });

    expect(editorElement).not.toBe(document.activeElement);
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
