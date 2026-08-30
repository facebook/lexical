/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
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

describe('LexicalComposer tests', () => {
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

  it('LexicalComposerContext', async () => {
    const theme = {};

    function TestPlugin() {
      const [, contextTheme] = useLexicalComposerContext();
      expect(contextTheme.getTheme()).toBe(theme);
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
            theme,
          }}>
          <TestPlugin />
        </LexicalComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });
  });

  it('forwards initialConfig.onWarn to the editor as a (error, editor) handler', async () => {
    const onWarn = vi.fn();
    let capturedEditor: LexicalEditor | null = null;

    function CaptureEditor() {
      capturedEditor = useLexicalComposerContext()[0];
      return null;
    }

    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            namespace: '',
            nodes: [],
            onError: err => {
              throw err;
            },
            onWarn,
          }}>
          <CaptureEditor />
        </LexicalComposer>
      );
    }

    await act(async () => {
      reactRoot.render(<App />);
    });

    expect(capturedEditor).not.toBeNull();
    // The composer must forward onWarn into the core editor; without the
    // passthrough, `_onWarn` falls back to the default and the embedder's
    // handler never fires.
    const error = new Error('test warning');
    capturedEditor!._onWarn(error);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onWarn).toHaveBeenCalledWith(error, capturedEditor);
  });

  describe('LexicalComposerContext editor identity', () => {
    (
      [
        {name: 'StrictMode', size: 2},
        {name: 'Fragment', size: 1},
      ] as const
    ).forEach(({name, size}) => {
      const Wrapper = React[name];
      const editors = new Set<LexicalEditor>();
      const pluginEditors = new Set<LexicalEditor>();
      function Plugin() {
        pluginEditors.add(useLexicalComposerContext()[0]);
        return null;
      }
      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              editorState(editor) {
                editors.add(editor);
                editor.update(() => {
                  const p = $createParagraphNode();
                  p.append($createTextNode('initial state'));
                  $getRoot().append(p);
                });
              },
              namespace: '',
              nodes: [],
              onError: err => {
                throw err;
              },
            }}>
            <Plugin />
          </LexicalComposer>
        );
      }
      it(`renders ${size} editors under ${name}`, async () => {
        await act(async () => {
          reactRoot.render(
            <Wrapper>
              <App />
            </Wrapper>,
          );
        });
        // 2 editors may be created since useMemo is still called twice,
        // but only one result is used!
        expect(editors.size).toBe(size);
        [...editors].forEach((editor, i) => {
          // This confirms that editorState() was only called once per editor,
          // otherwise you could see 'initial stateinitial state'.
          expect([
            i,
            editor.read('latest', () => $getRoot().getTextContent()),
          ]).toEqual([i, 'initial state']);
        });
        // Only one context is created in both cases though!
        expect(pluginEditors.size).toBe(1);
      });
    });
  });
});
