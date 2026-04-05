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
  $isEditorState,
  createEditor,
  LexicalEditor,
  SerializedEditorState,
} from 'lexical';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
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
            onError: (err) => {
              throw err;
            },
            theme,
          }}>
          <TestPlugin />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
  });

  describe('editorState initialization', () => {
    function makeTestComposer(
      editorState: Parameters<
        typeof LexicalComposer
      >[0]['initialConfig']['editorState'],
      onReady: (editor: LexicalEditor) => void,
    ) {
      function TestPlugin() {
        const [editor] = useLexicalComposerContext();
        onReady(editor);
        return null;
      }
      return (
        <LexicalComposer
          initialConfig={{
            editorState,
            namespace: '',
            nodes: [],
            onError: (err) => {
              throw err;
            },
          }}>
          <TestPlugin />
        </LexicalComposer>
      );
    }

    it('accepts a SerializedEditorState object', async () => {
      // Derive the serialized state from a real editor so we never hardcode
      // the internal shape — if the format ever changes, this test will still
      // produce a valid payload.
      const source = createEditor({
        namespace: '',
        nodes: [],
        onError: (err) => {
          throw err;
        },
      });
      source.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('hello serialized'));
          $getRoot().append(paragraph);
        },
        {discrete: true},
      );
      const serialized: SerializedEditorState = source
        .getEditorState()
        .toJSON();

      let capturedEditor: LexicalEditor | null = null;

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          makeTestComposer(serialized, (e) => {
            capturedEditor = e;
          }),
        );
      });

      expect(
        capturedEditor!
          .getEditorState()
          .read(() => $getRoot().getTextContent()),
      ).toBe('hello serialized');
    });

    it('accepts an EditorState instance', async () => {
      // Build an EditorState using a temporary editor, then hand the live
      // instance directly to LexicalComposer (the instanceof path).
      const source = createEditor({
        namespace: '',
        nodes: [],
        onError: (err) => {
          throw err;
        },
      });
      source.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('hello editor state'));
          $getRoot().append(paragraph);
        },
        {discrete: true},
      );
      const editorStateInstance = source.getEditorState();
      expect($isEditorState(editorStateInstance)).toBe(true);

      let capturedEditor: LexicalEditor | null = null;

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          makeTestComposer(editorStateInstance, (e) => {
            capturedEditor = e;
          }),
        );
      });

      expect(
        capturedEditor!
          .getEditorState()
          .read(() => $getRoot().getTextContent()),
      ).toBe('hello editor state');
    });

    it('accepts a JSON string', async () => {
      const source = createEditor({
        namespace: '',
        nodes: [],
        onError: (err) => {
          throw err;
        },
      });
      source.update(
        () => {
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode('hello json string'));
          $getRoot().append(paragraph);
        },
        {discrete: true},
      );
      const jsonString = JSON.stringify(source.getEditorState().toJSON());

      let capturedEditor: LexicalEditor | null = null;

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          makeTestComposer(jsonString, (e) => {
            capturedEditor = e;
          }),
        );
      });

      expect(
        capturedEditor!
          .getEditorState()
          .read(() => $getRoot().getTextContent()),
      ).toBe('hello json string');
    });

    it('starts with empty state when editorState is null', async () => {
      let capturedEditor: LexicalEditor | null = null;

      await ReactTestUtils.act(async () => {
        reactRoot.render(
          makeTestComposer(null, (e) => {
            capturedEditor = e;
          }),
        );
      });

      expect(
        capturedEditor!
          .getEditorState()
          .read(() => $getRoot().getTextContent()),
      ).toBe('');
    });
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
              onError: (err) => {
                throw err;
              },
            }}>
            <Plugin />
          </LexicalComposer>
        );
      }
      it(`renders ${size} editors under ${name}`, async () => {
        await ReactTestUtils.act(async () => {
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
            editor.getEditorState().read(() => $getRoot().getTextContent()),
          ]).toEqual([i, 'initial state']);
        });
        // Only one context is created in both cases though!
        expect(pluginEditors.size).toBe(1);
      });
    });
  });
});
