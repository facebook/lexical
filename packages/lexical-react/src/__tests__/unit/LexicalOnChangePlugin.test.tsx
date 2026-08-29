/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeNode,
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from '@lexical/code';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from 'lexical';
import {act, useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

describe('LexicalOnChangePlugin', () => {
  let container: HTMLDivElement;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    reactRoot = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      reactRoot.unmount();
    });
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should ignore updates when AST tree content remains unchanged', async () => {
    const onChange = vi.fn();
    let editorInstance: LexicalEditor | null = null;

    function EditorRefPlugin() {
      const [editor] = useLexicalComposerContext();
      editorInstance = editor;
      return null;
    }

    function $prepopulatedState() {
      const root = $getRoot();
      if (root.getFirstChild() === null) {
        const codeNode = $createCodeNode('javascript');
        codeNode.append($createTextNode('const x = 1;'));
        root.append(codeNode);
      }
    }

    function CodeHighlightPlugin() {
      const [editor] = useLexicalComposerContext();

      useEffect(() => {
        return registerCodeHighlighting(editor);
      }, [editor]);

      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: $prepopulatedState,
            namespace: 'test-on-change',
            nodes: [CodeNode, CodeHighlightNode],
            onError: err => {
              throw err;
            },
            theme: {},
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <AutoFocusPlugin />
          <OnChangePlugin ignoreSelectionChange={true} onChange={onChange} />
          <EditorRefPlugin />
          <CodeHighlightPlugin />
        </LexicalComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    onChange.mockReset();

    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      if (editorInstance) {
        (editorInstance as LexicalEditor).update(() => {
          const root = $getRoot();
          const paragraph = $createParagraphNode();
          const textNode = $createTextNode('Actual Tree Change');
          paragraph.append(textNode);
          root.append(paragraph);
        });
      }
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
