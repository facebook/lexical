/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'outline';

import * as React from 'react';
import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {useCollaborationContext} from '../context/CollaborationContext';
import {useEffect, useState} from 'react';
import useOutlineNestedList from 'outline-react/useOutlineNestedList';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function ActionsPlugins({
  isRichText,
}: {
  isRichText: boolean,
}): React$Node {
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const [connected, setConnected] = useState(false);
  const [editor] = useOutlineComposerContext();
  useOutlineNestedList(editor);
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;

  useEffect(() => {
    const removeCommandListener = editor.addListener(
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

    return () => {
      removeCommandListener();
    };
  }, [editor]);

  return (
    <div className="actions">
      <button
        className="action-button clear"
        onClick={() => {
          editor.execCommand('clear');
          editor.focus();
        }}>
        <i className="clear" />
      </button>
      <button
        className="action-button lock"
        onClick={() => {
          editor.execCommand('readOnly', !isReadOnly);
        }}>
        <i className={isReadOnly ? 'unlock' : 'lock'} />
      </button>
      {isCollab && (
        <button
          className="action-button connect"
          onClick={() => {
            editor.execCommand('toggleConnect', !connected);
          }}>
          <i className={connected ? 'disconnect' : 'connect'} />
        </button>
      )}
    </div>
  );
}
