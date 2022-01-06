/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import * as React from 'react';
import {useEffect, useMemo, useState} from 'react';
import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';

import {useCollaborationContext} from '../context/CollaborationContext';
import useLexicalEditor from 'lexical-react/useLexicalEditor';
import useLexicalRichTextWithCollab from 'lexical-react/useLexicalRichTextWithCollab';
import useLexicalDecorators from 'lexical-react/useLexicalDecorators';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';

// $FlowFixMe: need Flow typings for y-websocket
import {WebsocketProvider} from 'y-websocket';
// $FlowFixMe: need Flow typings for yjs
import {Doc} from 'yjs';
import {useRef} from 'react';

const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);
const WEBSOCKET_ENDPOINT = 'ws://localhost:1234';
const WEBSOCKET_SLUG = 'playground';
const WEBSOCKET_ID = params.get('collabId') || '0';

const EditorPriority: CommandListenerEditorPriority = 0;

function onError(e: Error): void {
  throw e;
}

const isRightFrame =
  window.parent != null && window.parent.frames.right === window;

export default function RichTextCollabPlugin({
  id,
  placeholder = 'Enter some collaborative rich text...',
}: {
  id: string,
  placeholder?: string,
}): React$Node {
  const {yjsDocMap, name, color} = useCollaborationContext();
  const [editor] = useLexicalComposerContext();
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);
  const hasInitRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const provider = useMemo(() => {
    let doc = yjsDocMap.get(id);
    if (doc === undefined) {
      doc = new Doc();
      yjsDocMap.set(id, doc);
    } else {
      doc.load();
    }
    const provider = new WebsocketProvider(
      WEBSOCKET_ENDPOINT,
      WEBSOCKET_SLUG + '/' + WEBSOCKET_ID + '/' + id,
      doc,
      {
        connect: false,
      },
    );
    return provider;
  }, [id, yjsDocMap]);

  const cursors = useLexicalRichTextWithCollab(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    isRightFrame,
  );
  const decorators = useLexicalDecorators(editor);

  useEffect(() => {
    return editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'readOnly') {
          const readOnly = payload;
          setIsReadyOnly(readOnly);
        } else if (type === 'connected') {
          const isConnected = payload;
          setConnected(isConnected);
        }
        return false;
      },
      EditorPriority,
    );
  }, [editor]);

  if (connected && !hasInitRef.current) {
    hasInitRef.current = true;
  }

  return (
    <>
      <ContentEditable
        isReadOnly={!hasInitRef.current || isReadOnly}
        rootElementRef={rootElementRef}
      />
      {!hasInitRef.current && <div className="connecting">Connecting...</div>}
      {showPlaceholder && hasInitRef.current && (
        <Placeholder>{placeholder}</Placeholder>
      )}
      {cursors}
      {decorators}
    </>
  );
}
