/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalEditor} from 'lexical';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {LexicalComposer} from '../../LexicalComposer';

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

    jest.restoreAllMocks();
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
            onError: () => {
              throw Error();
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

  describe('LexicalComposerContext editor identity', () => {
    (
      [
        {name: 'StrictMode', size: 2},
        {name: 'Fragment', size: 1},
      ] as const
    ).forEach(({name, size}) => {
      const Wrapper = React[name];
      const editors = new Set<LexicalEditor>();
      function App() {
        return (
          <LexicalComposer
            initialConfig={{
              editorState(editor) {
                editors.add(editor);
              },
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}
          />
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
        expect(editors.size).toBe(size);
      });
    });
  });
});
