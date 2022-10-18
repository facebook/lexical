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
import {
  createEmptyHistoryState,
  HistoryPlugin,
} from '../../LexicalHistoryPlugin';
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
    const aMultiEditorStoreKey = 'nowIKnowMyABCs';
    const bMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    function FirstTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(aMultiEditorStoreKey);

      // remember, the FirstTestPlugin runs before the second LexicalComposer, so there's
      // only one key on the chain right now. there'll be two after the second one runs...
      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(1);
      expect(multiEditorStore.getEditor(aMultiEditorStoreKey)).toEqual(editor);

      expect(
        multiEditorStore.getEditorHistory(aMultiEditorStoreKey),
      ).toBeUndefined();

      return null;
    }

    function SecondTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(bMultiEditorStoreKey);

      // and now there are two keys on the chain!
      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(2);
      expect(multiEditorStore.getEditor(bMultiEditorStoreKey)).toEqual(editor);

      expect(
        multiEditorStore.getEditorHistory(bMultiEditorStoreKey),
      ).toBeUndefined();

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: aMultiEditorStoreKey,
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
              multiEditorStoreKey: bMultiEditorStoreKey,
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
    const aMultiEditorStoreKey = 'nowIKnowMyABCs';
    const bMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    function FirstTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(aMultiEditorStoreKey);

      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(1);
      expect(multiEditorStore.getEditor(aMultiEditorStoreKey)).toEqual(editor);

      expect(
        multiEditorStore.getHistoryKeys(aMultiEditorStoreKey),
      ).toHaveLength(1);
      expect(
        multiEditorStore.hasHistoryKey(aMultiEditorStoreKey, editor.getKey()),
      ).toBeTruthy();
      expect(
        multiEditorStore.getEditorHistory(aMultiEditorStoreKey),
      ).toBeDefined();

      return null;
    }

    function SecondTestPlugin() {
      const [editor, context] = useLexicalComposerContext();
      const multiEditorStore = useLexicalMultiEditorStore();

      expect(context.getMultiEditorStoreKey()).toBe(bMultiEditorStoreKey);

      expect(multiEditorStore.getEditorStoreKeychain()).toHaveLength(2);
      expect(multiEditorStore.getEditor(bMultiEditorStoreKey)).toEqual(editor);

      expect(
        multiEditorStore.getHistoryKeys(bMultiEditorStoreKey),
      ).toHaveLength(1);
      expect(
        multiEditorStore.hasHistoryKey(bMultiEditorStoreKey, editor.getKey()),
      ).toBeTruthy();
      expect(
        multiEditorStore.getEditorHistory(bMultiEditorStoreKey),
      ).toBeDefined();

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: aMultiEditorStoreKey,
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
              multiEditorStoreKey: bMultiEditorStoreKey,
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

  it('LexicalMultiEditorStore makes editors portable (w/history)', async () => {
    const aMultiEditorStoreKey = 'nowIKnowMyABCs';
    const bMultiEditorStoreKey = 'nextTimeWontYouSingWithMe';

    const aEditorRef = {current: null};
    const bEditorRef = {current: null};

    const aHistoryRef = {current: createEmptyHistoryState()};
    const bHistoryRef = {current: createEmptyHistoryState()};

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

      expect(multiEditorStore.getEditor(aMultiEditorStoreKey)).toBe(
        aEditorRef.current,
      );
      expect(multiEditorStore.getEditor(bMultiEditorStoreKey)).toBe(
        bEditorRef.current,
      );

      expect(multiEditorStore.getEditorHistory(aMultiEditorStoreKey)).toBe(
        aHistoryRef.current,
      );
      expect(multiEditorStore.getEditorHistory(bMultiEditorStoreKey)).toBe(
        bHistoryRef.current,
      );

      return null;
    }

    function App() {
      return (
        <LexicalMultiEditorStore>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: aMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin externalHistoryState={aHistoryRef.current} />
            <FirstTestPlugin />
          </LexicalComposer>
          <LexicalComposer
            initialConfig={{
              multiEditorStoreKey: bMultiEditorStoreKey,
              namespace: '',
              nodes: [],
              onError: () => {
                throw Error();
              },
            }}>
            <HistoryPlugin externalHistoryState={bHistoryRef.current} />
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
