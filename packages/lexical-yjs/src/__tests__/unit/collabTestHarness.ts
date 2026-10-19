/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Headless N-client collab harness (v1 or v2 binding). Each client mirrors
// useYjsCollaboration(V2): local Lexical updates are written to its own Doc,
// and Doc changes from other origins are applied to its editor. Clients can be
// taken offline, in which case updates for them are queued until connect().

import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableExtension,
} from '@lexical/table';
import {
  type Binding,
  type BindingV2,
  createBinding,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjs,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexical,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {$getRoot, defineExtension, type LexicalEditor} from 'lexical';
import {onTestFinished} from 'vitest';
import {applyUpdate, Doc, encodeStateAsUpdate, mergeUpdates} from 'yjs';

const noop = () => {};

async function flush() {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

function makeProvider(): Provider {
  return {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: noop,
      on: noop,
      setLocalState: noop,
      setLocalStateField: noop,
    },
    connect: noop,
    disconnect: noop,
    off: noop,
    on: noop,
  } as unknown as Provider;
}

export interface HarnessClient {
  editor: LexicalEditor;
  doc: Doc;
  errors: string[];
  online: boolean;
  queue: Uint8Array[];
  update: (fn: () => void) => void;
  connect: () => void;
  disconnect: () => void;
  // Text content of each cell of the first table, row by row.
  cells: () => string[][];
  // Number of cells in each row of the first table.
  shape: () => number[];
}

export function createHarness(v2: boolean, count: number) {
  const clients: HarnessClient[] = [];
  const ORIGIN = Symbol('net');
  for (let i = 0; i < count; i++) {
    const errors: string[] = [];
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        dependencies: [
          configExtension(TableExtension, {hasHorizontalScroll: false}),
        ],
        name: `[collab-test-${i}]`,
        onError: (error: Error) => {
          errors.push(error.message);
        },
      }),
    );
    onTestFinished(() => editor.dispose());
    const doc = new Doc({gc: false});
    // Deterministic client ids, so concurrent inserts merge in a stable order.
    doc.clientID = i + 1;
    onTestFinished(() => doc.destroy());
    const provider = makeProvider();
    const docMap = new Map([['test', doc]]);
    const binding: Binding | BindingV2 = v2
      ? createBindingV2__EXPERIMENTAL(editor, 'test', doc, docMap)
      : createBinding(editor, provider, 'test', doc, docMap);
    const client: HarnessClient = {
      cells: () =>
        editor.read(() => {
          const table = $getRoot().getChildren().find($isTableNode);
          if (!table) {
            return [];
          }
          return table
            .getChildren()
            .filter($isTableRowNode)
            .map(r =>
              r
                .getChildren()
                .filter($isTableCellNode)
                .map(c => c.getTextContent()),
            );
        }),
      connect() {
        if (client.online) {
          return;
        }
        client.online = true;
        if (client.queue.length) {
          applyUpdate(doc, mergeUpdates(client.queue.splice(0)), ORIGIN);
        }
        const mine = encodeStateAsUpdate(doc);
        for (const other of clients) {
          if (other !== client) {
            if (other.online) {
              applyUpdate(other.doc, mine, ORIGIN);
            } else {
              other.queue.push(mine);
            }
          }
        }
      },
      disconnect() {
        client.online = false;
      },
      doc,
      editor,
      errors,
      online: true,
      queue: [],
      shape: () => client.cells().map(r => r.length),
      update(fn) {
        try {
          editor.update(fn, {discrete: true});
        } catch (e) {
          errors.push((e as Error).message);
        }
      },
    };
    // Broadcast local doc changes while online; connect() sends the full
    // state of a client that was offline.
    doc.on('update', (u: Uint8Array, origin: unknown) => {
      if (origin === ORIGIN || !client.online) {
        return;
      }
      for (const other of clients) {
        if (other !== client) {
          if (other.online) {
            applyUpdate(other.doc, u, ORIGIN);
          } else {
            other.queue.push(u);
          }
        }
      }
    });
    if (v2) {
      const b = binding as BindingV2;
      b.root.observeDeep((events, transaction) => {
        if (transaction.origin !== b) {
          try {
            syncYjsChangesToLexicalV2__EXPERIMENTAL(
              b,
              provider,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              events as any,
              transaction,
              false,
            );
          } catch (e) {
            errors.push((e as Error).message);
          }
        }
      });
      editor.registerUpdateListener(
        ({
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        }) => {
          syncLexicalUpdateToYjsV2__EXPERIMENTAL(
            b,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            dirtyLeaves,
            normalizedNodes,
            tags,
          );
        },
      );
    } else {
      const b = binding as Binding;
      b.root.getSharedType().observeDeep((events, transaction) => {
        if (transaction.origin !== b) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            syncYjsChangesToLexical(b, provider, events as any, false, noop);
          } catch (e) {
            errors.push((e as Error).message);
          }
        }
      });
      editor.registerUpdateListener(
        ({
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        }) => {
          syncLexicalUpdateToYjs(
            b,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            dirtyLeaves,
            normalizedNodes,
            tags,
          );
        },
      );
    }
    clients.push(client);
  }
  return {
    clients,
    offline() {
      clients.forEach(c => c.disconnect());
    },
    async sync() {
      // Two rounds so every client sees every other client's state. v1 applies
      // remote changes in a non-discrete update, so flush between rounds.
      clients.forEach(c => c.connect());
      await flush();
      clients.forEach(c => c.disconnect());
      clients.forEach(c => c.connect());
      await flush();
    },
  };
}
