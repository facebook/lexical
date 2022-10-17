/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactTestUtils from 'react-dom/test-utils';

import {LexicalComposer} from '../../LexicalComposer';
import {HistoryPlugin} from '../../LexicalHistoryPlugin';
import {LexicalMultiEditorStore} from '../../LexicalMultiEditorStore';
import {useLexicalMultiEditorStore} from '../../LexicalMultiEditorStoreCtx';

describe('More LexicalNodeHelpers tests', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container !== null) {
      document.body.removeChild(container);
      container = null;
    }

    jest.restoreAllMocks();
  });

  it('LexicalMultiEditorStore stocks editors w/o history', async () => {
    const firstMultiEditorStoreKey = 'nowIKnowMyABCs';
    const secondMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    function FirstTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(firstMultiEditorStoreKey);

      // remember, the FirstTestPlugin runs before the second LexicalComposer, so there's
      // only one key on the chain right now. there'll be two after the second one runs...
      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(1);
      expect(multiEditorStore.getEditor(firstMultiEditorStoreKey)).toEqual(
        editor,
      );

      expect(
        multiEditorStore.getEditorHistory(firstMultiEditorStoreKey),
      ).toBeUndefined();

      return null;
    }

    function SecondTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(secondMultiEditorStoreKey);

      // and now there are two keys on the chain!
      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(2);
      expect(multiEditorStore.getEditor(secondMultiEditorStoreKey)).toEqual(
        editor,
      );

      expect(
        multiEditorStore.getEditorHistory(secondMultiEditorStoreKey),
      ).toBeUndefined();

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: firstMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <FirstTestPlugin />
          </LexicalComposer>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: secondMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <SecondTestPlugin />
          </LexicalComposer>
        </LexicalMultiEditorStore>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
  });

  it('LexicalMultiEditorStore stocks editors w/history', async () => {
    const firstMultiEditorStoreKey = 'nowIKnowMyABCs';
    const secondMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    function FirstTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(firstMultiEditorStoreKey);

      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(1);
      expect(multiEditorStore.getEditor(firstMultiEditorStoreKey)).toEqual(
        editor,
      );

      expect(
        multiEditorStore.getHistoryKeys(firstMultiEditorStoreKey),
      ).toHaveLength(1);
      expect(
        multiEditorStore.hasHistoryKey(
          firstMultiEditorStoreKey,
          editor.getKey(),
        ),
      ).toBeTruthy();
      expect(
        multiEditorStore.getEditorHistory(firstMultiEditorStoreKey),
      ).toBeDefined();

      return null;
    }

    function SecondTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(secondMultiEditorStoreKey);

      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(2);
      expect(multiEditorStore.getEditor(secondMultiEditorStoreKey)).toEqual(
        editor,
      );

      expect(
        multiEditorStore.getHistoryKeys(secondMultiEditorStoreKey),
      ).toHaveLength(1);
      expect(
        multiEditorStore.hasHistoryKey(
          secondMultiEditorStoreKey,
          editor.getKey(),
        ),
      ).toBeTruthy();
      expect(
        multiEditorStore.getEditorHistory(secondMultiEditorStoreKey),
      ).toBeDefined();

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: firstMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin />
            <FirstTestPlugin />
          </LexicalComposer>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: secondMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin />
            <SecondTestPlugin />
          </LexicalComposer>
        </LexicalMultiEditorStore>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
  });

  it('LexicalMultiEditorStore makes editors portable', async () => {
    const firstMultiEditorStoreKey = 'nowIKnowMyABCs';
    const secondMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    const aEditorRef = {current: null};
    const bEditorRef = {current: null};

    function FirstTestPlugin() {
      const [editor] = useLexicalComposerContext();
      aEditorRef.current = editor;
      return null;
    }

    function SecondTestPlugin() {
      const [editor] = useLexicalComposerContext();
      bEditorRef.current = editor;
      return null;
    }

    function TheOutsideUp() {
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(multiEditorStore.getEditor(firstMultiEditorStoreKey)).toBe(
        aEditorRef.current,
      );
      expect(multiEditorStore.getEditor(secondMultiEditorStoreKey)).toBe(
        bEditorRef.current,
      );

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: firstMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin />
            <FirstTestPlugin />
          </LexicalComposer>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: secondMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin />
            <SecondTestPlugin />
          </LexicalComposer>
          <TheOutsideUp />
        </LexicalMultiEditorStore>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
  });
});
