/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {InitialEditorStateType} from '@lexical/react/LexicalComposer';
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
  createEditor,
  UNDO_COMMAND,
} from 'lexical';
import * as React from 'react';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import * as Y from 'yjs';

/**
 * A minimal in-memory {@link Provider} that reports a completed sync, which is
 * what drives the `shouldBootstrap` code path. By default `connect()` syncs
 * immediately; with `autoSync: false` the caller decides when, via `emitSync`,
 * so a test can settle the mount first and control what commits next.
 */
function createSyncedProvider({autoSync = true} = {}): Provider & {
  emitSync: () => void;
} {
  const listeners = new Map<string, Set<(arg: never) => void>>();
  const emitSync = () => {
    const syncListeners = listeners.get('sync');
    if (syncListeners !== undefined) {
      for (const cb of Array.from(syncListeners)) {
        (cb as (isSynced: boolean) => void)(true);
      }
    }
  };

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
      if (autoSync) {
        emitSync();
      }
    },
    disconnect: () => {},
    emitSync,
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
  } as Provider & {emitSync: () => void};
}

/** The content every bootstrap test starts the shared document with. */
function $appendInitialContent(): void {
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode('Initial content'));
  $getRoot().append(paragraph);
}

/**
 * The same content as a serialized editor state. `initialEditorState` accepts
 * this form too, and it reaches the editor through `editor.setEditorState`
 * rather than a plain `editor.update`, so it commits on a different schedule
 * and is worth covering separately.
 */
function serializedInitialContent(): string {
  const editor = createEditor({
    namespace: 'serializer',
    onError(error: Error) {
      throw error;
    },
  });
  editor.update($appendInitialContent, {discrete: true});
  return JSON.stringify(editor.getEditorState());
}

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

  /**
   * Render a collaborative editor against an empty shared document, so the
   * `shouldBootstrap` path writes `initialEditorState` into it.
   */
  async function renderBootstrapped(
    initialEditorState: InitialEditorStateType,
    {
      autoSync = true,
      onError,
    }: {autoSync?: boolean; onError?: (error: Error) => void} = {},
  ): Promise<{
    editor: LexicalEditor;
    readText: () => string;
    sync: () => Promise<void>;
  }> {
    const doc = new Y.Doc();
    const provider = createSyncedProvider({autoSync});
    let editor: LexicalEditor | null = null;

    function CaptureEditor() {
      [editor] = useLexicalComposerContext();
      return null;
    }

    function App() {
      return (
        <LexicalCollaboration>
          <LexicalComposer
            initialConfig={
              onError === undefined ? editorConfig : {...editorConfig, onError}
            }>
            <CaptureEditor />
            <CollaborationPlugin
              id="main"
              providerFactory={(id, yjsDocMap) => {
                yjsDocMap.set(id, doc);
                return provider;
              }}
              shouldBootstrap={true}
              initialEditorState={initialEditorState}
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
    return {
      editor: activeEditor,
      readText: () =>
        activeEditor.getEditorState().read(() => $getRoot().getTextContent()),
      sync: async () => {
        await act(async () => {
          provider.emitSync();
        });
      },
    };
  }

  // https://github.com/facebook/lexical/issues/7110
  test(`the bootstrapped initialEditorState can not be undone`, async () => {
    const {editor, readText} = await renderBootstrapped($appendInitialContent);
    expect(readText()).toBe('Initial content');

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readText()).toBe('Initial content');
  });

  // The `setEditorState` form commits from inside the bootstrap update instead
  // of from the microtask that follows it, so it exercises a different point in
  // the flag's lifetime than the callback form above.
  test(`a bootstrapped serialized initialEditorState can not be undone`, async () => {
    const {editor, readText} = await renderBootstrapped(
      serializedInitialContent(),
    );
    expect(readText()).toBe('Initial content');

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });

    expect(readText()).toBe('Initial content');
  });

  // Undo is suppressed by a flag that is only meant to cover the bootstrap
  // write. A regression that left it set would silently disable undo for the
  // rest of the session, which the assertions above would not catch.
  test(`an edit made after bootstrapping is still undoable`, async () => {
    const {editor, readText} = await renderBootstrapped($appendInitialContent);
    expect(readText()).toBe('Initial content');

    await act(async () => {
      editor.update(() => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(' and more'));
        $getRoot().append(paragraph);
      });
    });
    expect(readText()).toBe('Initial content\n\n and more');

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(readText()).toBe('Initial content');
  });

  // A bootstrap update that throws still has to release the flag that keeps the
  // bootstrap write out of the undo stack. Lexical reports the error, commits
  // (so the update listeners — and the Yjs write — still run) and skips that
  // commit's deferred callbacks, so a reset that only rides on `onUpdate` is
  // left queued and does not land until the tail of the *next* commit, by which
  // point that commit's listener has already written to Yjs with the flag set.
  // Syncing on demand rather than from `connect()` keeps the user's edit the
  // first commit after the failure, which is what makes that visible.
  test(`an edit after a failed bootstrap is still undoable`, async () => {
    const errors: Error[] = [];
    const {editor, readText, sync} = await renderBootstrapped(
      () => {
        throw new Error('bootstrap failed');
      },
      {autoSync: false, onError: error => errors.push(error)},
    );

    await sync();
    expect(errors.map(error => error.message)).toEqual(['bootstrap failed']);

    await act(async () => {
      editor.update(() => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('typed after the failure'));
        $getRoot().append(paragraph);
      });
    });
    expect(readText()).toBe('typed after the failure');

    await act(async () => {
      editor.dispatchCommand(UNDO_COMMAND, undefined);
    });
    expect(readText()).not.toBe('typed after the failure');
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
