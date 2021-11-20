/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import {useMemo} from 'react';
import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import {useCollaborationContext} from '../context/CollaborationContext';
import useOutlineEditor from 'outline-react/useOutlineEditor';
import useOutlineRichTextWithCollab from 'outline-react/useOutlineRichTextWithCollab';
import useOutlineDecorators from 'outline-react/useOutlineDecorators';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';
import useEditorListeners from '../hooks/useEditorListeners';

// $FlowFixMe: need Flow typings for y-websocket
import {WebsocketProvider} from 'y-websocket';
// $FlowFixMe: need Flow typings for yjs
import {Doc} from 'yjs';

const WEBSOCKET_ENDPOINT = 'ws://localhost:1234';
const WEBSOCKET_SLUG = 'playground';

function onError(e: Error): void {
  throw e;
}

export default function RichTextCollabPlugin({
  id,
  placeholder = 'Enter some collaborative rich text...',
}: {
  id: string,
  placeholder?: string,
}): React$Node {
  const {yjsDocMap, name, color} = useCollaborationContext();
  const [editor, state] = useEditorContext(PlaygroundEditorContext);
  const [rootElementRef, showPlaceholder] = useOutlineEditor(editor, onError);
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
      WEBSOCKET_SLUG + '/' + id,
      doc,
      {
        connect: false,
      },
    );
    return provider;
  }, [id, yjsDocMap]);

  const [cursors, clear] = useOutlineRichTextWithCollab(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
  );
  const decorators = useOutlineDecorators(editor);
  const isReadOnly = useEditorListeners(state, clear);

  return (
    <>
      <ContentEditable
        isReadOnly={isReadOnly}
        rootElementRef={rootElementRef}
      />
      {showPlaceholder && <Placeholder>{placeholder}</Placeholder>}
      {cursors}
      {decorators}
    </>
  );
}
