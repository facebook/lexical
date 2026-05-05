/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  LexicalEditor,
} from 'lexical';
import * as React from 'react';
import {useEffect} from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

function SimulateFocusUpdatePlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = root.getFirstChild();
      if ($isParagraphNode(paragraph)) {
        const textNode = paragraph.getFirstChild();
        if ($isTextNode(textNode)) {
          textNode.toggleFormat('bold');
        }
      }
    });
  }, [editor]);
  return null;
}

describe('OnChangePlugin tests', () => {
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

  it('does not call onChange during the initial editor state change on mount', async () => {
    const onChange = vi.fn();

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: ed => {
              ed.update(() => {
                const p = $createParagraphNode();
                p.append($createTextNode('hello world'));
                $getRoot().append(p);
              });
            },
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
          }}>
          <SimulateFocusUpdatePlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange when editor content is modified after mount', async () => {
    const onChange = vi.fn();
    let editor: LexicalEditor;

    function GrabEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: ed => {
              ed.update(() => {
                const p = $createParagraphNode();
                p.append($createTextNode('hello world'));
                $getRoot().append(p);
              });
            },
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
          }}>
          <GrabEditor />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });

    expect(onChange).not.toHaveBeenCalled();

    await ReactTestUtils.act(async () => {
      editor!.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if ($isParagraphNode(paragraph)) {
          const textNode = paragraph.getFirstChild();
          if ($isTextNode(textNode)) {
            textNode.toggleFormat('bold');
          }
        }
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('calls onChange when editor returns to the initial state after a real change (HistoryPlugin undo scenario)', async () => {
    const onChange = vi.fn();
    let capturedEditor: LexicalEditor;

    function GrabEditor() {
      [capturedEditor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: ed => {
              ed.update(() => {
                const p = $createParagraphNode();
                p.append($createTextNode('hello world'));
                $getRoot().append(p);
              });
            },
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
          }}>
          <GrabEditor />
          <SimulateFocusUpdatePlugin />
          <OnChangePlugin onChange={onChange} />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });

    // Capture the initial state AFTER mount (after SimulateFocusUpdatePlugin ran)
    const initialEditorState = capturedEditor!.getEditorState();
    expect(onChange).not.toHaveBeenCalled();

    // Make a real user change so hasSeenFirstChangeRef flips to true
    await ReactTestUtils.act(async () => {
      capturedEditor!.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if ($isParagraphNode(paragraph)) {
          const textNode = paragraph.getFirstChild();
          if ($isTextNode(textNode)) {
            textNode.toggleFormat('bold');
          }
        }
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);

    // Simulate HistoryPlugin restoring to the initial state
    // (e.g., undo all the way back to the state at mount time)
    await ReactTestUtils.act(async () => {
      capturedEditor!.setEditorState(initialEditorState);
    });

    expect(onChange).toHaveBeenCalledTimes(2);

    // Simulate a user action from the restored initial state.
    // Without the hasSeenFirstChangeRef guard, this would be incorrectly suppressed
    // because prevEditorState === initialPrevEditorStateRef.current.
    await ReactTestUtils.act(async () => {
      capturedEditor!.update(() => {
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if ($isParagraphNode(paragraph)) {
          const textNode = paragraph.getFirstChild();
          if ($isTextNode(textNode)) {
            textNode.toggleFormat('italic');
          }
        }
      });
    });

    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
