/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import * as React from 'react';
import {useMemo} from 'react';
import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
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

export default function RichTextCollabPlugin(): React$Node {
  const [editor, contract] = useController(PlaygroundController);
  const [rootElementRef, showPlaceholder] = useOutlineEditor(editor, onError);
  const [doc, provider] = useMemo(() => {
    const doc = new Doc();
    const provider = new WebsocketProvider(
      WEBSOCKET_ENDPOINT,
      WEBSOCKET_SLUG,
      doc,
      {
        connect: false,
      },
    );
    return [doc, provider];
  }, []);
  const [cursors, clear] = useOutlineRichTextWithCollab(editor, doc, provider);
  const decorators = useOutlineDecorators(editor);
  const isReadOnly = useEditorListeners(contract, clear);

  return (
    <>
      <ContentEditable
        isReadOnly={isReadOnly}
        rootElementRef={rootElementRef}
      />
      {showPlaceholder && (
        <Placeholder>Enter some collaborative rich text...</Placeholder>
      )}
      {cursors}
      {decorators}
    </>
  );
}
