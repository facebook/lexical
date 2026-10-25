/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Collab Y: `@lexical/y` (Yjs 14, `@y/y`) over `@y/websocket`.
//
// This module is only loaded (as its own chunk) when the playground runs with
// `?isCollab=true&useCollabY=true`, so the default playground never pulls in
// a second Yjs. Run its server with `pnpm run collab:y` (port 1235).
//
// What this mode leaves out, compared with collab v1:
// - remote cursors and selections (the binding does not use awareness);
// - comments (CommentPlugin keeps its threads in a Yjs 13 document; Editor.tsx
//   turns it off, as in collab v2). MarkNodes in the document still sync;
// - nested editors (image captions, sticky notes): `@lexical/y` syncs a
//   snapshot of them when their node is written, not their edits, so they
//   are read only here (see hooks/useCollabYNestedEditor.ts);
// - version history (VersionsPlugin is collab v2 only).
// Playground nodes without collab declarations fall back to the binding's
// nested storage (a shared node per Lexical node, its JSON fields as
// attributes), which syncs them.

import {
  AutoFocusExtension,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {ReactProviderExtension} from '@lexical/react/ReactProviderExtension';
import {useSignalValue} from '@lexical/react/useExtensionSignalValue';
import {YCollabExtension} from '@lexical/y';
import {CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND} from '@lexical/yjs';
import {WebsocketProvider} from '@y/websocket';
import {Doc} from '@y/y';
import {
  type AnyLexicalExtensionArgument,
  COMMAND_PRIORITY_LOW,
  configExtension,
  defineExtension,
  type LexicalEditorWithDispose,
  LexicalWarning,
} from 'lexical';
import {type JSX, useEffect, useRef} from 'react';

const params = new URLSearchParams(window.location.search);
const WEBSOCKET_ENDPOINT =
  params.get('collabEndpoint') || 'ws://localhost:1235';
const WEBSOCKET_SLUG = 'playground-y';
const WEBSOCKET_ID = params.get('collabId') || '0';

export interface CollabYSession {
  doc: Doc;
  editor: LexicalEditorWithDispose;
  provider: WebsocketProvider;
}

let session: CollabYSession | null = null;

/**
 * The page's collab Y editor, built once.
 *
 * The editor is built here rather than by `LexicalExtensionComposer`: building
 * an editor registers its extensions, and React (Strict Mode) builds a memoized
 * editor twice and drops one. A dropped editor would keep a second binding on
 * the shared document. The collab settings only change with a page reload, so
 * one editor per page is enough.
 */
export function getCollabYSession(
  id: string,
  buildApp: () => AnyLexicalExtensionArgument,
): CollabYSession {
  if (session === null) {
    const doc = new Doc();
    const provider = new WebsocketProvider(
      WEBSOCKET_ENDPOINT,
      WEBSOCKET_SLUG + '/' + WEBSOCKET_ID + '/' + id,
      doc,
      {
        connect: false,
        // Every update goes through the server, also between the two frames
        // of the split view, so that "Disconnect" takes a frame offline.
        disableBc: true,
      },
    );
    const editor = buildEditorFromExtensions(
      defineExtension({
        // What LexicalExtensionComposer adds around its extension.
        dependencies: [
          ReactProviderExtension,
          configExtension(ReactExtension, {contentEditable: null}),
          buildApp(),
          // The binding's self-check (off by default) reads its writes
          // back in development builds: a mismatch is a warning, which the
          // collab Y e2e specs fail on.
          configExtension(YCollabExtension, {
            doc,
            selfCheck: import.meta.env?.DEV === true,
          }),
        ],
        name: '@lexical/playground/collab-y',
        // The binding's warnings (a document opened read only, a
        // self-check mismatch) are logged rather than thrown, as Lexical's
        // default onWarn does in development.
        onWarn: error => {
          console.warn(
            error instanceof LexicalWarning
              ? `${error.message} (${error.code})`
              : error,
          );
        },
      }),
    );
    session = {doc, editor, provider};
  }
  return session;
}

/**
 * Connects the provider, initializes the binding after the first sync, wires
 * the toolbar's connect button, and shows the binding's read-only state.
 */
export function CollabYPlugin({
  provider,
}: {
  provider: WebsocketProvider;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const {binding, status} = getExtensionDependencyFromEditor(
    editor,
    YCollabExtension,
  ).output;
  const statusValue = useSignalValue(status);

  useEffect(() => {
    const onSync = (isSynced: boolean) => {
      if (isSynced) {
        // A no-op after the first time.
        binding.initialize();
      }
    };
    const onStatus = ({status: value}: {status: string}) => {
      editor.dispatchCommand(CONNECTED_COMMAND, value === 'connected');
    };
    provider.on('sync', onSync);
    provider.on('status', onStatus);
    const unregister = editor.registerCommand(
      TOGGLE_CONNECT_COMMAND,
      shouldConnect => {
        if (shouldConnect) {
          provider.connect();
        } else {
          provider.disconnect();
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    // Connect in a task so that React Strict Mode's mount, unmount and mount
    // in development opens one socket instead of closing a connecting one.
    const connect = setTimeout(() => provider.connect());
    return () => {
      clearTimeout(connect);
      unregister();
      provider.off('sync', onSync);
      provider.off('status', onStatus);
      provider.disconnect();
    };
  }, [binding, editor, provider]);

  // The binding keeps the editor non-editable until it has read the
  // document, and while it is read only (a layout it cannot write). Anything
  // that turns the editor editable then (the toolbar's read-only toggle,
  // which ActionsPlugin also disables) would let the user type into an
  // editor whose edits the binding does not write: they would be replaced by
  // the first sync, or lost on reload. Keep it non-editable until then.
  useEffect(
    () =>
      editor.registerEditableListener(editable => {
        if (editable && binding.status !== 'active') {
          editor.setEditable(false);
        }
      }),
    [binding, editor],
  );

  // The editor is read only until the binding has read the document, so
  // AutoFocusExtension's focus on load does nothing: focus it once it is
  // editable instead.
  const didAutoFocus = useRef(false);
  useEffect(() => {
    if (statusValue !== 'active' || didAutoFocus.current) {
      return;
    }
    didAutoFocus.current = true;
    const autoFocus = getExtensionDependencyFromEditor(
      editor,
      AutoFocusExtension,
    ).output;
    if (!autoFocus.disabled.peek()) {
      editor.focus(undefined, {
        defaultSelection: autoFocus.defaultSelection.peek(),
      });
    }
  }, [editor, statusValue]);

  if (statusValue !== 'readonly') {
    return null;
  }
  return (
    <div className="collab-y-notice" role="status">
      This document uses a collaboration layout this version of the playground
      cannot edit. It is read only.
    </div>
  );
}
