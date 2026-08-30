/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Provider} from '@lexical/yjs';

import {LexicalCollaboration} from '@lexical/react/LexicalCollaborationContext';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import * as Y from 'yjs';

type TestProvider = Provider & {
  _connectCount: number;
  _disconnectCount: number;
};

/** A minimal in-memory {@link Provider} that records connect/disconnect calls. */
function createTestProvider(): TestProvider {
  const provider: TestProvider = {
    _connectCount: 0,
    _disconnectCount: 0,
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {},
      on: () => {},
      setLocalState: () => {},
      setLocalStateField: () => {},
    },
    connect: () => {
      provider._connectCount++;
    },
    disconnect: () => {
      provider._disconnectCount++;
    },
    off: () => {},
    on: () => {},
  };

  return provider;
}

describe(`LexicalCollaborationPlugin`, () => {
  let container: HTMLDivElement;
  let reactRoot: Root;

  const editorConfig = Object.freeze({
    // NOTE: This is critical for collaboration plugin to set editor state to null. It
    // would indicate that the editor should not try to set any default state
    // (not even empty one), and let collaboration plugin do it instead
    editorState: null,
    namespace: 'Test editor',
    nodes: [],
    // Handling of errors during update
    onError(error: Error) {
      throw error;
    },
  });

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  test(`providerFactory called only once`, () => {
    const providerFactory = vi.fn(
      (id: string, yjsDocMap: Map<string, Y.Doc>) => {
        const doc = new Y.Doc();
        yjsDocMap.set(id, doc);

        return {
          awareness: {
            getLocalState: () => null,
            getStates: () => new Map(),
            off: () => {},
            on: () => {},
            setLocalState: () => {},
            setLocalStateField: () => {},
          },
          connect: () => {},
          disconnect: () => {},
          off: () => {},
          on: () => {},
        };
      },
    );
    function MemoComponent() {
      return (
        <LexicalCollaboration>
          <LexicalComposer initialConfig={editorConfig}>
            {/* With CollaborationPlugin - we MUST NOT use @lexical/react/LexicalHistoryPlugin */}
            <CollaborationPlugin
              id="lexical/react-rich-collab"
              providerFactory={providerFactory}
              // Unless you have a way to avoid race condition between 2+ users trying to do bootstrap simultaneously
              // you should never try to bootstrap on client. It's better to perform bootstrap within Yjs server.
              shouldBootstrap={false}
            />
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-input" />}
              placeholder={
                <div className="editor-placeholder">
                  Enter some rich text...
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </LexicalComposer>
        </LexicalCollaboration>
      );
    }
    act(() => {
      reactRoot.render(
        <React.StrictMode>
          <MemoComponent />
        </React.StrictMode>,
      );
    });

    expect(providerFactory).toHaveBeenCalledTimes(1);
  });

  // https://github.com/facebook/lexical/issues/7136
  test(`provider is replaced when providerFactory changes`, () => {
    const doc = new Y.Doc();
    const providerA = createTestProvider();
    const providerB = createTestProvider();

    const factoryA = vi.fn((id: string, yjsDocMap: Map<string, Y.Doc>) => {
      yjsDocMap.set(id, doc);
      return providerA;
    });
    const factoryB = vi.fn((id: string, yjsDocMap: Map<string, Y.Doc>) => {
      yjsDocMap.set(id, doc);
      return providerB;
    });

    function App({
      providerFactory,
    }: {
      providerFactory: (id: string, yjsDocMap: Map<string, Y.Doc>) => Provider;
    }) {
      return (
        <LexicalCollaboration>
          <LexicalComposer initialConfig={editorConfig}>
            <CollaborationPlugin
              id="main"
              providerFactory={providerFactory}
              shouldBootstrap={false}
            />
            <RichTextPlugin
              contentEditable={<ContentEditable />}
              placeholder={<></>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </LexicalComposer>
        </LexicalCollaboration>
      );
    }

    act(() => {
      reactRoot.render(<App providerFactory={factoryA} />);
    });

    expect(factoryA).toHaveBeenCalledTimes(1);
    expect(providerA._connectCount).toBe(1);

    act(() => {
      reactRoot.render(<App providerFactory={factoryB} />);
    });

    expect(factoryB).toHaveBeenCalledTimes(1);
    expect(providerB._connectCount).toBe(1);
    // The superseded provider is torn down.
    expect(providerA._disconnectCount).toBeGreaterThan(0);
  });
});
