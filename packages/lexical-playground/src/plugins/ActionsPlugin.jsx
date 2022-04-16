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
import {$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {mergeRegister} from '@lexical/utils';
import {CONNECTED_COMMAND, TOGGLE_CONNECT_COMMAND} from '@lexical/yjs';
import {
  $getRoot,
  $isParagraphNode,
  CLEAR_EDITOR_COMMAND,
  READ_ONLY_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useState} from 'react';

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

  const convertFromMarkdown = useCallback(() => {
    editor.update(() => {
      const root = $getRoot();
      const children = root.getChildren();
      const count = children.length;
      let markdownString = '';

      for (let i = 0; i < count; i++) {
        const child = children[i];
        if ($isParagraphNode(child)) {
          if (markdownString.length) {
            markdownString += '\n';
          }
          const text = child.getTextContent();
          if (text.length) {
            markdownString += text;
          }
        }
      }
      $convertFromMarkdownString(
        markdownString,
        editor,
        $createHorizontalRuleNode,
      );
      root.selectEnd();
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
          }
          title="Mic"
          aria-label="Mic">
          <i className="mic" />
        </button>
      )}
      <button
        className="action-button import"
        onClick={() => importFile(editor)}
        title="Import"
        aria-label="Import">
        <i className="import" />
      </button>
      <button
        className="action-button export"
        onClick={() =>
          exportFile(editor, {
            fileName: `Playground ${new Date().toISOString()}`,
            source: 'Playground',
          })
        }
        title="Export"
        aria-label="Export">
        <i className="export" />
      </button>
      <button
        className="action-button clear"
        onClick={() => {
          editor.dispatchCommand(CLEAR_EDITOR_COMMAND);
          editor.focus();
        }}
        title="Clear"
        aria-label="Clear">
        <i className="clear" />
      </button>
      <button
        className="action-button lock"
        onClick={() => {
          editor.setReadOnly(!editor.isReadOnly());
        }}
        title={isReadOnly ? 'Unlock' : 'Lock'}
        aria-label={isReadOnly ? 'Unlock' : 'Lock'}>
        <i className={isReadOnly ? 'unlock' : 'lock'} />
      </button>
      <button
        className="action-button"
        onClick={convertFromMarkdown}
        title="Markdown"
        aria-label="Markdown">
        <i className="markdown" />
      </button>
      {isCollab && (
        <button
          className="action-button connect"
          onClick={() => {
            editor.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected);
          }}
          title={connected ? 'Disconnect' : 'Connect'}
          aria-label={connected ? 'Disconnect' : 'Connect'}>
          <i className={connected ? 'disconnect' : 'connect'} />
        </button>
      )}
    </div>
  );
}
