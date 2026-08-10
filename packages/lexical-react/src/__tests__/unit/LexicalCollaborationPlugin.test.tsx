/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Provider} from '@lexical/yjs';
import type {LexicalEditor} from 'lexical';

import {LexicalCollaboration} from '@lexical/react/LexicalCollaborationContext';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  UNDO_COMMAND,
} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import * as Y from 'yjs';

/**
 * A minimal in-memory {@link Provider} whose `connect()` immediately reports a
 * completed sync, which is what drives the `shouldBootstrap` code path.
 */
function createSyncedProvider(): Provider {
  const listeners = new Map<string, Set<(arg: never) => void>>();

  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {},
      on: () => {},
      setLocalState: () => {},
      setLocalStateField: () => {},
    },
    connect: () => {
      const syncListeners = listeners.get('sync');
      if (syncListeners !== undefined) {
        for (const cb of Array.from(syncListeners)) {
          (cb as (isSynced: boolean) => void)(true);
        }
      }
    },
    disconnect: () => {},
    off: (type: string, cb: (arg: never) => void) => {
      const set = listeners.get(type);
      if (set !== undefined) {
        set.delete(cb);
      }
    },
    on: (type: string, cb: (arg: never) => void) => {
      let set = listeners.get(type);
      if (set === undefined) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(cb);
    },
  } as Provider;
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

  // https://github.com/facebook/lexical/issues/7110
  test(`the bootstrapped initialEditorState can not be undone`, async () => {
    const doc = new Y.Doc();
    const provider = createSyncedProvider();
    let editor: LexicalEditor | null = null;

    function CaptureEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalCollaboration>
          <LexicalComposer initialConfig={editorConfig}>
            <CaptureEditor />
            <CollaborationPlugin
              id="main"
              providerFactory={(id, yjsDocMap) => {
                yjsDocMap.set(id, doc);
                return provider;
              }}
              shouldBootstrap={true}
              initialEditorState={() => {
                const root = $getRoot();
                const paragraph = $createParagraphNode();
                paragraph.append($createTextNode('Initial content'));
                root.append(paragraph);
              }}
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

    await act(async () => {
      reactRoot.render(<App />);
    });

    const activeEditor = editor!;
    const readText = () =>
      activeEditor.getEditorState().read(() => $getRoot().getTextContent());

    expect(readText()).toBe('Initial content');

    await act(async () => {
      activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readText()).toBe('Initial content');
  });
});
