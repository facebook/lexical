/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {CommandListenerEditorPriority} from 'lexical';

import {exportFile, importFile} from '@lexical/file';
import {$convertFromMarkdownString} from '@lexical/markdown';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND} from '@lexical/yjs';
import {$getRoot, CLEAR_EDITOR_COMMAND, READ_ONLY_COMMAND} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';

import {$createStickyNode} from '../nodes/StickyNode';
import {
  SPEECT_TO_TEXT_COMMAND,
  SUPPORT_SPEECH_RECOGNITION,
} from './SpeechToTextPlugin';

const EditorPriority: CommandListenerEditorPriority = 0;

export default function ActionsPlugins({
  isRichText,
}: {
  isRichText: boolean,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [isReadOnly, setIsReadyOnly] = useState(() => editor.isReadOnly());
  const [isSpeechToText, setIsSpeechToText] = useState(false);
  const [connected, setConnected] = useState(false);
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        READ_ONLY_COMMAND,
        (payload) => {
          const readOnly = payload;
          setIsReadyOnly(readOnly);
          return false;
        },
        EditorPriority,
      ),
      editor.registerCommand(
        CONNECTED_COMMAND,
        (payload) => {
          const isConnected = payload;
          setConnected(isConnected);
          return false;
        },
        EditorPriority,
      ),
    );
  }, [editor]);

  const insertSticky = useCallback(() => {
    editor.update(() => {
      const root = $getRoot();
      const stickyNode = $createStickyNode(0, 0);
      root.append(stickyNode);
    });
  }, [editor]);

  const convertFromMarkdown = useCallback(() => {
    editor.update(() => {
      $convertFromMarkdownString('', editor, null);
      $getRoot().selectEnd();
    });
  }, [editor]);

  return (
    <div className="actions">
      {SUPPORT_SPEECH_RECOGNITION && (
        <button
          onClick={() => {
            editor.dispatchCommand(SPEECT_TO_TEXT_COMMAND, !isSpeechToText);
            setIsSpeechToText(!isSpeechToText);
          }}
          className={
            'action-button action-button-mic ' +
            (isSpeechToText ? 'active' : '')
          }>
          <i className="mic" />
        </button>
      )}
      <button
        className="action-button import"
        onClick={() => importFile(editor)}>
        <i className="import" />
      </button>
      <button
        className="action-button export"
        onClick={() =>
          exportFile(editor, {
            fileName: `Playground ${new Date().toISOString()}`,
            source: 'Playground',
          })
        }>
        <i className="export" />
      </button>
      <button className="action-button sticky" onClick={insertSticky}>
        <i className="sticky" />
      </button>
      <button
        className="action-button clear"
        onClick={() => {
          editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
          editor.focus();
        }}>
        <i className="clear" />
      </button>
      <button
        className="action-button lock"
        onClick={() => {
          editor.setReadOnly(!editor.isReadOnly());
        }}>
        <i className={isReadOnly ? 'unlock' : 'lock'} />
      </button>
      <button className="action-button" onClick={convertFromMarkdown}>
        <i className="markdown" />
      </button>
      {isCollab && (
        <button
          className="action-button connect"
          onClick={() => {
            editor.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected);
          }}>
          <i className={connected ? 'disconnect' : 'connect'} />
        </button>
      )}
    </div>
  );
}
