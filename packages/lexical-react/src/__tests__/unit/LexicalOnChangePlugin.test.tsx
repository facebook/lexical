/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from '@lexical/code';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

function CodeHighlightPlugin(): null {
  const [editor] = useLexicalComposerContext();
  React.useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
}

describe('LexicalOnChangePlugin tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;

    vi.restoreAllMocks();
  });

  it('does NOT trigger onChange on initial load with AutoFocus and CodeHighlight, but triggers on user edit', async () => {
    const onChange = vi.fn();
    let capturedEditor: LexicalEditor | null = null;

    function CaptureEditor() {
      capturedEditor = useLexicalComposerContext()[0];
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            namespace: 'TestNamespace',
            nodes: [CodeNode, CodeHighlightNode],
            onError: err => {
              throw err;
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={null}
          />
          <AutoFocusPlugin />
          <CodeHighlightPlugin />
          <OnChangePlugin onChange={onChange} />
          <CaptureEditor />
        </LexicalComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    expect(onChange).toHaveBeenCalledTimes(0);

    await act(async () => {
      capturedEditor!.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('New user input'));
        root.append(paragraph);
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
